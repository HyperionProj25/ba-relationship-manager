'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Contact, TaskPriority, TaskType } from '@/types'

const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'quick_todo', label: 'Quick' },
  { value: 'talk_about', label: 'Talk About' },
  { value: 'reach_out_now', label: 'Reach Out' },
]

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

interface TaskFormProps {
  onSaved: () => void
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
  preselectedContactId?: string
  preselectedType?: TaskType
  lockType?: boolean
}

export default function TaskForm({ onSaved, onCancel, onDirtyChange, preselectedContactId, preselectedType, lockType }: TaskFormProps) {
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'name'>[]>([])
  const [search, setSearch] = useState('')
  const initialType: TaskType = preselectedType ?? (preselectedContactId ? 'talk_about' : 'quick_todo')
  const initial = {
    type: initialType,
    title: '',
    priority: 'medium' as TaskPriority,
    contact_id: preselectedContactId ?? '',
    notes: '',
    due_date: '',
  }
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)
    onDirtyChange?.(dirty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  useEffect(() => {
    supabase.from('contacts').select('id, name').order('name').then(({ data }) => {
      if (data) setContacts(data)
    })
    // Focus title once Modal's focus trap has settled.
    const t = setTimeout(() => titleRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  const requiresContact = form.type === 'talk_about' || form.type === 'reach_out_now'
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    if (requiresContact && !form.contact_id) { setError('Pick a contact for this task type'); return }
    setSaving(true)
    setError('')

    const payload = {
      title: form.title.trim(),
      type: form.type,
      priority: form.priority,
      status: 'open' as const,
      contact_id: requiresContact ? form.contact_id : null,
      notes: form.notes.trim() ? form.notes.trim() : null,
      due_date: form.due_date ? form.due_date : null,
    }

    const { error: err } = await supabase.from('tasks').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const inputClass = 'w-full bg-dark-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      {/* Type pills */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Type</label>
        <div className="flex gap-2 flex-wrap">
          {TYPE_OPTIONS.map(opt => {
            const active = form.type === opt.value
            const disabled = !!lockType && form.type !== opt.value
            return (
              <button
                type="button"
                key={opt.value}
                disabled={disabled}
                onClick={() => setForm(f => ({
                  ...f,
                  type: opt.value,
                  contact_id: opt.value === 'quick_todo' ? '' : (preselectedContactId ?? f.contact_id),
                }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gold text-black'
                    : 'bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">What needs doing? *</label>
        <input
          ref={titleRef}
          className={inputClass}
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder={form.type === 'quick_todo' ? 'Send proposal, review numbers...' : form.type === 'talk_about' ? 'Pricing change, hire timeline...' : 'Call about demo, text re: invite...'}
        />
      </div>

      {/* Contact (talk/reach only) */}
      {requiresContact && (
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
              <select
                className={inputClass}
                value={form.contact_id}
                onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
              >
                <option value="">Select a contact</option>
                {filteredContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </>
          )}
        </div>
      )}

      {/* Priority + Due date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map(p => {
              const active = form.priority === p
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    active
                      ? 'bg-gold text-black'
                      : 'bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Due date</label>
          <input
            type="date"
            className={inputClass}
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
        <textarea
          rows={3}
          className={inputClass}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Optional context"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Task'}
        </button>
      </div>
    </form>
  )
}
