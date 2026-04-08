'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import ContactForm from '@/components/ContactForm'
import InteractionForm from '@/components/InteractionForm'
import type { InteractionWithContact } from '@/types'

interface DashboardStats {
  totalContacts: number
  interactionsThisWeek: number
  pendingFollowUps: number
  overdueFollowUps: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalContacts: 0, interactionsThisWeek: 0, pendingFollowUps: 0, overdueFollowUps: 0 })
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<InteractionWithContact[]>([])
  const [recentInteractions, setRecentInteractions] = useState<InteractionWithContact[]>([])
  const [showContactModal, setShowContactModal] = useState(false)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [contactsRes, weekInteractionsRes, pendingRes, overdueRes, upcomingRes, recentRes] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase.from('interactions').select('id', { count: 'exact', head: true }).gte('date', weekAgo),
      supabase.from('interactions').select('id', { count: 'exact', head: true }).eq('follow_up_needed', true).eq('status', 'Pending').gte('follow_up_date', today),
      supabase.from('interactions').select('id', { count: 'exact', head: true }).eq('follow_up_needed', true).eq('status', 'Pending').lt('follow_up_date', today),
      supabase.from('interactions').select('*, contacts(id, name, organization)').eq('follow_up_needed', true).eq('status', 'Pending').gte('follow_up_date', today).order('follow_up_date', { ascending: true }).limit(7),
      supabase.from('interactions').select('*, contacts(id, name, organization)').order('date', { ascending: false }).limit(7),
    ])

    setStats({
      totalContacts: contactsRes.count ?? 0,
      interactionsThisWeek: weekInteractionsRes.count ?? 0,
      pendingFollowUps: (pendingRes.count ?? 0) + (overdueRes.count ?? 0),
      overdueFollowUps: overdueRes.count ?? 0,
    })
    setUpcomingFollowUps((upcomingRes.data ?? []) as unknown as InteractionWithContact[])
    setRecentInteractions((recentRes.data ?? []) as unknown as InteractionWithContact[])
    setLoading(false)
  }

  useEffect(() => { fetchDashboard() }, [])

  const statCards = [
    { label: 'Total Contacts', value: stats.totalContacts, color: 'text-gold' },
    { label: 'Interactions This Week', value: stats.interactionsThisWeek, color: 'text-gold' },
    { label: 'Pending Follow-Ups', value: stats.pendingFollowUps, color: 'text-gold' },
    { label: 'Overdue Follow-Ups', value: stats.overdueFollowUps, color: stats.overdueFollowUps > 0 ? 'text-danger' : 'text-gold', bg: stats.overdueFollowUps > 0 ? 'bg-danger-dim border-danger/30' : '' },
  ]

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowContactModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors">
            + Add Contact
          </button>
          <button onClick={() => setShowInteractionModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-elevated text-text-primary border border-border hover:bg-surface transition-colors">
            + Log Interaction
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className={`rounded-xl border border-border p-5 ${card.bg || 'bg-dark-card'} border-l-2 border-l-gold/30`}>
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest mb-2">{card.label}</p>
            <p className={`text-3xl font-bold font-[family-name:var(--font-mono-space)] ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Follow-Ups */}
        <div className="bg-dark-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Upcoming Follow-Ups</h2>
            <Link href="/follow-ups" className="text-sm text-gold hover:text-gold-hover transition-colors">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingFollowUps.length === 0 ? (
              <p className="px-5 py-8 text-center text-text-muted text-sm">No upcoming follow-ups</p>
            ) : upcomingFollowUps.map(item => (
              <Link key={item.id} href={`/interactions/${item.id}`} className="block px-5 py-3 hover:bg-dark-elevated transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.contacts?.name}</p>
                    <p className="text-sm text-text-secondary truncate">{item.follow_up_action || item.summary}</p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap">{item.follow_up_date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Interactions */}
        <div className="bg-dark-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Recent Interactions</h2>
            <Link href="/interactions" className="text-sm text-gold hover:text-gold-hover transition-colors">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {recentInteractions.length === 0 ? (
              <p className="px-5 py-8 text-center text-text-muted text-sm">No interactions yet</p>
            ) : recentInteractions.map(item => (
              <Link key={item.id} href={`/interactions/${item.id}`} className="block px-5 py-3 hover:bg-dark-elevated transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.contacts?.name}</p>
                    <p className="text-sm text-text-secondary truncate">{item.summary}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary">{item.type}</span>
                    <p className="text-xs text-text-muted mt-1">{item.date}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal open={showContactModal} onClose={() => setShowContactModal(false)} title="Add Contact" wide>
        <ContactForm onSaved={() => { setShowContactModal(false); fetchDashboard() }} onCancel={() => setShowContactModal(false)} />
      </Modal>
      <Modal open={showInteractionModal} onClose={() => setShowInteractionModal(false)} title="Log Interaction" wide>
        <InteractionForm onSaved={() => { setShowInteractionModal(false); fetchDashboard() }} onCancel={() => setShowInteractionModal(false)} />
      </Modal>
    </div>
  )
}
