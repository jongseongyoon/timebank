'use client'

import { useState } from 'react'
import { CARE_LEVELS, getCareStars } from '@/lib/constants'

interface Props {
  currentLevel?: number
  onSelect: (level: number) => void
  readOnly?: boolean
  compact?: boolean
}

export function CareLevelSelector({ currentLevel = 1, onSelect, readOnly, compact }: Props) {
  const [selected, setSelected] = useState(currentLevel)
  const [hovered, setHovered] = useState<number | null>(null)
  const displayLevel = hovered ?? selected
  const info = CARE_LEVELS.find(c => c.level === displayLevel)!

  return (
    <div className="space-y-3">
      {!compact && (
        <p className="text-sm text-gray-500 text-center">돌봄 필요도를 선택해주세요</p>
      )}

      {/* 아이콘 버튼 5개 */}
      <div className="flex justify-center gap-3">
        {CARE_LEVELS.map((care) => (
          <button
            key={care.level}
            type="button"
            disabled={readOnly}
            onClick={() => { setSelected(care.level); onSelect(care.level) }}
            onMouseEnter={() => setHovered(care.level)}
            onMouseLeave={() => setHovered(null)}
            className="transition-transform hover:scale-110 active:scale-95 disabled:cursor-default disabled:transform-none"
            style={{
              width: 52, height: 52,
              borderRadius: '50%',
              border: selected === care.level
                ? `3px solid ${care.color}`
                : '2px solid #e5e7eb',
              background: selected === care.level ? care.bgColor : 'white',
              fontSize: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: selected === care.level ? `0 0 0 4px ${care.color}22` : 'none',
            }}
            aria-label={`${care.level}단계 ${care.label}`}
          >
            {care.icon}
          </button>
        ))}
      </div>

      {/* 선택된 단계 설명 카드 */}
      <div
        className="rounded-xl p-4 text-center space-y-1 transition-all"
        style={{ background: info.bgColor, border: `2px solid ${info.color}` }}
      >
        <div className="text-xl tracking-widest" style={{ color: info.color }}>
          {getCareStars(info.level)}
        </div>
        <div className="text-base font-bold" style={{ color: info.color }}>
          {info.level}단계 · {info.label}
        </div>
        <div className="text-sm text-gray-600">{info.description}</div>
        <div
          className="text-xs rounded-lg px-3 py-1.5 mt-1"
          style={{ background: 'rgba(255,255,255,0.7)', color: '#555' }}
        >
          📋 {info.careNeeds}
        </div>
      </div>
    </div>
  )
}
