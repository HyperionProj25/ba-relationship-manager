'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Contact, ContactCategory, TouchType, Priority } from '@/types'

const CATEGORIES: ContactCategory[] = ['MLB', 'Investor', 'IAB', 'Partner', 'Vendor', 'University', 'Other']
const TOUCH_TYPES: TouchType[] = ['Direct', 'Indirect']
const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']

interface ContactFormProps {
  contact?: Contact | null
  onSaved: () => void
  onCancel: () => void
}

export default function ContactForm({ contact, onSaved, onCancel }: ContactFormProps) {
  const [form, setForm] = useState({
    name: contact?.name ?? '',
    organization: contact?.organization ?? '',
    role: contact?.role ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    category: contact?.category ?? 'Other' as ContactCategory,
    linkedin: contact?.linkedin ?? '',
    notes: contact?.notes ?? '',
    relationship_owner: contact?.relationship_owner ?? '',
    touch_type: contact?.touch_type ?? '',
    priority: contact?.priority ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      organization: form.organization.trim() || null,
      role: form.role.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      category: form.category,
      linkedin: form.linkedin.trim() || null,
      notes: form.notes.trim() || null,
      relationship_owner: form.relationship_owner.trim() || null,
      touch_type: (form.touch_type || null) as TouchType | null,
      priority: (form.priority || null) as Priority | null,
    }

    const query = contact
      ? supabase.from('contacts').update(payload).eq('id', contact.id)
      : supabase.from('contacts').insert(payload)

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
        <label className="block text-sm font-medium text-text-secondary mb-1">Name *</label>
        <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Organization</label>
          <input className={inputClass} value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} placeholder="Company, team, league" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Role</label>
          <input className={inputClass} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Title" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
          <input type="email" className={inputClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
          <input className={inputClass} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Category *</label>
          <select className={inputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ContactCategory }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Touch Type</label>
          <select className={inputClass} value={form.touch_type} onChange={e => setForm(f => ({ ...f, touch_type: e.target.value }))}>
            <option value="">—</option>
            {TOUCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Priority</label>
          <select className={inputClass} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="">—</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Relationship Owner</label>
        <input className={inputClass} value={form.relationship_owner} onChange={e => setForm(f => ({ ...f, relationship_owner: e.target.value }))} placeholder="e.g. Chase Spivey & Sheldon McClelland" />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">LinkedIn</label>
        <input className={inputClass} value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
        <textarea rows={3} className={inputClass} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Freeform notes..." />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
        </button>
      </div>
    </form>
  )
}
