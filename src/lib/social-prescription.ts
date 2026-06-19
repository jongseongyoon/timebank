/**
 * 사회적처방 서비스 (4단계)
 *
 * 처방전 생성 → 코디네이터 승인 → TP 배분 → 갱신/취소
 *
 * TP 재원 우선순위:
 *   1순위: 사회적처방 기금 (SocialPrescriptionFund)
 *   2순위: 관리자 마이너스 발행 (AdminTpIssuance) — 기금 부족 시
 */

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { calculateTcExpiry } from '@/lib/tc-calculator'

const SP_FUND_ID = 'sp-fund-001'

// ── 처방전 번호 생성 ──────────────────────────────────────────────────────────
async function generatePrescriptionNo(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.socialPrescription.count({
    where: { prescriptionNo: { startsWith: `SP-${year}-` } },
  })
  return `SP-${year}-${String(count + 1).padStart(4, '0')}`
}

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

export interface CreatePrescriptionInput {
  receiverId:          string
  prescriberId:        string
  prescriberOrg:       string
  prescriberRole:      string
  careLevel:           number           // 1~5
  prescriptionReason:  string[]
  recommendedServices: string[]
  totalTpGranted:      number
  monthlyTpLimit:      number
  validFrom:           Date
  validUntil:          Date
  isRenewable?:        boolean
  note?:               string
}

export interface ApprovePrescriptionInput {
  prescriptionId: string
  coordinatorId:  string
  note?:          string
}

export interface RenewPrescriptionInput {
  prescriptionId: string
  coordinatorId:  string
  newValidUntil:  Date
  additionalTp?:  number
  note?:          string
}

export interface CancelPrescriptionInput {
  prescriptionId: string
  performedBy:    string
  reason:         string
}

// ── 처방 + 신규 회원 동시 발급 ─────────────────────────────────────────────────

export interface NewReceiverInput {
  name:          string
  phone:         string   // 010-0000-0000
  birthDate?:    string   // YYYYMMDD 8자리
  dong:          string
  address?:      string
  isVulnerable?: boolean
  isDisabled?:   boolean
}

export interface IssuePrescriptionInput extends Omit<CreatePrescriptionInput, 'receiverId'> {
  receiverId?:  string            // 기존 회원
  newReceiver?: NewReceiverInput  // 신규 회원 동시 등록
}

export interface IssueResult {
  prescription:  { id: string; prescriptionNo: string; status: string }
  createdMember?: { id: string; name: string; phone: string }
  tempPassword?:  string          // 신규 등록 시에만
}

/**
 * 처방전 발급 — 대상자가 기존 회원이면 receiverId, 신규면 newReceiver로 동시 등록.
 * 신규 회원 임시 비밀번호 = 생년월일 6자리(YYMMDD), 없으면 전화번호 뒤 8자리.
 * 회원 생성 + 처방전 생성을 단일 트랜잭션으로 처리해 원자성 보장.
 */
