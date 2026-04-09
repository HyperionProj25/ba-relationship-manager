'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { daysSinceDate, cadenceColor, cadenceZone } from '@/lib/cadence'
import type { CadenceZone } from '@/lib/cadence'
import Modal from '@/components/Modal'
import ContactForm from '@/components/ContactForm'
import InteractionForm from '@/components/InteractionForm'
import CadenceCard from '@/components/CadenceCard'
import type { Contact, ContactWithCadence, ContactCategory, InteractionType } from '@/types'

const CATEGORIES: (ContactCategory | 'All')[] = ['All', 'MLB', 'Investor', 'IAB', 'Partner', 'Vendor', 'University', 'Other']

type SortOption = 'urgent' | 'recent' | 'name' | 'category'

export default function Dashboard() {
  const [contacts, setContacts] = useState<ContactWithCadence[]>([])
  const [category, setCategory] = useState<ContactCategory | 'All'>('All')
  const [sortBy, setSortBy] = useState<SortOption>('urgent')
  const [showContactModal, setShowContactModal] = useState(false)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    const [contactsRes, interactionsRes] = await Promise.all([
      supabase.from('contacts').select('*'),
      supabase.from('interactions').select('contact_id, date, type').order('date', { ascending: false }),
    ])

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

  const zoneCounts: Record<CadenceZone, number> = { green: 0, yellow: 0, red: 0 }
  for (const c of contacts) {
    zoneCounts[cadenceZone(c.daysSinceLastInteraction)]++
  }

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
  ]

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          {CATEGORIES.map(cat => (
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
        <div className="bg-dark-card border border-border rounded-xl px-6 py-12 text-center text-text-muted">
          No contacts found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map(contact => (
            <CadenceCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}

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
