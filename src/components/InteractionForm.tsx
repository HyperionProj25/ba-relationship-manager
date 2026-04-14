'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Contact, Interaction, InteractionType, FollowUpStatus } from '@/types'

const TYPES: InteractionType[] = ['Call', 'Email', 'Meeting', 'Text', 'LinkedIn', 'In-Person']
const STATUSES: FollowUpStatus[] = ['Pending', 'Done', 'Overdue']

interface InteractionFormProps {
  interaction?: Interaction | null
  preselectedContactId?: string
  onSaved: () => void
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}

export default function InteractionForm({ interaction, preselectedContactId, onSaved, onCancel, onDirtyChange }: InteractionFormProps) {
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'name'>[]>([])
  const [search, setSearch] = useState('')
  const initial = {
    contact_id: interaction?.contact_id ?? preselectedContactId ?? '',
    summary: interaction?.summary ?? '',
    date: interaction?.date ?? new Date().toLocaleDateString('en-CA'),
    type: interaction?.type ?? 'Meeting' as InteractionType,
    details: interaction?.details ?? '',
    follow_up_needed: interaction?.follow_up_needed ?? false,
    follow_up_date: interaction?.follow_up_date ?? '',
    follow_up_action: interaction?.follow_up_action ?? '',
    status: interaction?.status ?? 'Pending' as FollowUpStatus,
  }
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)
    onDirtyChange?.(dirty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  useEffect(() => {
    supabase.from('contacts').select('id, name').order('name').then(({ data }) => {
      if (data) setContacts(data)
    })
  }, [])

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contact_id) { setError('Please select a contact'); return }
    if (!form.summary.trim()) { setError('Summary is required'); return }
    if (!form.date) { setError('Date is required'); return }
    if (form.follow_up_needed && !form.follow_up_date) { setError('Follow-up date is required when a follow-up is needed'); return }
    setSaving(true)
    setError('')

    const payload = {
      contact_id: form.contact_id,
      summary: form.summary.trim(),
      date: form.date,
      type: form.type,
      details: form.details.trim() || null,
      follow_up_needed: form.follow_up_needed,
      follow_up_date: form.follow_up_needed && form.follow_up_date ? form.follow_up_date : null,
      follow_up_action: form.follow_up_needed && form.follow_up_action.trim() ? form.follow_up_action.trim() : null,
      status: form.follow_up_needed ? form.status : 'Pending',
    }

    const query = interaction
      ? supabase.from('interactions').update(payload).eq('id', interaction.id)
      : supabase.from('interactions').insert(payload)

    const { error: err } = await query
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const inputClass = 'w-full bg-dark-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Contact *</label>
        {preselectedContactId ? (
          <p className="text-sm text-text-primary">{contacts.find(c => c.id === preselectedContactId)?.name ?? 'Loading...'}</p>
        ) : (
          <>
            <input
              className={inputClass + ' mb-1'}
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className={inputClass} value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}>
              <option value="">Select a contact</option>
              {filteredContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Summary *</label>
        <input className={inputClass} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="One-line description" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Date *</label>
          <input type="date" className={inputClass} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Type *</label>
          <select className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as InteractionType }))}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Details</label>
        <textarea rows={3} className={inputClass} value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="Full notes..." />
      </div>

      <div className="border border-border rounded-lg p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.follow_up_needed}
            onChange={e => setForm(f => ({ ...f, follow_up_needed: e.target.checked }))}
            className="rounded border-border accent-gold"
          />
          <span className="text-sm font-medium">Follow-up needed</span>
        </label>

        {form.follow_up_needed && (
          <div className="space-y-3 pl-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Follow-up Date</label>
                <input type="date" className={inputClass} value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                <select className={inputClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as FollowUpStatus }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Follow-up Action</label>
              <input className={inputClass} value={form.follow_up_action} onChange={e => setForm(f => ({ ...f, follow_up_action: e.target.value }))} placeholder="What needs to happen" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : interaction ? 'Update Interaction' : 'Log Interaction'}
        </button>
      </div>
    </form>
  )
}
