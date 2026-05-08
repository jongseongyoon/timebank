import { getCareLevel, getCareStars } from '@/lib/constants'

interface Props {
  level: number
  showStars?: boolean
  showDesc?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function CareLevelBadge({ level, showStars = false, showDesc = false, size = 'md' }: Props) {
  const info = getCareLevel(level)
  const pad = size === 'sm' ? '2px 10px' : size === 'lg' ? '8px 16px' : '4px 12px'
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 13

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: info.bgColor,
        border: `1px solid ${info.color}`,
        borderRadius: 20,
        padding: pad,
        lineHeight: 1.4,
      }}
    >
      <span style={{ fontSize: size === 'sm' ? 14 : 18 }}>{info.icon}</span>
      {showStars && (
        <span style={{ color: info.color, fontSize: 11, letterSpacing: 1 }}>
          {getCareStars(level)}
        </span>
      )}
      <span style={{ color: info.color, fontWeight: 700, fontSize }}>
        {level}단계 · {info.label}
      </span>
      {showDesc && (
        <span style={{ color: '#666', fontSize: fontSize - 1 }}>
          {info.description}
        </span>
      )}
    </div>
  )
}
