'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts'

interface Props {
  data: { name: string; value: number; fill: string }[]
}

export function SupplyDemandChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)} TC`} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  )
}
