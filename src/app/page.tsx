'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { daysSinceDate, cadenceColor, cadenceZone } from '@/lib/cadence'
import type { CadenceZone } from '@/lib/cadence'
import Modal from '@/components/Modal'
import ContactForm from '@/components/ContactForm'
import InteractionForm from '@/components/InteractionForm'
import CadenceCard from '@/components/CadenceCard'
import { TASK_SAVED_EVENT } from '@/components/QuickCaptureFab'
import { allCategories } from '@/lib/categories'
import type { Contact, ContactWithCadence, ContactCategory, InteractionType } from '@/types'

type SortOption = 'urgent' | 'recent' | 'name' | 'category'

export default function Dashboard() {
  const [contacts, setContacts] = useState<ContactWithCadence[]>([])
  const [openTaskCount, setOpenTaskCount] = useState(0)
  const [category, setCategory] = useState<ContactCategory | 'All'>('All')
  const [sortBy, setSortBy] = useState<SortOption>('urgent')
  const [showContactModal, setShowContactModal] = useState(false)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [contactFormDirty, setContactFormDirty] = useState(false)
  const [interactionFormDirty, setInteractionFormDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const guardClose = (dirty: boolean) => !dirty || window.confirm('Discard unsaved changes?')
  const closeContactModal = () => { if (guardClose(contactFormDirty)) setShowContactModal(false) }
  const closeInteractionModal = () => { if (guardClose(interactionFormDirty)) setShowInteractionModal(false) }

  const fetchOpenTaskCount = async () => {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
    setOpenTaskCount(count ?? 0)
  }

  const fetchDashboard = async () => {
    const [contactsRes, interactionsRes] = await Promise.all([
      supabase.from('contacts').select('*'),
      supabase.from('interactions').select('contact_id, date, type').order('date', { ascending: false }),
      fetchOpenTaskCount(),
    ])

    if (contactsRes.error || interactionsRes.error) {
      setError(contactsRes.error?.message || interactionsRes.error?.message || 'Failed to load')
      setLoading(false)
      return
    }

    const latestByContact = new Map<string, { date: string; type: InteractionType }>()
    for (const row of (interactionsRes.data ?? []) as { contact_id: string; date: string; type: InteractionType }[]) {
      if (!latestByContact.has(row.contact_id)) {
        latestByContact.set(row.contact_id, { date: row.date, type: row.type })
      }
    }

    const enriched: ContactWithCadence[] = ((contactsRes.data ?? []) as Contact[]).map(c => {
      const latest = latestByContact.get(c.id)
      return {
        ...c,
        daysSinceLastInteraction: daysSinceDate(latest?.date ?? null),
        lastInteractionDate: latest?.date ?? null,
        lastInteractionType: latest?.type ?? null,
      }
    })

    setContacts(enriched)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-side Supabase fetch on mount
  useEffect(() => { fetchDashboard(); }, [])

  useEffect(() => {
    const onSaved = () => { fetchOpenTaskCount() }
    window.addEventListener(TASK_SAVED_EVENT, onSaved)
    return () => window.removeEventListener(TASK_SAVED_EVENT, onSaved)
  }, [])

  const zoneCounts: Record<CadenceZone, number> = { green: 0, yellow: 0, red: 0 }
  for (const c of contacts) {
    zoneCounts[cadenceZone(c.daysSinceLastInteraction)]++
  }

  const categoryOptions: (ContactCategory | 'All')[] = ['All', ...allCategories(contacts)]

  const displayed = contacts
    .filter(c => category === 'All' || c.category === category)
    .sort((a, b) => {
      switch (sortBy) {
        case 'urgent': {
          const aDays = isFinite(a.daysSinceLastInteraction) ? a.daysSinceLastInteraction : 99999
          const bDays = isFinite(b.daysSinceLastInteraction) ? b.daysSinceLastInteraction : 99999
          return bDays - aDays
        }
        case 'recent': {
          const aDays = isFinite(a.daysSinceLastInteraction) ? a.daysSinceLastInteraction : 99999
          const bDays = isFinite(b.daysSinceLastInteraction) ? b.daysSinceLastInteraction : 99999
          return aDays - bDays
        }
        case 'name':
          return a.name.localeCompare(b.name)
        case 'category':
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      }
    })

  const statCards = [
    { label: 'Total Contacts', value: contacts.length, color: 'text-gold' },
    { label: 'Green (≤5d)', value: zoneCounts.green, colorStyle: cadenceColor(0) },
    { label: 'Yellow (6-10d)', value: zoneCounts.yellow, colorStyle: cadenceColor(8) },
    { label: 'Red (11d+)', value: zoneCounts.red, colorStyle: cadenceColor(14) },
    { label: 'Open Tasks', value: openTaskCount, color: 'text-gold' },
  ]

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>
  if (error) return <div className="flex items-center justify-center h-64 text-danger text-sm">Failed to load: {error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">Outreach Health</p>
          <h1 className="text-2xl font-bold">Contact Cadence</h1>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button onClick={() => setShowContactModal(true)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors">
            + Add Contact
          </button>
          <button onClick={() => setShowInteractionModal(true)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium bg-dark-elevated text-text-primary border border-border hover:bg-surface transition-colors">
            + Log Interaction
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="rounded-xl border border-border p-5 bg-dark-card border-l-2 border-l-gold/30">
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest mb-2">{card.label}</p>
            <p
              className={`text-3xl font-bold font-[family-name:var(--font-mono-space)] ${card.color ?? ''}`}
              style={card.colorStyle ? { color: card.colorStyle } : undefined}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 flex-wrap flex-1">
          {categoryOptions.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-gold text-black'
                  : 'bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortOption)}
          className="bg-dark-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
        >
          <option value="urgent">Most Urgent</option>
          <option value="recent">Most Recent</option>
          <option value="name">Name A-Z</option>
          <option value="category">Category</option>
        </select>
      </div>

      {/* Card Grid */}
      {displayed.length === 0 ? (
        <div className="bg-dark-card border border-border rounded-xl px-6 py-12 text-center">
          {contacts.length === 0 ? (
            <>
              <p className="text-text-secondary mb-3">No contacts yet.</p>
              <button onClick={() => setShowContactModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors">
                + Add your first contact
              </button>
            </>
          ) : (
            <p className="text-text-muted">No contacts match this filter.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map(contact => (
            <CadenceCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}

      {/* Modals */}
      <Modal open={showContactModal} onClose={() => setShowContactModal(false)} canClose={() => guardClose(contactFormDirty)} title="Add Contact" wide>
        <ContactForm onSaved={() => { setContactFormDirty(false); setShowContactModal(false); fetchDashboard() }} onCancel={closeContactModal} onDirtyChange={setContactFormDirty} />
      </Modal>
      <Modal open={showInteractionModal} onClose={() => setShowInteractionModal(false)} canClose={() => guardClose(interactionFormDirty)} title="Log Interaction" wide>
        <InteractionForm onSaved={() => { setInteractionFormDirty(false); setShowInteractionModal(false); fetchDashboard() }} onCancel={closeInteractionModal} onDirtyChange={setInteractionFormDirty} />
      </Modal>
    </div>
  )
}