export async function issuePrescription(input: IssuePrescriptionInput): Promise<IssueResult> {
  if (!input.receiverId && !input.newReceiver) {
    throw new Error('대상자 정보가 없습니다. 기존 회원을 선택하거나 신규 회원을 입력하세요.')
  }

  return prisma.$transaction(async (trx) => {
    let receiverId = input.receiverId
    let createdMember: IssueResult['createdMember']
    let tempPassword: string | undefined

    // ── 신규 회원 등록 ──────────────────────────────────────────────────────
    if (!receiverId && input.newReceiver) {
      const nr = input.newReceiver

      const dup = await trx.member.findUnique({ where: { phone: nr.phone } })
      if (dup) throw new Error(`이미 등록된 전화번호입니다: ${nr.phone}`)

      // 임시 비밀번호: 생년월일 6자리(YYMMDD) 우선, 없으면 전화번호 숫자 뒤 8자리
      const phoneDigits = nr.phone.replace(/\D/g, '')
      tempPassword = nr.birthDate && /^\d{8}$/.test(nr.birthDate)
        ? nr.birthDate.slice(2, 8)
        : phoneDigits.slice(-8)

      const birthYear = nr.birthDate ? parseInt(nr.birthDate.slice(0, 4), 10) : 1970
      const isSenior  = new Date().getFullYear() - birthYear >= 65
      const tpExpiresAt = calculateTcExpiry({
        registrationDate: new Date(),
        isSenior,
        isDisabled:   nr.isDisabled ?? false,
        isVulnerable: nr.isVulnerable ?? false,
      })

      const id = crypto.randomUUID()
      const member = await trx.member.create({
        data: {
          id,
          phone:        nr.phone,
          passwordHash: await bcrypt.hash(tempPassword, 12),
          name:         nr.name,
          birthDate:    nr.birthDate,
          dong:         nr.dong,
          address:      nr.address,
          isVulnerable: nr.isVulnerable ?? false,
          isDisabled:   nr.isDisabled ?? false,
          roles:        ['RECEIVER'],
          careLevel:    input.careLevel,
          careLevelUpdatedAt: new Date(),
          tpExpiresAt,
          qrCode:       `timepay:member:${id}`,
          syncSource:   'PRESCRIPTION',
        },
        select: { id: true, name: true, phone: true },
      })
      receiverId   = member.id
      createdMember = member
    }

    // ── 처방전 생성 (PENDING) ───────────────────────────────────────────────
    const year  = new Date().getFullYear()
    const count = await trx.socialPrescription.count({
      where: { prescriptionNo: { startsWith: `SP-${year}-` } },
    })
    const prescriptionNo = `SP-${year}-${String(count + 1).padStart(4, '0')}`

    const prescription = await trx.socialPrescription.create({
      data: {
        prescriptionNo,
        receiverId:          receiverId!,
        prescriberId:        input.prescriberId,
        prescriberOrg:       input.prescriberOrg,
        prescriberRole:      input.prescriberRole,
        careLevel:           input.careLevel,
        prescriptionReason:  input.prescriptionReason,
        recommendedServices: input.recommendedServices,
        totalTpGranted:      input.totalTpGranted,
        monthlyTpLimit:      input.monthlyTpLimit,
        tpUsed:              0,
        validFrom:           input.validFrom,
        validUntil:          input.validUntil,
        isRenewable:         input.isRenewable ?? true,
        note:                input.note,
        status:              'PENDING',
      },
      select: { id: true, prescriptionNo: true, status: true },
    })

    return { prescription, createdMember, tempPassword }
  })
}

// ── 처방전 생성 ───────────────────────────────────────────────────────────────

export async function createPrescription(input: CreatePrescriptionInput) {
  const prescriptionNo = await generatePrescriptionNo()

  return prisma.socialPrescription.create({
    data: {
      prescriptionNo,
      receiverId:          input.receiverId,
      prescriberId:        input.prescriberId,
      prescriberOrg:       input.prescriberOrg,
      prescriberRole:      input.prescriberRole,
      careLevel:           input.careLevel,
      prescriptionReason:  input.prescriptionReason,
      recommendedServices: input.recommendedServices,
      totalTpGranted:      input.totalTpGranted,
      monthlyTpLimit:      input.monthlyTpLimit,
      tpUsed:              0,
      validFrom:           input.validFrom,
      validUntil:          input.validUntil,
      isRenewable:         input.isRenewable ?? true,
      note:                input.note,
      status:              'PENDING',
    },
  })
}

// ── 처방전 승인 (코디네이터) ──────────────────────────────────────────────────

