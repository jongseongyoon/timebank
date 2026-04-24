'use client'

import { MessageSquare } from 'lucide-react'

export default function CommunityPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
        <MessageSquare className="h-10 w-10 text-blue-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">커뮤니티</h1>
        <p className="text-muted-foreground mt-2">3순위 개발 예정 기능입니다</p>
      </div>
    </div>
  )
}
