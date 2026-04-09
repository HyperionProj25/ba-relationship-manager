'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import ContactForm from '@/components/ContactForm'
import type { Contact, ContactCategory } from '@/types'

const CATEGORIES: (ContactCategory | 'All')[] = ['All', 'MLB', 'Investor', 'IAB', 'Partner', 'Vendor', 'University', 'Other']

type SortKey = 'name' | 'organization' | 'category' | 'created_at'

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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ContactCategory | 'All'>('All')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchContacts = async (ignore?: { current: boolean }) => {
    const { data } = await supabase.from('contacts').select('*').order('name')
    if (ignore?.current) return
    setContacts(data ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-side Supabase fetch on mount
  useEffect(() => { fetchContacts(); }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const filtered = contacts
    .filter(c => {
      const q = search.toLowerCase()
      const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.organization?.toLowerCase().includes(q) ?? false)
      const matchCategory = category === 'All' || c.category === category
      return matchSearch && matchCategory
    })
    .sort((a, b) => {
      const aVal = (a[sortKey] ?? '').toString().toLowerCase()
      const bVal = (b[sortKey] ?? '').toString().toLowerCase()
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">Directory</p>
          <h1 className="text-2xl font-bold">Contacts</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors">
          + Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 bg-dark-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
          placeholder="Search by name or organization..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1 flex-wrap">
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
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-dark-card border border-border rounded-xl px-6 py-12 text-center text-text-muted text-sm">No contacts found</div>
        ) : filtered.map(contact => (
          <Link key={contact.id} href={`/contacts/${contact.id}`} className="block bg-dark-card border border-border rounded-xl p-4 hover:bg-dark-elevated active:bg-dark-elevated transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-medium text-gold">{contact.name}</p>
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary shrink-0">{contact.category}</span>
            </div>
            {contact.organization && <p className="text-xs text-text-secondary">{contact.organization}{contact.role ? ` — ${contact.role}` : ''}</p>}
            {contact.email && <p className="text-xs text-text-muted mt-1">{contact.email}</p>}
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-dark-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-elevated">
              <tr>
                <SortHeader label="Name" field="name" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortHeader label="Organization" field="organization" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Role</th>
                <SortHeader label="Category" field="category" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Email</th>
                <SortHeader label="Added" field="created_at" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">No contacts found</td></tr>
              ) : filtered.map(contact => (
                <tr key={contact.id} className="hover:bg-dark-elevated transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${contact.id}`} className="text-sm font-medium text-gold hover:text-gold-hover transition-colors">
                      {contact.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{contact.organization ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{contact.role ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary">{contact.category}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{contact.email ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(contact.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Contact" wide>
        <ContactForm onSaved={() => { setShowAddModal(false); fetchContacts() }} onCancel={() => setShowAddModal(false)} />
      </Modal>
    </div>
  )
}
