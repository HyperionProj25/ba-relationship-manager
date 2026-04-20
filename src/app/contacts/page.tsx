'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import ContactForm from '@/components/ContactForm'
import { allCategories } from '@/lib/categories'
import type { Contact, ContactCategory } from '@/types'

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
  const [formDirty, setFormDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkNewCategory, setBulkNewCategory] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const guardClose = () => !formDirty || window.confirm('Discard unsaved changes?')
  const closeModal = () => { if (guardClose()) setShowAddModal(false) }

  const toggleSelected = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
    setBulkCategory('')
    setBulkNewCategory('')
    setBulkError(null)
  }

  const applyBulkCategory = async () => {
    const target = bulkCategory === '__add__' ? bulkNewCategory.trim() : bulkCategory
    if (!target) { setBulkError('Choose or enter a category'); return }
    if (selected.size === 0) { setBulkError('No contacts selected'); return }
    setBulkSaving(true)
    setBulkError(null)
    const { error: err } = await supabase
      .from('contacts')
      .update({ category: target })
      .in('id', Array.from(selected))
    setBulkSaving(false)
    if (err) { setBulkError(err.message); return }
    exitSelectMode()
    fetchContacts()
  }

  const fetchContacts = async (ignore?: { current: boolean }) => {
    const { data, error: err } = await supabase.from('contacts').select('*').order('name')
    if (ignore?.current) return
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setContacts(data ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-side Supabase fetch on mount
  useEffect(() => { fetchContacts(); }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const knownCategories = allCategories(contacts)
  const categoryOptions: (ContactCategory | 'All')[] = ['All', ...knownCategories]

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
  if (error) return <div className="flex items-center justify-center h-64 text-danger text-sm">Failed to load: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">Directory</p>
          <h1 className="text-2xl font-bold">Contacts</h1>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => { if (selectMode) exitSelectMode(); else setSelectMode(true) }}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              selectMode
                ? 'bg-surface text-text-primary border border-border'
                : 'bg-dark-elevated text-text-primary border border-border hover:bg-surface'
            }`}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors">
            + Add Contact
          </button>
        </div>
      </div>

      {selectMode && (
        <div className="bg-dark-card border border-gold/40 rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <button
              type="button"
              onClick={() => {
                if (selected.size === filtered.length) setSelected(new Set())
                else setSelected(new Set(filtered.map(c => c.id)))
              }}
              className="text-xs text-gold hover:text-gold-hover transition-colors"
            >
              {selected.size === filtered.length ? 'Clear' : `Select all ${filtered.length} visible`}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              className="bg-dark-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
              value={bulkCategory}
              onChange={e => setBulkCategory(e.target.value)}
            >
              <option value="" disabled>Set category to…</option>
              {knownCategories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__add__">+ Add new category…</option>
            </select>
            {bulkCategory === '__add__' && (
              <input
                autoFocus
                className="bg-dark-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                placeholder="New category name"
                value={bulkNewCategory}
                onChange={e => setBulkNewCategory(e.target.value)}
              />
            )}
            <button
              type="button"
              disabled={bulkSaving || selected.size === 0 || !bulkCategory || (bulkCategory === '__add__' && !bulkNewCategory.trim())}
              onClick={applyBulkCategory}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkSaving ? 'Saving…' : 'Apply'}
            </button>
          </div>
          {bulkError && <p className="text-danger text-xs sm:w-full">{bulkError}</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 bg-dark-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
          placeholder="Search by name or organization..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1 flex-wrap">
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
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-dark-card border border-border rounded-xl px-6 py-12 text-center text-text-muted text-sm">No contacts found</div>
        ) : filtered.map(contact => {
          const isChecked = selected.has(contact.id)
          const cardInner = (
            <>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-gold">{contact.name}</p>
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary shrink-0">{contact.category}</span>
              </div>
              {contact.organization && <p className="text-xs text-text-secondary">{contact.organization}{contact.role ? ` — ${contact.role}` : ''}</p>}
              {contact.email && <p className="text-xs text-text-muted mt-1">{contact.email}</p>}
            </>
          )
          if (selectMode) {
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => toggleSelected(contact.id)}
                className={`w-full text-left flex items-start gap-3 bg-dark-card border rounded-xl p-4 transition-colors ${
                  isChecked ? 'border-gold bg-dark-elevated' : 'border-border hover:bg-dark-elevated'
                }`}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={isChecked}
                  className="mt-1 rounded border-border accent-gold"
                />
                <div className="flex-1 min-w-0">{cardInner}</div>
              </button>
            )
          }
          return (
            <Link key={contact.id} href={`/contacts/${contact.id}`} className="block bg-dark-card border border-border rounded-xl p-4 hover:bg-dark-elevated active:bg-dark-elevated transition-colors">
              {cardInner}
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
                {selectMode && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-border accent-gold"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={() => {
                        if (selected.size === filtered.length) setSelected(new Set())
                        else setSelected(new Set(filtered.map(c => c.id)))
                      }}
                    />
                  </th>
                )}
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
                <tr><td colSpan={selectMode ? 7 : 6} className="px-4 py-8 text-center text-text-muted text-sm">No contacts found</td></tr>
              ) : filtered.map(contact => {
                const isChecked = selected.has(contact.id)
                const onRowClick = selectMode ? () => toggleSelected(contact.id) : undefined
                return (
                  <tr
                    key={contact.id}
                    className={`transition-colors ${selectMode ? 'cursor-pointer' : ''} ${isChecked ? 'bg-dark-elevated' : 'hover:bg-dark-elevated'}`}
                    onClick={onRowClick}
                  >
                    {selectMode && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          readOnly
                          checked={isChecked}
                          className="rounded border-border accent-gold"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {selectMode ? (
                        <span className="text-sm font-medium text-gold">{contact.name}</span>
                      ) : (
                        <Link href={`/contacts/${contact.id}`} className="text-sm font-medium text-gold hover:text-gold-hover transition-colors">
                          {contact.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{contact.organization ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{contact.role ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary">{contact.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{contact.email ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">{new Date(contact.created_at).toLocaleDateString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} canClose={guardClose} title="Add Contact" wide>
        <ContactForm onSaved={() => { setFormDirty(false); setShowAddModal(false); fetchContacts() }} onCancel={closeModal} onDirtyChange={setFormDirty} />
      </Modal>
    </div>
  )
}
