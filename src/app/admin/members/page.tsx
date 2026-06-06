'use client'

import { useEffect, useState, useCallback } from 'react'
import { MemberFilters }     from '@/components/admin/members/MemberFilters'
import { MemberTable }       from '@/components/admin/members/MemberTable'
import { MemberDetailPanel } from '@/components/admin/members/MemberDetailPanel'
import { type MemberRow }    from '@/components/admin/members/types'

const LIMIT = 20

export default function MembersPage() {
  const [search,       setSearch]       = useState('')
  const [filterDong,   setFilterDong]   = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page,         setPage]         = useState(1)
  const [members,      setMembers]      = useState<MemberRow[]>([])
  const [total,        setTotal]        = useState(0)
  const [listLoading,  setListLoading]  = useState(true)
  const [selectedId,   setSelectedId]   = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    setListLoading(true)
    try {
      const q   = new URLSearchParams({ search, dong: filterDong, role: filterRole, status: filterStatus, page: String(page), limit: String(LIMIT) })
      const res = await fetch(`/api/admin/members?${q}`)
      const data = await res.json()
      if (res.ok) { setMembers(data.members); setTotal(data.total) }
    } finally { setListLoading(false) }
  }, [search, filterDong, filterRole, filterStatus, page])

  useEffect(() => { loadMembers() }, [loadMembers])

  function handleReset() { setSearch(''); setFilterDong(''); setFilterRole(''); setFilterStatus(''); setPage(1) }
  function handleSelect(id: string) { setSelectedId(id) }
  function handlePageChange(p: number) { setPage(p) }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* 좌측 목록 */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all ${selectedId ? 'mr-[480px]' : ''}`}>
        <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center justify-between">
          <h1 className="text-xl font-bold">회원 관리</h1>
          <span className="text-sm text-muted-foreground">총 {total.toLocaleString()}명</span>
        </div>
        <MemberFilters
          search={search} filterDong={filterDong} filterRole={filterRole} filterStatus={filterStatus}
          setSearch={v => { setSearch(v); setPage(1) }}
          setFilterDong={v => { setFilterDong(v); setPage(1) }}
          setFilterRole={v => { setFilterRole(v); setPage(1) }}
          setFilterStatus={v => { setFilterStatus(v); setPage(1) }}
          onReset={handleReset} onRefresh={loadMembers}
        />
        <MemberTable
          members={members} listLoading={listLoading} selectedId={selectedId}
          page={page} totalPages={totalPages}
          onSelect={handleSelect} onPageChange={handlePageChange}
        />
      </div>

      {/* 우측 상세 패널 */}
      {selectedId && (
        <MemberDetailPanel
          selectedId={selectedId}
          onClose={() => setSelectedId(null)}
          onMemberUpdated={loadMembers}
        />
      )}
    </div>
  )
}
