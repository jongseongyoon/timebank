'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ThumbsUp, Star, Trash2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

const CATEGORY_LABEL: Record<string, string> = {
  NOTICE: '공지', GENERAL: '자유', REVIEW: '거래후기', QUESTION: '질문',
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [likedByMe, setLikedByMe] = useState(false)
  const [comment, setComment] = useState('')
  const [myId, setMyId] = useState('')
  const [myRoles, setMyRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/community/posts/${id}`).then(r => r.json()),
      fetch('/api/members/me').then(r => r.json()),
    ]).then(([pd, md]) => {
      setPost(pd.post)
      setLikedByMe(pd.likedByMe)
      setMyId(md.member?.id)
      setMyRoles(md.member?.roles ?? [])
      setLoading(false)
    })
  }, [id])

  async function handleLike() {
    const res = await fetch(`/api/community/posts/${id}/like`, { method: 'POST' })
    const d = await res.json()
    setLikedByMe(d.liked)
    setPost((p: any) => ({ ...p, likeCount: p.likeCount + (d.liked ? 1 : -1) }))
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/community/posts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setPost((p: any) => ({ ...p, comments: [...(p.comments ?? []), d.comment] }))
      setComment('')
    }
  }

  async function handleDelete() {
    if (!confirm('게시글을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/community/posts/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/community')
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!post) return <div className="text-center py-20 text-gray-500">게시글을 찾을 수 없습니다</div>

  const canDelete = post.authorId === myId || myRoles.includes('ADMIN')
  const isAdmin = myRoles.includes('ADMIN')

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> 목록으로
      </button>

      {/* 게시글 본문 */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {CATEGORY_LABEL[post.category]}
            </span>
            <h1 className="text-xl font-bold mt-2 leading-snug">{post.title}</h1>
          </div>
          {canDelete && (
            <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 작성자 */}
        <div className="flex items-center gap-3 py-3 border-y">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
            {post.author?.name?.[0]}
          </div>
          <div>
            <p className="text-sm font-semibold">
              {post.author?.name}
              {isAdmin && <span className="ml-1 text-xs text-gray-400">({post.author?.dong})</span>}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {Number(post.author?.avgRating ?? 0).toFixed(1)}
              </span>
              <span>{Number(post.author?.tcBalance ?? 0).toFixed(0)} TC</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 내용 */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {/* 좋아요 */}
        <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-colors ${likedByMe ? 'text-blue-600 font-medium' : 'hover:text-blue-600'}`}
          >
            <ThumbsUp className={`h-4 w-4 ${likedByMe ? 'fill-blue-600' : ''}`} />
            좋아요 {post.likeCount}
          </button>
          <span>댓글 {post.comments?.length ?? 0}</span>
          <span>조회 {post.viewCount}</span>
        </div>
      </div>

      {/* 댓글 목록 */}
      {post.comments?.length > 0 && (
        <div className="bg-white rounded-xl border divide-y">
          {post.comments.map((c: any) => (
            <div key={c.id} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{c.author?.name}</span>
                <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 댓글 입력 */}
      <form onSubmit={handleComment} className="bg-white rounded-xl border p-4 flex gap-3">
        <input
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="flex-1 text-sm border-0 focus:outline-none bg-transparent"
        />
        <Button type="submit" size="sm" disabled={submitting || !comment.trim()} className="gap-1">
          <Send className="h-3.5 w-3.5" />
          {submitting ? '...' : '등록'}
        </Button>
      </form>
    </div>
  )
}
