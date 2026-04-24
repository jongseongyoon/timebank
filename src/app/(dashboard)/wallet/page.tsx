'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatTC, formatDate, maskName } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, AlertCircle, QrCode } from 'lucide-react'
import Link from 'next/link'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts'

const TX_STATUS_VARIANT: Record<string, any> = {
  PENDING: 'warning', APPROVED: 'success', CANCELLED: 'outline',
  DISPUTED: 'destructive', RESOLVED: 'default',
}
const TX_STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기', APPROVED: '완료', CANCELLED: '취소', DISPUTED: '분쟁', RESOLVED: '해결',
}
const PIE_COLORS = ['#3b82f6', '#ef4444']

export default function WalletPage() {
  const [member, setMember] = useState<any>(null)
  const [txs, setTxs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/members/me').then((r) => r.json()),
      fetch('/api/transactions?limit=50').then((r) => r.json()),
    ]).then(([m, t]) => {
      setMember(m.member)
      setTxs(t.transactions ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">불러오는 중…</div>
  if (!member) return null

  const balance = Number(member.tcBalance)
  const earned = Number(member.lifetimeEarned)
  const spent = Number(member.lifetimeSpent)

  const pieData = [
    { name: '총 적립', value: earned },
    { name: '총 소진', value: spent },
  ]

  // 최근 6개월 월별 집계
  const monthlyMap: Record<string, { earned: number; spent: number }> = {}
  txs.filter((t) => t.status === 'APPROVED').forEach((t) => {
    const key = new Date(t.createdAt).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit' })
    if (!monthlyMap[key]) monthlyMap[key] = { earned: 0, spent: 0 }
    const isProvider = t.provider?.id === member.id
    if (isProvider) monthlyMap[key].earned += Number(t.tcAmount)
    else monthlyMap[key].spent += Number(t.tcAmount)
  })
  const barData = Object.entries(monthlyMap).slice(-6).map(([month, v]) => ({ month, ...v }))

  const daysLeft = member.tcExpiresAt
    ? Math.ceil((new Date(member.tcExpiresAt).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">TC 지갑</h1>
        <Link
          href="/wallet/qr"
          className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <QrCode className="h-4 w-4" />
          내 QR
        </Link>
      </div>

      {/* 만료 경고 */}
      {daysLeft !== null && daysLeft <= 30 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          TC 만료까지 <strong>{daysLeft}일</strong> 남았습니다. ({formatDate(member.tcExpiresAt)})
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">잔액 현황</TabsTrigger>
          <TabsTrigger value="history">거래 내역</TabsTrigger>
        </TabsList>

        {/* 잔액 현황 탭 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">현재 잔액</p>
                    <p className="text-3xl font-bold text-blue-600">{balance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">TC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">누적 적립</p>
                    <p className="text-3xl font-bold text-green-600">{earned.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">TC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">누적 소진</p>
                    <p className="text-3xl font-bold text-red-500">{spent.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">TC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">적립/소진 비율</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value.toFixed(1)}`}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)} TC`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">월별 TC 흐름</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)} TC`} />
                    <Bar dataKey="earned" name="적립" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" name="소진" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 거래 내역 탭 */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-4 divide-y">
              {txs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">거래 내역이 없습니다.</p>
              )}
              {txs.map((tx) => {
                const isProvider = tx.provider?.id === member.id
                const counterpart = isProvider ? tx.receiver?.name : tx.provider?.name
                const tcChange = isProvider ? `+${Number(tx.tcAmount).toFixed(2)}` : `-${Number(tx.tcAmount).toFixed(2)}`

                return (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isProvider ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isProvider
                          ? <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
                          : <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {counterpart ? maskName(counterpart) : '시스템'}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-sm font-bold ${isProvider ? 'text-green-600' : 'text-red-600'}`}>
                        {tcChange} TC
                      </span>
                      <Badge variant={TX_STATUS_VARIANT[tx.status]}>
                        {TX_STATUS_LABEL[tx.status]}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
