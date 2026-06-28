export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Search } from 'lucide-react'

const PAGE_SIZE = 100

export default async function TomatoMembersPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = (searchParams.q ?? '').trim()
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { memberNo: { contains: q, mode: 'insensitive' as const } },
          { phone: { contains: q } },
        ],
      }
    : {}

  const [total, members] = await Promise.all([
    prisma.tomatoMember.count({ where }),
    prisma.tomatoMember.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
    }),
  ])

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">회원 관리</h1>
          <p className="text-muted-foreground mt-1 text-sm">이름·회원번호·전화로 검색합니다.</p>
        </div>
        <Link href="/tomato/import">
          <Button variant="outline">
            <Upload className="h-4 w-4" /> 엑셀 일괄등록
          </Button>
        </Link>
      </div>

      <form method="get" className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="이름 / 회원번호 / 전화번호" className="max-w-xs" />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" /> 검색
        </Button>
      </form>

      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground mb-3">
            전체 {total.toLocaleString()}명
            {total > PAGE_SIZE && ` (최근 ${PAGE_SIZE}명 표시)`}
          </p>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {q ? '검색 결과가 없습니다.' : '아직 등록된 회원이 없습니다. 엑셀 일괄등록을 이용하세요.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="py-2 pr-3">이름</th>
                    <th className="py-2 pr-3">회원번호</th>
                    <th className="py-2 pr-3">전화번호</th>
                    <th className="py-2 pr-3 text-right">포인트</th>
                    <th className="py-2 pr-3">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-accent/50">
                      <td className="py-2 pr-3 font-medium">{m.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{m.memberNo || '-'}</td>
                      <td className="py-2 pr-3">{m.phone || '-'}</td>
                      <td className="py-2 pr-3 text-right font-semibold">
                        {m.pointsBalance.toLocaleString()}P
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground text-xs">
                        {m.createdAt.toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
