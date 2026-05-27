import Link from 'next/link'
import { Shield } from 'lucide-react'

export const metadata = {
  title: '개인정보 처리방침 — TimePay',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border p-8 space-y-8">

        {/* 헤더 */}
        <div className="flex items-start gap-3 border-b pb-6">
          <div className="bg-blue-100 rounded-full p-2 shrink-0">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">개인정보 처리방침</h1>
            <p className="text-sm text-muted-foreground mt-1">
              착한도시사회적협동조합 (TimePay 서비스)
            </p>
            <p className="text-xs text-gray-400 mt-0.5">최종 수정일: 2025년 1월 1일</p>
          </div>
        </div>

        <Section title="1. 수집하는 개인정보 항목">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <Th>구분</Th>
                <Th>항목</Th>
                <Th>필수 여부</Th>
              </tr>
            </thead>
            <tbody>
              <Tr items={['필수 항목', '이름, 전화번호, 생년월일, 거주 동(洞)', '필수']} />
              <Tr items={['선택 항목', '이메일 주소', '선택']} />
              <Tr items={['서비스 이용 중 자동 수집', 'TP 거래 내역, 만보기 걸음 수, 접속 일시', '자동']} />
              <Tr items={['건강 관련 정보', '돌봄 필요도(1~5단계), 서비스 이용 시 관찰 사항', '동의 시']} />
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">
            ⚠️ 주민등록번호·금융정보·상세 주소·질병명은 수집하지 않습니다.
          </p>
        </Section>

        <Section title="2. 개인정보 수집 및 이용 목적">
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>타임페이(TP) 서비스 제공 및 회원 관리</li>
            <li>서비스 제공자와 이용자 연결 (코디네이터를 통한 매칭)</li>
            <li>만보기 걸음수 기록 및 건강증진 기금 TP 지급</li>
            <li>돌봄 필요도 파악을 통한 맞춤형 서비스 제공</li>
            <li>서비스 이용 통계 및 품질 개선</li>
          </ul>
        </Section>

        <Section title="3. 개인정보 보유 및 이용 기간">
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              회원 탈퇴 후 <strong>1년</strong>간 보관 후 완전 삭제합니다.
            </p>
            <p>
              단, 법령에 의해 보존이 필요한 경우 해당 법령에서 정한 기간 동안 보관합니다.
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1 text-xs text-gray-500">
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
              <li>소비자 불만 또는 분쟁 처리에 관한 기록: 3년</li>
            </ul>
          </div>
        </Section>

        <Section title="4. 개인정보 제3자 제공">
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
              다만, 다음의 경우 예외적으로 제공합니다.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs">
              <p><strong>제공 받는 자:</strong> 해당 동(洞) 코디네이터</p>
              <p><strong>제공 항목:</strong> 이름, 전화번호, 거주 동, 서비스 요청 내용</p>
              <p><strong>제공 목적:</strong> 서비스 연결 및 돌봄 방문 조율</p>
              <p><strong>보유 기간:</strong> 서비스 완료 후 즉시 삭제</p>
            </div>
          </div>
        </Section>

        <Section title="5. 개인정보 처리 위탁">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <Th>위탁 업체</Th>
                <Th>위탁 업무</Th>
              </tr>
            </thead>
            <tbody>
              <Tr items={['Supabase (데이터베이스)', '회원정보 저장 및 관리']} />
              <Tr items={['Vercel (서버 호스팅)', '서비스 운영 서버 관리']} />
              <Tr items={['Google (구글 시트)', '코디네이터 대상자 명단 관리 (최소 정보만)']} />
            </tbody>
          </table>
        </Section>

        <Section title="6. 정보주체의 권리">
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>개인정보 열람, 정정·삭제, 처리정지 요청 권리</li>
            <li>앱 내 &ldquo;내 정보&rdquo; 메뉴에서 직접 수정 가능</li>
            <li>탈퇴는 앱 내 &ldquo;내 정보&rdquo; 메뉴 또는 담당 코디네이터를 통해 신청</li>
          </ul>
        </Section>

        <Section title="7. 개인정보 보호책임자">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm space-y-1">
            <p><strong>기관명:</strong> 착한도시사회적협동조합</p>
            <p><strong>서비스명:</strong> TimePay (광주서구 타임뱅크)</p>
            <p><strong>문의:</strong> 담당 코디네이터 또는 관할 행정복지센터</p>
            <p className="text-xs text-gray-500 mt-2">
              개인정보 관련 문의, 열람 청구, 불만 접수는 위 연락처로 문의해 주시기 바랍니다.
            </p>
          </div>
        </Section>

        <div className="border-t pt-4 flex justify-between items-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            ← 로그인으로 돌아가기
          </Link>
          <Link href="/register" className="text-blue-600 hover:underline">
            회원가입 →
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border border-gray-200">
      {children}
    </th>
  )
}

function Tr({ items }: { items: string[] }) {
  return (
    <tr className="even:bg-gray-50">
      {items.map((item, i) => (
        <td key={i} className="px-3 py-2 text-sm text-gray-700 border border-gray-200">
          {item}
        </td>
      ))}
    </tr>
  )
}
