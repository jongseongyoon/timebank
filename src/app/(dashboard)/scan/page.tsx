'use client'

import { Camera } from 'lucide-react'

export default function ScanPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
        <Camera className="h-10 w-10 text-blue-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">QR 스캔</h1>
        <p className="text-muted-foreground mt-2">2순위 개발 예정 기능입니다</p>
      </div>
    </div>
  )
}
