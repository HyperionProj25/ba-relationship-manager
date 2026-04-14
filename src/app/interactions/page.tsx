'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { todayLocal } from '@/lib/dates'
import { statusColor } from '@/lib/statusColors'
import Modal from '@/components/Modal'
import InteractionForm from '@/components/InteractionForm'
import type { InteractionWithContact, InteractionType, FollowUpStatus } from '@/types'

const TYPES: (InteractionType | 'All')[] = ['All', 'Call', 'Email', 'Meeting', 'Text', 'LinkedIn', 'In-Person']
const STATUSES: (FollowUpStatus | 'All')[] = ['All', 'Pending', 'Done', 'Overdue']

type SortKey = 'date' | 'contact' | 'type' | 'status'

function SortHeader({ label, field, sortKey, sortAsc, onSort }: {
  label: string; field: SortKey; sortKey: SortKey; sortAsc: boolean; onSort: (key: SortKey) => void
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-secondary transition-colors"
      onClick={() => onSort(field)}
    >
      {label} {sortKey === field && (sortAsc ? '↑' : '↓')}
    </th>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = statusColor[status as FollowUpStatus] ?? 'bg-surface text-text-secondary'
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>
}

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<InteractionWithContact[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<InteractionType | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | 'All'>('All')
  const [followUpOnly, setFollowUpOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const guardClose = () => !formDirty || window.confirm('Discard unsaved changes?')
  const closeModal = () => { if (guardClose()) setShowAddModal(false) }

  const fetchInteractions = async () => {
    const { data, error: err } = await supabase
      .from('interactions')
      .select('*, contacts(id, name, organization)')
      .order('date', { ascending: false })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setInteractions((data ?? []) as unknown as InteractionWithContact[])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-side Supabase fetch on mount
  useEffect(() => { fetchInteractions(); }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(key !== 'date') }
  }

  const today = todayLocal()

  const getEffectiveStatus = (i: InteractionWithContact) => {
    if (i.follow_up_needed && i.status === 'Pending' && i.follow_up_date && i.follow_up_date < today) return 'Overdue'
    return i.status
  }

  const filtered = interactions
    .filter(i => {
      const q = search.toLowerCase()
      const matchSearch = !q || i.summary.toLowerCase().includes(q) || i.contacts?.name.toLowerCase().includes(q)
      const matchType = typeFilter === 'All' || i.type === typeFilter
      const effectiveStatus = getEffectiveStatus(i)
      const matchStatus = statusFilter === 'All' || effectiveStatus === statusFilter
      const matchFollowUp = !followUpOnly || i.follow_up_needed
      return matchSearch && matchType && matchStatus && matchFollowUp
    })
    .sort((a, b) => {
      let aVal = '', bVal = ''
      switch (sortKey) {
        case 'date': aVal = a.date; bVal = b.date; break
        case 'contact': aVal = a.contacts?.name ?? ''; bVal = b.contacts?.name ?? ''; break
        case 'type': aVal = a.type; bVal = b.type; break
        case 'status': aVal = getEffectiveStatus(a); bVal = getEffectiveStatus(b); break
      }
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>
  if (error) return <div className="flex items-center justify-center h-64 text-danger text-sm">Failed to load: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">Activity Log</p>
          <h1 className="text-2xl font-bold">Interactions</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors">
          + Log Interaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <input
          className="w-full bg-dark-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
          placeholder="Search by summary or contact name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 flex-wrap">
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? 'bg-gold text-black' : 'bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-border hidden sm:block" />
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-gold text-black' : 'bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated'}`}>
                {s}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
            <input type="checkbox" checked={followUpOnly} onChange={e => setFollowUpOnly(e.target.checked)} className="accent-gold" />
            Follow-up only
          </label>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-dark-card border border-border rounded-xl px-6 py-12 text-center text-text-muted text-sm">No interactions found</div>
        ) : filtered.map(i => {
          const effectiveStatus = getEffectiveStatus(i)
          return (
            <Link key={i.id} href={`/interactions/${i.id}`} className="block bg-dark-card border border-border rounded-xl p-4 hover:bg-dark-elevated active:bg-dark-elevated transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-text-primary">{i.summary}</p>
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary shrink-0">{i.type}</span>
              </div>
              <p className="text-xs text-gold">{i.contacts?.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-text-muted">{i.date}</span>
                {i.follow_up_needed && <StatusBadge status={effectiveStatus} />}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-dark-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-elevated">
              <tr>
                <SortHeader label="Date" field="date" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortHeader label="Contact" field="contact" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortHeader label="Type" field="type" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Summary</th>
                <SortHeader label="Status" field="status" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">No interactions found</td></tr>
              ) : filtered.map(i => {
                const effectiveStatus = getEffectiveStatus(i)
                return (
                  <tr key={i.id} className="hover:bg-dark-elevated transition-colors">
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">{i.date}</td>
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${i.contact_id}`} className="text-sm text-gold hover:text-gold-hover transition-colors">{i.contacts?.name}</Link>
                    </td>
                    <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary">{i.type}</span></td>
                    <td className="px-4 py-3">
                      <Link href={`/interactions/${i.id}`} className="text-sm text-text-primary hover:text-gold transition-colors">{i.summary}</Link>
                    </td>
                    <td className="px-4 py-3">{i.follow_up_needed ? <StatusBadge status={effectiveStatus} /> : <span className="text-xs text-text-muted">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} canClose={guardClose} title="Log Interaction" wide>
        <InteractionForm onSaved={() => { setFormDirty(false); setShowAddModal(false); fetchInteractions() }} onCancel={closeModal} onDirtyChange={setFormDirty} />
      </Modal>
    </div>
  )
}
