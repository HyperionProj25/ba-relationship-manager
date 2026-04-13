'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { allCategories } from '@/lib/categories'
import type { Contact, ContactCategory, Priority } from '@/types'

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }

type LatestByContact = Map<string, { date: string; summary: string }>

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function priorityBadgeClass(p: Priority | null): string {
  if (p === 'High') return 'bg-red-100 text-red-800 border-red-300'
  if (p === 'Medium') return 'bg-amber-100 text-amber-800 border-amber-300'
  if (p === 'Low') return 'bg-slate-100 text-slate-700 border-slate-300'
  return 'bg-slate-50 text-slate-500 border-slate-200'
}

export default function PrintPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [latest, setLatest] = useState<LatestByContact>(new Map())
  const [category, setCategory] = useState<ContactCategory | 'All'>('All')
  const [sortMode, setSortMode] = useState<'alpha' | 'priority'>('alpha')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [contactsRes, interactionsRes] = await Promise.all([
        supabase.from('contacts').select('*').order('name'),
        supabase.from('interactions').select('contact_id, date, summary').order('date', { ascending: false }),
      ])
      if (cancelled) return

      const map: LatestByContact = new Map()
      for (const row of (interactionsRes.data ?? []) as { contact_id: string; date: string; summary: string }[]) {
        if (!map.has(row.contact_id)) {
          map.set(row.contact_id, { date: row.date, summary: row.summary })
        }
      }
      setContacts((contactsRes.data ?? []) as Contact[])
      setLatest(map)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const groups = useMemo(() => {
    const filtered = contacts.filter(c => category === 'All' || c.category === category)

    const compare = (a: Contact, b: Contact) => {
      if (sortMode === 'priority') {
        const ap = a.priority ? PRIORITY_ORDER[a.priority] : 99
        const bp = b.priority ? PRIORITY_ORDER[b.priority] : 99
        if (ap !== bp) return ap - bp
      }
      return a.name.localeCompare(b.name)
    }

    const byTouch: Record<'Direct' | 'Indirect' | 'Unclassified', Contact[]> = {
      Direct: [],
      Indirect: [],
      Unclassified: [],
    }
    for (const c of filtered) {
      const key: 'Direct' | 'Indirect' | 'Unclassified' = c.touch_type ?? 'Unclassified'
      byTouch[key].push(c)
    }
    for (const k of Object.keys(byTouch) as (keyof typeof byTouch)[]) {
      byTouch[k].sort(compare)
    }
    return byTouch
  }, [contacts, category, sortMode])

  const total = groups.Direct.length + groups.Indirect.length + groups.Unclassified.length
  const priorityCounts = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0, None: 0 }
    for (const c of contacts) {
      if (category !== 'All' && c.category !== category) continue
      if (c.priority) counts[c.priority]++
      else counts.None++
    }
    return counts
  }, [contacts, category])

  const categoryOptions: (ContactCategory | 'All')[] = ['All', ...allCategories(contacts)]

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Controls — hidden when printing */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">Printable Report</p>
          <h1 className="text-2xl font-bold">Master List</h1>
          <p className="text-sm text-text-muted mt-1">Grouped by touch type, sorted {sortMode === 'alpha' ? 'A–Z' : 'by priority then A–Z'}.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="print:hidden flex flex-col sm:flex-row sm:items-center gap-3">
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
        <div className="flex gap-1">
          <button
            onClick={() => setSortMode('alpha')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sortMode === 'alpha' ? 'bg-gold text-black' : 'bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated'
            }`}
          >
            A–Z
          </button>
          <button
            onClick={() => setSortMode('priority')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sortMode === 'priority' ? 'bg-gold text-black' : 'bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated'
            }`}
          >
            Priority
          </button>
        </div>
      </div>

      {/* The printable sheet */}
      <div className="print-sheet bg-white text-slate-900 rounded-xl p-6 sm:p-10 shadow-lg print:shadow-none print:rounded-none print:p-0">
        <header className="border-b-2 border-slate-900 pb-4 mb-6">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-600">Baseline Analytics, Inc.</p>
          <h2 className="text-2xl sm:text-3xl font-bold mt-1">Master List of Funding Sources In Progress</h2>
          <p className="text-xs text-slate-600 mt-2">
            Last Updated: {today} &nbsp;|&nbsp; Confidential — Internal Use Only
          </p>
        </header>

        <section className="mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-2">Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <SummaryStat label="Total" value={total} />
            <SummaryStat label="Direct" value={groups.Direct.length} />
            <SummaryStat label="Indirect" value={groups.Indirect.length} />
            <SummaryStat label="High Priority" value={priorityCounts.High} />
            <SummaryStat label="Medium Priority" value={priorityCounts.Medium} />
          </div>
        </section>

        <TouchSection
          letter="A"
          title="Direct Touch"
          blurb="Baseline Analytics has engaged these sources directly."
          rows={groups.Direct}
          latest={latest}
        />
        <TouchSection
          letter="B"
          title="Indirect — Through Someone"
          blurb="Sources being cultivated through a warm intermediary or referral."
          rows={groups.Indirect}
          latest={latest}
        />
        {groups.Unclassified.length > 0 && (
          <TouchSection
            letter="C"
            title="Unclassified"
            blurb="Contacts without an assigned touch type. Edit the contact to classify."
            rows={groups.Unclassified}
            latest={latest}
          />
        )}

        <footer className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-600">
          This document is confidential and intended for internal use only. Update after each material interaction with a funding source.
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          nav, .print\\:hidden { display: none !important; }
          html, body { background: white !important; color: black !important; }
          main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          .print-sheet { box-shadow: none !important; padding: 0 !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          h2, h3, h4 { page-break-after: avoid; }
        }
      `}</style>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-slate-300 rounded-md px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xl font-bold font-[family-name:var(--font-mono-space)]">{value}</p>
    </div>
  )
}

function TouchSection({
  letter,
  title,
  blurb,
  rows,
  latest,
}: {
  letter: string
  title: string
  blurb: string
  rows: Contact[]
  latest: LatestByContact
}) {
  return (
    <section className="mb-8 break-inside-avoid">
      <h3 className="text-lg font-bold mb-1">
        ({letter}) {title}
      </h3>
      <p className="text-sm text-slate-600 mb-3 italic">{blurb}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded p-4">No contacts in this section.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <Th>Priority</Th>
                <Th>Name / Organization</Th>
                <Th>Relationship Owner</Th>
                <Th>Last Contact</Th>
                <Th className="w-[45%]">Status &amp; Noteworthy Topics</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const li = latest.get(c.id)
                const status = [li?.summary, c.notes].filter(Boolean).join(' — ') || '—'
                return (
                  <tr key={c.id} className="border-t border-slate-200 align-top">
                    <Td>
                      <PriorityBadge priority={c.priority} />
                    </Td>
                    <Td>
                      <div className="font-semibold">{c.name}</div>
                      {(c.organization || c.role) && (
                        <div className="text-xs text-slate-600">
                          {[c.role, c.organization].filter(Boolean).join(', ')}
                        </div>
                      )}
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">{c.category}</div>
                    </Td>
                    <Td>{c.relationship_owner ?? '—'}</Td>
                    <Td className="whitespace-nowrap">{formatDate(li?.date ?? null)}</Td>
                    <Td>{status}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left text-[11px] font-semibold uppercase tracking-wider text-slate-700 px-3 py-2 border-b border-slate-300 ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>
}

function PriorityBadge({ priority }: { priority: Priority | null }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${priorityBadgeClass(priority)}`}>
      {priority ?? '—'}
    </span>
  )
}
