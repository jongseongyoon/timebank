export const dynamic = 'force-dynamic'
import { MemberImport } from '@/components/tomato/member-import'

export default function TomatoImportPage() {
  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">엑셀 일괄등록</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          기존 시스템에서 받은 회원 엑셀(.xlsx)을 올려 한 번에 등록합니다. 컬럼을 매핑하고 미리보기로
          확인한 뒤, 회원번호 기준으로 신규 등록·갱신됩니다.
        </p>
      </div>
      <MemberImport />
    </div>
  )
}
