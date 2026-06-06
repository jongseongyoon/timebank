import { Footprints, Trophy } from 'lucide-react'

interface Props {
  totalSteps: number
  progress:   number   // 0~1
  rewarded:   boolean
  isActive:   boolean
  goal:       number
}

export function WalkCircleGauge({ totalSteps, progress, rewarded, isActive, goal }: Props) {
  const circumference = 2 * Math.PI * 90
  const pct = Math.round(progress * 100)
  const stroke = rewarded ? '#16a34a' : isActive ? '#f59e0b' : '#3b5bdb'

  return (
    <div className="flex justify-center">
      <div className="relative w-56 h-56">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="14" />
          <circle cx="100" cy="100" r="90" fill="none"
            stroke={stroke} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {rewarded
            ? <Trophy className="h-8 w-8 text-yellow-500 mb-1" />
            : <Footprints className={`h-8 w-8 mb-1 ${isActive ? 'text-amber-500 animate-pulse' : 'text-blue-600'}`} />
          }
          <p className="text-4xl font-bold tabular-nums">{totalSteps.toLocaleString()}</p>
          <p className="text-sm font-medium" style={{ color: stroke }}>{pct}%</p>
          <p className="text-xs text-muted-foreground">/ {goal.toLocaleString()}보</p>
        </div>
      </div>
    </div>
  )
}