export async function approvePrescription(input: ApprovePrescriptionInput) {
  const rx = await prisma.socialPrescription.findUnique({
    where: { id: input.prescriptionId },
  })
  if (!rx) throw new Error('처방전을 찾을 수 없습니다.')
  if (rx.status !== 'PENDING') throw new Error(`승인 불가 상태: ${rx.status}`)
  if (rx.coordinatorId === rx.receiverId || rx.coordinatorId === rx.prescriberId) {
    throw new Error('이해충돌: 코디네이터는 대상자 또는 처방자와 동일할 수 없습니다.')
  }

  const totalTp   = Number(rx.totalTpGranted)
  const spFund    = await prisma.socialPrescriptionFund.findUnique({ where: { id: SP_FUND_ID } })
  const fundBalance = spFund ? Number(spFund.tpBalance) : 0

  // 기금 vs 관리자 발행 분배
  const fromFund  = Math.min(totalTp, fundBalance)
  const fromAdmin = Math.round((totalTp - fromFund) * 100) / 100
  const fundSource = fromAdmin > 0 ? 'ADMIN' : 'SP_FUND'

  return prisma.$transaction(async (trx) => {
    // 1. 처방전 상태 → ACTIVE
    const updated = await trx.socialPrescription.update({
      where: { id: input.prescriptionId },
      data: {
        status:        'ACTIVE',
        coordinatorId: input.coordinatorId,
        approvedAt:    new Date(),
        fundSource,
        note:          input.note ?? rx.note,
      },
    })

    // 2. 사회적처방 기금 차감
    if (fromFund > 0) {
      const newBalance = Math.round((fundBalance - fromFund) * 100) / 100
      await trx.socialPrescriptionFund.update({
        where: { id: SP_FUND_ID },
        data: {
          tpBalance:          { decrement: fromFund },
          totalDistributed:   { increment: fromFund },
          distributedThisYear:{ increment: fromFund },
        },
      })
      await trx.socialPrescriptionFundTx.create({
        data: {
          fundId:         SP_FUND_ID,
          txType:         'PRESCRIPTION_AWARD',
          tpAmount:       fromFund,
          prescriptionId: input.prescriptionId,
          memberId:       rx.receiverId,
          description:    `사회적처방 승인 지급 (${rx.prescriptionNo})`,
          balanceAfter:   newBalance,
        },
      })
    }

    // 3. 관리자 마이너스 발행 (기금 부족분)
    if (fromAdmin > 0) {
      const config = await trx.adminIssuanceConfig.findUnique({
        where: { year: new Date().getFullYear() },
      })
      const issuedThisYear = config ? Number(config.issuedThisYear) : 0
      const cumulative     = issuedThisYear + fromAdmin

      await trx.adminTpIssuance.create({
        data: {
          issuanceType:    'SOCIAL_PRESCRIPTION',
          tpAmount:        fromAdmin,
          receiverId:      rx.receiverId,
          prescriptionId:  input.prescriptionId,
          cumulativeIssued: cumulative,
          adminBalance:    -cumulative,
          description:     `사회적처방 기금 부족 보충 (${rx.prescriptionNo})`,
        },
      })
      if (config) {
        await trx.adminIssuanceConfig.update({
          where: { year: new Date().getFullYear() },
          data: { issuedThisYear: { increment: fromAdmin } },
        })
      }
    }

    // 4. 대상자 TP 지급
    await trx.member.update({
      where: { id: rx.receiverId },
      data: {
        tpBalance:     { increment: totalTp },
        lifetimeEarned:{ increment: totalTp },
      },
    })

    // 5. 이력 기록
    await trx.prescriptionHistory.create({
      data: {
        prescriptionId: input.prescriptionId,
        action:         'APPROVED',
        newValue:       'ACTIVE',
        performedBy:    input.coordinatorId,
        reason:         `승인: ${totalTp} TP 지급 (기금 ${fromFund} + 관리자 ${fromAdmin})`,
      },
    })

    return updated
  })
}

// ── 처방전 갱신 ───────────────────────────────────────────────────────────────

