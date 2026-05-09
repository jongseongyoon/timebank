'use client'

/**
 * 루트 레이아웃 수준에서 발생한 처리되지 않은 에러를 잡는 최후 경계
 * (Next.js App Router: app/global-error.tsx)
 *
 * error.tsx 는 라우트 세그먼트 내 에러만 처리하고,
 * 루트 layout.tsx 에러는 여기서만 처리됩니다.
 *
 * 이 화면이 보이면 에러 메시지/스택을 관리자에게 전달해 주세요.
 */

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 콘솔에도 기록 (Android WebView 디버깅용)
    console.error('[GlobalError]', error?.message, error?.stack)
  }, [error])

  return (
    <html lang="ko">
      <body>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: '24px',
          fontFamily: 'sans-serif', backgroundColor: '#f9fafb',
        }}>
          <div style={{
            width: '100%', maxWidth: '480px', background: 'white',
            borderRadius: '16px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '8px' }}>
              앱 오류가 발생했습니다
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              아래 오류 내용을 관리자에게 전달해 주세요
            </p>

            {/* 에러 메시지 */}
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', padding: '12px', marginBottom: '12px',
            }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                {error?.name ?? 'Error'}
              </p>
              <p style={{ fontSize: '12px', color: '#b91c1c', wordBreak: 'break-all' }}>
                {error?.message ?? '알 수 없는 오류'}
              </p>
              {error?.digest && (
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  digest: {error.digest}
                </p>
              )}
            </div>

            {/* 스택 트레이스 (디버깅용) */}
            {error?.stack && (
              <details style={{ marginBottom: '16px' }}>
                <summary style={{ fontSize: '12px', color: '#6b7280', cursor: 'pointer', marginBottom: '6px' }}>
                  상세 스택 보기
                </summary>
                <pre style={{
                  fontSize: '10px', color: '#374151', background: '#f3f4f6',
                  borderRadius: '6px', padding: '8px', overflowX: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {error.stack}
                </pre>
              </details>
            )}

            <button
              onClick={() => reset()}
              style={{
                width: '100%', padding: '12px', background: '#3b5bdb',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
