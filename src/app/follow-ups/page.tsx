'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { InteractionWithContact, FollowUpStatus } from '@/types'

const STATUS_FILTERS: (FollowUpStatus | 'All')[] = ['All', 'Overdue', 'Pending', 'Done']

export default function FollowUpsPage() {
  const [interactions, setInteractions] = useState<InteractionWithContact[]>([])
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | 'All'>('All')
  const [loading, setLoading] = useState(true)

  const fetchFollowUps = async () => {
    const { data } = await supabase
      .from('interactions')
      .select('*, contacts(id, name, organization)')
      .eq('follow_up_needed', true)
      .order('follow_up_date', { ascending: true })
    setInteractions((data ?? []) as unknown as InteractionWithContact[])
    setLoading(false)
  }

  useEffect(() => { fetchFollowUps() }, [])

  const today = new Date().toISOString().split('T')[0]

  const getEffectiveStatus = (i: InteractionWithContact): FollowUpStatus => {
    if (i.status === 'Pending' && i.follow_up_date && i.follow_up_date < today) return 'Overdue'
    return i.status
  }

  const filtered = interactions.filter(i => {
    if (statusFilter === 'All') return true
    return getEffectiveStatus(i) === statusFilter
  })

  const markDone = async (id: string) => {
    await supabase.from('interactions').update({ status: 'Done' }).eq('id', id)
    setInteractions(prev => prev.map(i => i.id === id ? { ...i, status: 'Done' as FollowUpStatus } : i))
  }

  const statusColor = {
    Pending: 'bg-gold-dim text-gold',
    Done: 'bg-success-dim text-success',
    Overdue: 'bg-danger-dim text-danger',
  }

  const counts = {
    All: interactions.length,
    Overdue: interactions.filter(i => getEffectiveStatus(i) === 'Overdue').length,
    Pending: interactions.filter(i => getEffectiveStatus(i) === 'Pending').length,
    Done: interactions.filter(i => getEffectiveStatus(i) === 'Done').length,
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">Morning Check</p>
        <h1 className="text-2xl font-bold">Follow-Ups</h1>
        <p className="text-sm text-text-muted mt-1">See what needs attention today.</p>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-gold text-black'
                : 'bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated'
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Follow-up list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-dark-card border border-border rounded-xl px-6 py-12 text-center text-text-muted">
            {statusFilter === 'All' ? 'No follow-ups tracked yet' : `No ${statusFilter.toLowerCase()} follow-ups`}
          </div>
        ) : filtered.map(i => {
          const effectiveStatus = getEffectiveStatus(i)
          const isOverdue = effectiveStatus === 'Overdue'
          return (
            <div key={i.id} className={`bg-dark-card border rounded-xl p-5 transition-colors ${isOverdue ? 'border-danger/40 border-l-2 border-l-danger' : 'border-border border-l-2 border-l-gold/30'}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor[effectiveStatus]}`}>
                      {effectiveStatus}
                    </span>
                    {i.follow_up_date && (
                      <span className={`text-xs ${isOverdue ? 'text-danger font-medium' : 'text-text-muted'}`}>
                        Due: {i.follow_up_date}
                      </span>
                    )}
                  </div>
                  <Link href={`/interactions/${i.id}`} className="text-sm font-medium hover:text-gold transition-colors">
                    {i.follow_up_action || i.summary}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <Link href={`/contacts/${i.contact_id}`} className="text-xs text-gold hover:text-gold-hover transition-colors">
                      {i.contacts?.name}
                    </Link>
                    <span className="text-xs text-text-muted">· {i.type} on {i.date}</span>
                  </div>
                  {i.details && <p className="text-xs text-text-muted mt-1 line-clamp-1">{i.details}</p>}
                </div>
                {effectiveStatus !== 'Done' && (
                  <button
                    onClick={() => markDone(i.id)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-success-dim text-success hover:bg-success hover:text-white border border-success/30 transition-colors"
                  >
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