export async function renewPrescription(input: RenewPrescriptionInput) {
  const rx = await prisma.socialPrescription.findUnique({
    where: { id: input.prescriptionId },
  })
  if (!rx) throw new Error('처방전을 찾을 수 없습니다.')
  if (rx.status !== 'ACTIVE' && rx.status !== 'EXPIRED') {
    throw new Error(`갱신 불가 상태: ${rx.status}`)
  }
  if (!rx.isRenewable) throw new Error('갱신 불가 처방전입니다.')

  const addTp = input.additionalTp ?? 0

  return prisma.$transaction(async (trx) => {
    const updated = await trx.socialPrescription.update({
      where: { id: input.prescriptionId },
      data: {
        status:     'ACTIVE',
        validUntil: input.newValidUntil,
        note:       input.note ?? rx.note,
        ...(addTp > 0 ? { totalTpGranted: { increment: addTp } } : {}),
      },
    })

    // 추가 TP 지급
    if (addTp > 0) {
      const spFund = await trx.socialPrescriptionFund.findUnique({ where: { id: SP_FUND_ID } })
      const fundBalance = spFund ? Number(spFund.tpBalance) : 0
      const fromFund = Math.min(addTp, fundBalance)
      const fromAdmin = Math.round((addTp - fromFund) * 100) / 100

      if (fromFund > 0) {
        const newBalance = Math.round((fundBalance - fromFund) * 100) / 100
        await trx.socialPrescriptionFund.update({
          where: { id: SP_FUND_ID },
          data: {
            tpBalance:          { decrement: fromFund },
            totalDistributed:   { increment: fromFund },
            distributedThisYear:{ increment: fromFund },
          },
        })
        await trx.socialPrescriptionFundTx.create({
          data: {
            fundId:         SP_FUND_ID,
            txType:         'RENEWAL',
            tpAmount:       fromFund,
            prescriptionId: input.prescriptionId,
            memberId:       rx.receiverId,
            description:    `사회적처방 갱신 추가 지급 (${rx.prescriptionNo})`,
            balanceAfter:   newBalance,
          },
        })
      }

      if (fromAdmin > 0) {
        const config = await trx.adminIssuanceConfig.findUnique({
          where: { year: new Date().getFullYear() },
        })
        const issuedThisYear = config ? Number(config.issuedThisYear) : 0
        const cumulative = issuedThisYear + fromAdmin
        await trx.adminTpIssuance.create({
          data: {
            issuanceType:    'SOCIAL_PRESCRIPTION',
            tpAmount:        fromAdmin,
            receiverId:      rx.receiverId,
            prescriptionId:  input.prescriptionId,
            cumulativeIssued: cumulative,
            adminBalance:    -cumulative,
            description:     `처방 갱신 기금 부족 보충 (${rx.prescriptionNo})`,
          },
        })
        if (config) {
          await trx.adminIssuanceConfig.update({
            where: { year: new Date().getFullYear() },
            data: { issuedThisYear: { increment: fromAdmin } },
          })
        }
      }

      await trx.member.update({
        where: { id: rx.receiverId },
        data: {
          tpBalance:     { increment: addTp },
          lifetimeEarned:{ increment: addTp },
        },
      })
    }

    await trx.prescriptionHistory.create({
      data: {
        prescriptionId: input.prescriptionId,
        action:         'RENEWED',
        previousValue:  rx.validUntil.toISOString(),
        newValue:       input.newValidUntil.toISOString(),
        performedBy:    input.coordinatorId,
        reason:         input.note ?? '갱신',
      },
    })

    return updated
  })
}

// ── 처방전 취소 ───────────────────────────────────────────────────────────────

export async function cancelPrescription(input: CancelPrescriptionInput) {
  const rx = await prisma.socialPrescription.findUnique({
    where: { id: input.prescriptionId },
  })
  if (!rx) throw new Error('처방전을 찾을 수 없습니다.')
  if (rx.status === 'CANCELLED') throw new Error('이미 취소된 처방전입니다.')

  return prisma.$transaction(async (trx) => {
    const updated = await trx.socialPrescription.update({
      where: { id: input.prescriptionId },
      data: { status: 'CANCELLED' },
    })

    await trx.prescriptionHistory.create({
      data: {
        prescriptionId: input.prescriptionId,
        action:         'CANCELLED',
        previousValue:  rx.status,
        newValue:       'CANCELLED',
        performedBy:    input.performedBy,
        reason:         input.reason,
      },
    })

    return updated
  })
}

// ── 기금 현황 조회 ────────────────────────────────────────────────────────────

export async function getSocialPrescriptionFundStatus() {
  const year = new Date().getFullYear()
  const [fund, config, activePrescriptions] = await Promise.all([
    prisma.socialPrescriptionFund.findUnique({ where: { id: SP_FUND_ID } }),
    prisma.adminIssuanceConfig.findUnique({ where: { year } }),
    prisma.socialPrescription.count({ where: { status: 'ACTIVE' } }),
  ])
  return { fund, adminConfig: config, activePrescriptions }
}
