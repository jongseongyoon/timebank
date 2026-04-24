'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlusCircle, Loader2, ClipboardList, Clock, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const CATEGORY_LABEL: Record<string, string> = {
  TRANSPORT: '🚗 이동지원', SHOPPING: '🛒 장보기', COMPANION: '💬 말벗',
  MEAL: '🍱 식사지원', HOUSEKEEPING: '🏠 가사지원', MEDICAL_ESCORT: '🏥 의료동행',
  EDUCATION: '📚 교육', DIGITAL_HELP: '📱 디지털지원', REPAIR: '🔧 수리',
  CHILDCARE: '👶 아이돌봄', LEGAL_CONSULT: '⚖️ 법률상담', HEALTH_CONSULT: '💊 건강상담',
  ADMINISTRATIVE: '📋 행정보조', COMMUNITY_EVENT: '🎉 공동체행사', OTHER: '✨ 기타',
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: '접수됨', MATCHED: '매칭됨', IN_PROGRESS: '진행중',
  COMPLETED: '완료', CANCELLED: '취소', ESCALATED: '에스컬레이션',
}

const STATUS_VARIANT: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  MATCHED: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  ESCALATED: 'bg-red-100 text-red-700',
}

const URGENCY_LABEL: Record<string, string> = {
  NORMAL: '일반', URGENT: '긴급', EMERGENCY: '응급',
}

const URGENCY_COLOR: Record<string, string> = {
  NORMAL: 'text-gray-500', URGENT: 'text-yellow-600 font-semibold', EMERGENCY: 'text-red-600 font-bold',
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/services/requests?mine=true')
      .then((r) => r.json())
      .then((data) => {
        setRequests(data.requests ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        불러오는 중…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 서비스 요청</h1>
          <p className="text-sm text-muted-foreground mt-1">내가 요청한 서비스 목록입니다</p>
        </div>
        <Button asChild size="sm">
          <Link href="/services/request">
            <PlusCircle className="h-4 w-4 mr-1" />
            새 요청
          </Link>
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">아직 요청한 서비스가 없습니다.</p>
            <Button asChild>
              <Link href="/services/request">서비스 요청하기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* 카테고리 + 긴급도 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {CATEGORY_LABEL[req.category] ?? req.category}
                      </span>
                      {req.urgency !== 'NORMAL' && (
                        <span className={`text-xs ${URGENCY_COLOR[req.urgency]}`}>
                          [{URGENCY_LABEL[req.urgency]}]
                        </span>
                      )}
                    </div>

                    {/* 요청 내용 */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {req.description}
                    </p>

                    {/* 일정·장소 */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(req.requestedDate).toLocaleString('ko-KR', {
                          month: 'numeric', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        ({req.durationMinutes}분)
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {req.dong}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      접수일: {formatDate(req.createdAt)}
                    </p>
                  </div>

                  {/* 상태 뱃지 */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_VARIANT[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[req.status] ?? req.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
