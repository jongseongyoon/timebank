'use client'

/**
 * GBoard(구글 키보드) 한영전환 수정 컴포넌트
 *
 * 문제:
 *   GBoard가 한/영 전환 시 IME Composition을 끝내면서
 *   Android WebView → React 간 input 이벤트가 누락됨.
 *   결과적으로 React 폼 상태(react-hook-form 등)가 최종 글자를
 *   인식하지 못하거나, 커서가 이전 조합 중 상태로 멈춤.
 *
 * 원인:
 *   - GBoard는 언어 전환 시 finishComposingText() → WebView InputConnection 전달
 *   - Android WebView가 compositionend DOM 이벤트는 발생시키지만,
 *     input 이벤트는 발생시키지 않아 React가 값 변경을 모름.
 *
 * 해결:
 *   compositionend 시 input 이벤트를 강제로 dispatch → React 상태 동기화.
 *   네이티브 value setter 경유로 실제 변경으로 인식되게 처리.
 */

import { useEffect } from 'react'

export function ImeHandler() {
  useEffect(() => {
    const handleCompositionEnd = (e: CompositionEvent) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return

      // React 18 이하에서는 네이티브 setter를 통해야 onChange가 트리거됨
      const proto = Object.getPrototypeOf(target)
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
      if (nativeSetter) {
        nativeSetter.call(target, target.value)
      }

      // React synthetic event 흐름을 위해 bubbling input 이벤트 dispatch
      target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    }

    // capture 단계에서 처리 (React의 이벤트보다 먼저 받아야 함)
    document.addEventListener('compositionend', handleCompositionEnd, true)
    return () => {
      document.removeEventListener('compositionend', handleCompositionEnd, true)
    }
  }, [])

  return null
}
