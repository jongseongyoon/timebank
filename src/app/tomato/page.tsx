import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users, Tags, Upload, ShoppingCart, BellRing, ScanLine, CheckCircle2, Clock,
} from 'lucide-react'

// 개발 로드맵 — Phase 단위로 진행. 완료 화면만 링크 활성화.
const roadmap = [
  {
    phase: 0,
    title: '셋업 · 기본 레이아웃',
    desc: '관리 영역 진입, 직원 로그인(ADMIN), 사이드바·대시보드',
    icon: CheckCircle2,
    done: true,
  },
  {
    phase: 1,
    title: '데이터 모델 · 제품 카테고리',
    desc: 'DB 테이블(회원·구매·포인트·카테고리) 생성, 카테고리 CRUD + 초기값(전동스쿠터6·전동휠체어6·수동휠체어5)',
    icon: Tags,
    done: true,
  },
  {
    phase: 2,
    title: '엑셀 일괄등록 · 회원 목록',
    desc: '.xlsx 업로드 → 컬럼 매핑 → 미리보기 → 회원번호 기준 upsert, 회원 검색',
    icon: Upload,
    done: true,
  },
  {
    phase: 3,
    title: '구매 등록 · 관리기한',
    desc: '구매액 2% 자동 적립(반올림), 관리기한 자동계산, 임박(60일)/초과 알림 대시보드',
    icon: ShoppingCart,
    done: true,
  },
  {
    phase: 4,
    title: '포인트 원장',
    desc: '회원 상세: 구매내역·포인트 원장 조회, 포인트 사용(AS/물품), 수동 조정',
    icon: Users,
    done: true,
  },
  {
    phase: 5,
    title: 'QR 회원 인식',
    desc: '회원 QR 발급 + 매장 브라우저 카메라 스캔 → 적립/사용 연결',
    icon: ScanLine,
    done: false,
  },
]

export default function TomatoDashboard() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">토마토의료기 회원·포인트 관리</h1>
        <p className="text-muted-foreground mt-1">
          회원 일괄등록 · 제품 관리기한 알림 · 구매 2% 포인트 적립/사용(QR)
        </p>
      </div>

      <Card className="border-red-100 bg-red-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-red-600" aria-hidden="true" />
            Phase 4 완료 — 포인트 원장 (회원 상세)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <b>회원 관리</b>에서 이름을 클릭하면 회원 상세로 들어가 구매내역·포인트 원장을 보고, 포인트
          <b> 사용</b>(AS비용/물품구입)과 <b>수동 조정</b>을 할 수 있습니다. 다음 단계(Phase 5: QR 발급·스캔)는 확인 후 진행합니다.
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">개발 로드맵</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {roadmap.map(({ phase, title, desc, icon: Icon, done }) => (
            <Card key={phase} className={done ? 'border-red-200' : ''}>
              <CardContent className="flex gap-3 pt-5">
                <div
                  className={
                    'rounded-full p-2 h-9 w-9 flex items-center justify-center shrink-0 ' +
                    (done ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400')
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400">Phase {phase}</span>
                    {done ? (
                      <span className="text-[10px] font-semibold text-red-700 bg-red-100 rounded px-1.5 py-0.5">
                        완료
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                        <Clock className="h-3 w-3" aria-hidden="true" /> 예정
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm mt-0.5">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
