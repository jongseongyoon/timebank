'use server'

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireTomatoOperator } from '@/lib/tomato/access'

export type ImportRow = {
  rowIndex: number // 엑셀 행 번호(헤더=1, 데이터 2부터)
  memberNo?: string
  name?: string
  phone?: string
  address?: string
  birthDate?: string
  memo?: string
}

export type ImportError = { rowIndex: number; name: string; reason: string }

export type ImportResult = {
  newCount: number
  updateCount: number
  errorCount: number
  errors: ImportError[]
}

function clean(s?: string) {
  return (s ?? '').toString().trim()
}

// 회원번호 기준 upsert. 신규는 createMany 한 번으로 일괄 처리(대량 등록 대비).
export async function importMembers(rows: ImportRow[]): Promise<ImportResult> {
  await requireTomatoOperator()

  const errors: ImportError[] = []
  const seenNo = new Set<string>()
  const prepared: {
    rowIndex: number
    memberNo: string | null
    name: string
    phone: string | null
    address: string | null
    birthDate: string | null
    memo: string | null
  }[] = []

  for (const r of rows) {
    const name = clean(r.name)
    const memberNo = clean(r.memberNo)
    if (!name) {
      errors.push({ rowIndex: r.rowIndex, name: '', reason: '이름 누락' })
      continue
    }
    if (memberNo && seenNo.has(memberNo)) {
      errors.push({ rowIndex: r.rowIndex, name, reason: `파일 내 중복 회원번호(${memberNo})` })
      continue
    }
    if (memberNo) seenNo.add(memberNo)
    prepared.push({
      rowIndex: r.rowIndex,
      memberNo: memberNo || null,
      name,
      phone: clean(r.phone) || null,
      address: clean(r.address) || null,
      birthDate: clean(r.birthDate) || null,
      memo: clean(r.memo) || null,
    })
  }

  // 기존 회원번호 조회 → 신규/갱신 분리
  const memberNos = prepared.map((p) => p.memberNo).filter((n): n is string => !!n)
  const existing = memberNos.length
    ? await prisma.tomatoMember.findMany({
        where: { memberNo: { in: memberNos } },
        select: { id: true, memberNo: true },
      })
    : []
  const existMap = new Map(existing.map((e) => [e.memberNo as string, e.id]))

  const toCreate = prepared.filter((p) => !(p.memberNo && existMap.has(p.memberNo)))
  const toUpdate = prepared.filter((p) => p.memberNo && existMap.has(p.memberNo))

  let newCount = 0
  let updateCount = 0

  if (toCreate.length) {
    const data = toCreate.map((p) => ({
      memberNo: p.memberNo,
      name: p.name,
      phone: p.phone,
      address: p.address,
      birthDate: p.birthDate,
      memo: p.memo,
      qrToken: crypto.randomBytes(12).toString('hex'),
    }))
    const res = await prisma.tomatoMember.createMany({ data, skipDuplicates: true })
    newCount = res.count
  }

  for (const u of toUpdate) {
    try {
      await prisma.tomatoMember.update({
        where: { id: existMap.get(u.memberNo as string) },
        data: {
          name: u.name,
          phone: u.phone,
          address: u.address,
          birthDate: u.birthDate,
          memo: u.memo,
        },
      })
      updateCount++
    } catch {
      errors.push({ rowIndex: u.rowIndex, name: u.name, reason: '갱신 실패' })
    }
  }

  return { newCount, updateCount, errorCount: errors.length, errors }
}
