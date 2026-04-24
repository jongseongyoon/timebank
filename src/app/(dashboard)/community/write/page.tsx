'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CATEGORIES = [
  { key: 'GENERAL', label: '자유' },
  { key: 'REVIEW', label: '거래후기' },
  { key: 'QUESTION', label: '질문' },
  { key: 'NOTICE', label: '공지 (관리자 전용)' },
]

export default function WritePage() {
  const router = useRouter()
  const [category, setCategory] = useState('GENERAL')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, category }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { setError(d.error ?? '오류 발생'); return }
    router.push(`/community/${d.post.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> 취소
      </button>
      <h1 className="text-2xl font-bold">글쓰기</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 카테고리 */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              type="button"
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                category === c.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-4 space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
            maxLength={100}
            className="w-full text-lg font-medium border-b pb-3 focus:outline-none"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="내용을 입력하세요..."
            required
            maxLength={3000}
            rows={12}
            className="w-full text-sm resize-none focus:outline-none"
          />
          <div className="text-right text-xs text-gray-400">{content.length}/3000</div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <Button type="submit" disabled={loading || !title || !content} className="w-full h-12">
          {loading ? '게시 중...' : '게시하기'}
        </Button>
      </form>
    </div>
  )
}
