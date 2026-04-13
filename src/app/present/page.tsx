'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { daysSinceDate, cadenceColor, cadenceLabel } from '@/lib/cadence'
import PresentationSlide from '@/components/PresentationSlide'
import { allCategories } from '@/lib/categories'
import type { Contact, ContactWithCadence, ContactCategory, Interaction, InteractionType } from '@/types'

export default function PresentPage() {
  const [contacts, setContacts] = useState<ContactWithCadence[]>([])
  const [category, setCategory] = useState<ContactCategory | 'All'>('All')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Presentation state
  const [presenting, setPresenting] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [slideContacts, setSlideContacts] = useState<ContactWithCadence[]>([])
  const [interactionsByContact, setInteractionsByContact] = useState<Map<string, Interaction[]>>(new Map())
  const [loadingSlides, setLoadingSlides] = useState(false)

  // Touch tracking
  const touchStart = useRef<number | null>(null)

  const fetchContacts = async () => {
    const [contactsRes, interactionsRes] = await Promise.all([
      supabase.from('contacts').select('*').order('name'),
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
  useEffect(() => { fetchContacts(); }, [])

  const filtered = contacts.filter(c => category === 'All' || c.category === category)
  const categoryOptions: (ContactCategory | 'All')[] = ['All', ...allCategories(contacts)]

  const toggleContact = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const filteredIds = filtered.map(c => c.id)
    const allSelected = filteredIds.every(id => selected.has(id))
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        filteredIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filteredIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  const startPresentation = async () => {
    const selectedContacts = contacts
      .filter(c => selected.has(c.id))
      .sort((a, b) => {
        const aDays = isFinite(a.daysSinceLastInteraction) ? a.daysSinceLastInteraction : 99999
        const bDays = isFinite(b.daysSinceLastInteraction) ? b.daysSinceLastInteraction : 99999
        return bDays - aDays
      })

    if (selectedContacts.length === 0) return

    setLoadingSlides(true)
    const ids = selectedContacts.map(c => c.id)

    const { data } = await supabase
      .from('interactions')
      .select('*')
      .in('contact_id', ids)
      .order('date', { ascending: false })

    const grouped = new Map<string, Interaction[]>()
    for (const row of (data ?? []) as Interaction[]) {
      const list = grouped.get(row.contact_id) ?? []
      list.push(row)
      grouped.set(row.contact_id, list)
    }

    setSlideContacts(selectedContacts)
    setInteractionsByContact(grouped)
    setSlideIndex(0)
    setLoadingSlides(false)
    setPresenting(true)
  }

  const goNext = useCallback(() => {
    setSlideIndex(i => Math.min(i + 1, slideContacts.length - 1))
  }, [slideContacts.length])

  const goPrev = useCallback(() => {
    setSlideIndex(i => Math.max(i - 1, 0))
  }, [])

  const exitPresentation = useCallback(() => {
    setPresenting(false)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!presenting) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext() }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev() }
      else if (e.key === 'Escape') { e.preventDefault(); exitPresentation() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [presenting, goNext, goPrev, exitPresentation])

  // Touch navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return
    const delta = e.changedTouches[0].clientX - touchStart.current
    if (Math.abs(delta) > 50) {
      if (delta < 0) goNext()
      else goPrev()
    }
    touchStart.current = null
  }

  // Fullscreen presentation
  if (presenting && slideContacts.length > 0) {
    const current = slideContacts[slideIndex]
    const allInteractions = interactionsByContact.get(current.id) ?? []
    const followUps = allInteractions.filter(i =>
      i.follow_up_needed && i.status !== 'Done'
    )

    return (
      <div
        className="fixed inset-0 z-[100] bg-dark flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-black">
          <button
            onClick={exitPresentation}
            className="px-3 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface border border-border transition-colors"
          >
            Exit
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium font-[family-name:var(--font-mono-space)] text-text-secondary">
              {slideIndex + 1} / {slideContacts.length}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              disabled={slideIndex === 0}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface border border-border transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              ←
            </button>
            <button
              onClick={goNext}
              disabled={slideIndex === slideContacts.length - 1}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface border border-border transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              →
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="shrink-0 h-1 bg-dark-elevated">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${((slideIndex + 1) / slideContacts.length) * 100}%` }}
          />
        </div>

        {/* Slide content */}
        <div className="flex-1 overflow-hidden">
          <PresentationSlide
            contact={current}
            interactions={allInteractions}
            followUps={followUps}
            cadenceDays={current.daysSinceLastInteraction}
          />
        </div>
      </div>
    )
  }

  // Selection screen
  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">Weekly Review</p>
          <h1 className="text-2xl font-bold">Presentation Mode</h1>
          <p className="text-sm text-text-muted mt-1">Select contacts to present, then start the slideshow.</p>
        </div>
        <button
          onClick={startPresentation}
          disabled={selected.size === 0 || loadingSlides}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-40"
        >
          {loadingSlides ? 'Loading...' : `Start Presentation (${selected.size})`}
        </button>
      </div>

      {/* Category filter + select all */}
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
        <button
          onClick={toggleAll}
          className="px-4 py-2 rounded-lg text-xs font-medium bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated transition-colors"
        >
          {allFilteredSelected ? 'Deselect All' : 'Select All'}
          {category !== 'All' && ` (${category})`}
        </button>
      </div>

      {/* Contact list with checkboxes */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-dark-card border border-border rounded-xl px-6 py-12 text-center text-text-muted">
            No contacts found
          </div>
        ) : filtered.map(contact => {
          const isSelected = selected.has(contact.id)
          const color = cadenceColor(contact.daysSinceLastInteraction)
          const days = cadenceLabel(contact.daysSinceLastInteraction)

          return (
            <button
              key={contact.id}
              onClick={() => toggleContact(contact.id)}
              className={`w-full text-left bg-dark-card border rounded-xl p-4 transition-colors ${
                isSelected
                  ? 'border-gold/50 bg-gold-dim'
                  : 'border-border hover:bg-dark-elevated'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-gold border-gold' : 'border-border'
                }`}>
                  {isSelected && <span className="text-black text-xs font-bold">✓</span>}
                </div>

                {/* Contact info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary shrink-0">{contact.category}</span>
                  </div>
                  {contact.organization && (
                    <p className="text-xs text-text-secondary truncate">{contact.organization}</p>
                  )}
                </div>

                {/* Cadence indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-medium" style={{ color }}>{days}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
