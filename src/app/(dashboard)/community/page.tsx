'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, MessageSquare, ThumbsUp, Pin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

const TABS = [
  { key: 'ALL', label: '전체' },
  { key: 'NOTICE', label: '📌 공지' },
  { key: 'GENERAL', label: '자유' },
  { key: 'REVIEW', label: '거래후기' },
  { key: 'QUESTION', label: '질문' },
]

const CATEGORY_LABEL: Record<string, string> = {
  NOTICE: '공지', GENERAL: '자유', REVIEW: '거래후기', QUESTION: '질문',
}
const CATEGORY_COLOR: Record<string, string> = {
  NOTICE: 'bg-red-100 text-red-700',
  GENERAL: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-green-100 text-green-700',
  QUESTION: 'bg-blue-100 text-blue-700',
}

export default function CommunityPage() {
  const [tab, setTab] = useState('ALL')
  const [posts, setPosts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const q = tab === 'ALL' ? '' : `&category=${tab}`
    fetch(`/api/community/posts?limit=30${q}`)
      .then(r => r.json())
      .then(d => {
        setPosts(d.posts ?? [])
        setTotal(d.total ?? 0)
        setLoading(false)
      })
  }, [tab])

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">커뮤니티</h1>
          <p className="text-sm text-muted-foreground">총 {total}개 게시글</p>
        </div>
        <Button asChild size="sm" className="gap-1">
          <Link href="/community/write">
            <Plus className="h-4 w-4" /> 글쓰기
          </Link>
        </Button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>게시글이 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {posts.map(post => (
            <Link key={post.id} href={`/community/${post.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.isPinned && <Pin className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[post.category]}`}>
                      {CATEGORY_LABEL[post.category]}
                    </span>
                  </div>
                  <p className={`font-medium text-sm leading-snug ${post.isPinned ? 'text-blue-700' : ''}`}>
                    {post.title}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {/* 작성자 정보 */}
                    <span className="font-medium text-gray-600">{post.author?.name}</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {Number(post.author?.avgRating ?? 0).toFixed(1)}
                    </span>
                    <span>{Number(post.author?.tcBalance ?? 0).toFixed(0)} TC</span>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-gray-400 shrink-0">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />{post.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />{post._count?.comments ?? 0}
                  </span>
                  <span>👁 {post.viewCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
