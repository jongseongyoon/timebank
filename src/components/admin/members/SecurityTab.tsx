import { KeyRound, UserX, AlertTriangle, Check } from 'lucide-react'
import { type MemberDetail } from './types'

interface Props {
  detail:            MemberDetail
  formStatus:        string
  resetLoading:      boolean
  resetResult:       string | null
  withdrawConfirm:   boolean
  withdrawLoading:   boolean
  onResetPw:         () => void
  setWithdrawConfirm: (v: boolean) => void
  onWithdraw:        () => void
}

export function SecurityTab({ detail, formStatus, resetLoading, resetResult, withdrawConfirm, withdrawLoading, onResetPw, setWithdrawConfirm, onWithdraw }: Props) {
  return (
    <div className="p-5 space-y-5">
      {/* 비밀번호 초기화 */}
      <div className="border rounded-xl p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">비밀번호 초기화</p>
          <p className="text-xs text-gray-500 mt-0.5">
            생년월일 6자리(YYMMDD)로 임시 비밀번호를 설정합니다.
            {detail.birthDate
              ? ` 예상 임시 비밀번호: ${detail.birthDate.slice(2, 8)}`
              : ' (생년월일 미등록 시 불가)'}
          </p>
        </div>
        <button onClick={onResetPw} disabled={resetLoading || !detail.birthDate}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-40 rounded-xl py-2.5 text-sm font-medium transition-colors">
          <KeyRound className="h-4 w-4" />
          {resetLoading ? '처리 중…' : '비밀번호 초기화'}
        </button>
        {resetResult && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${resetResult.startsWith('오류') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <Check className="h-4 w-4 shrink-0" />{resetResult}
          </div>
        )}
      </div>

      {/* 탈퇴 처리 */}
      <div className="border border-red-200 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-red-700">탈퇴 처리</p>
          <p className="text-xs text-gray-500 mt-0.5">회원 상태를 <strong>탈퇴</strong>로 변경합니다. 데이터는 보존됩니다.</p>
        </div>
        {formStatus === 'WITHDRAWN' ? (
          <p className="text-sm text-gray-500 text-center py-1">이미 탈퇴 처리된 회원입니다.</p>
        ) : !withdrawConfirm ? (
          <button onClick={() => setWithdrawConfirm(true)}
            className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl py-2.5 text-sm font-medium transition-colors">
            <UserX className="h-4 w-4" /> 탈퇴 처리
          </button>
        ) : (
          <div className="bg-red-50 rounded-xl p-3 space-y-3">
            <div className="flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span><strong>{detail.name}</strong> 회원을 탈퇴 처리하시겠습니까?</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWithdrawConfirm(false)}
                className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-white transition-colors">취소</button>
              <button onClick={onWithdraw} disabled={withdrawLoading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {withdrawLoading ? '처리 중…' : '확인'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
