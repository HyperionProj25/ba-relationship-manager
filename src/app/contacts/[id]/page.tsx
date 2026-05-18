'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { todayLocal } from '@/lib/dates'
import Modal from '@/components/Modal'
import ContactForm from '@/components/ContactForm'
import InteractionForm from '@/components/InteractionForm'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import TaskForm from '@/components/TaskForm'
import { TASK_SAVED_EVENT } from '@/components/QuickCaptureFab'
import type { Contact, Interaction, Task } from '@/types'

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [agenda, setAgenda] = useState<Task[]>([])
  const [agendaError, setAgendaError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAgendaModal, setShowAgendaModal] = useState(false)
  const [editDirty, setEditDirty] = useState(false)
  const [interactionDirty, setInteractionDirty] = useState(false)
  const [agendaDirty, setAgendaDirty] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const guard = (dirty: boolean) => !dirty || window.confirm('Discard unsaved changes?')
  const closeEdit = () => { if (guard(editDirty)) setShowEditModal(false) }
  const closeInteraction = () => { if (guard(interactionDirty)) setShowInteractionModal(false) }
  const closeAgenda = () => { if (guard(agendaDirty)) { setAgendaDirty(false); setShowAgendaModal(false) } }

  const fetchAgenda = async () => {
    const { data, error: err } = await supabase
      .from('tasks')
      .select('*')
      .eq('contact_id', id)
      .eq('type', 'talk_about')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (err) { setAgendaError(err.message); return }
    setAgenda((data ?? []) as Task[])
  }

  const fetchData = async () => {
    const [contactRes, interactionsRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase.from('interactions').select('*').eq('contact_id', id).order('date', { ascending: false }),
      fetchAgenda(),
    ])
    if (contactRes.error && contactRes.error.code !== 'PGRST116') {
      setError(contactRes.error.message)
      setLoading(false)
      return
    }
    if (interactionsRes.error) {
      setError(interactionsRes.error.message)
      setLoading(false)
      return
    }
    setContact(contactRes.data)
    setInteractions(interactionsRes.data ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- client-side Supabase fetch on param change
  useEffect(() => { fetchData(); }, [id])

  useEffect(() => {
    const onSaved = () => { fetchAgenda() }
    window.addEventListener(TASK_SAVED_EVENT, onSaved)
    return () => window.removeEventListener(TASK_SAVED_EVENT, onSaved)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAgenda is stable per render and only id remount matters
  }, [id])

  const markAgendaDone = async (taskId: string) => {
    const prev = agenda
    setAgenda(items => items.filter(t => t.id !== taskId))
    const { error: err } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', taskId)
    if (err) {
      setAgenda(prev)
      setAgendaError(err.message)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const { error: err } = await supabase.from('contacts').delete().eq('id', id)
    if (err) {
      setDeleteError(err.message)
      setDeleting(false)
      return
    }
    router.push('/contacts')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>
  if (error) return <div className="flex items-center justify-center h-64 text-danger text-sm">Failed to load: {error}</div>
  if (!contact) return <div className="flex items-center justify-center h-64 text-text-muted">Contact not found</div>

  const fields = [
    { label: 'Organization', value: contact.organization },
    { label: 'Role', value: contact.role },
    { label: 'Email', value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    { label: 'Phone', value: contact.phone, href: contact.phone ? `tel:${contact.phone}` : undefined },
    { label: 'LinkedIn', value: contact.linkedin, href: contact.linkedin ?? undefined },
    { label: 'Category', value: contact.category },
    { label: 'Notes', value: contact.notes },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link href="/contacts" className="hover:text-text-secondary transition-colors">Contacts</Link>
        <span>/</span>
        <span className="text-text-primary">{contact.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{contact.name}</h1>
          {contact.organization && <p className="text-text-secondary mt-1">{contact.organization}{contact.role ? ` — ${contact.role}` : ''}</p>}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={() => setShowInteractionModal(true)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors">
            + Log Interaction
          </button>
          <button onClick={() => setShowEditModal(true)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-dark-elevated text-text-primary border border-border hover:bg-surface transition-colors">
            Edit
          </button>
          <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-danger-dim text-danger border border-danger/30 hover:bg-danger hover:text-white transition-colors">
            Delete
          </button>
        </div>
      </div>

      {/* Contact Details */}
      <div className="bg-dark-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.label}>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{f.label}</p>
              {f.href ? (
                <a href={f.href} target={f.label === 'LinkedIn' ? '_blank' : undefined} rel="noopener noreferrer" className="text-sm text-gold hover:text-gold-hover transition-colors">
                  {f.value}
                </a>
              ) : (
                <p className="text-sm text-text-primary whitespace-pre-wrap">{f.value || '—'}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Open Agenda (talk-about tasks) */}
      <div className="bg-dark-card border border-border rounded-xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
          <h2 className="font-semibold">Open Agenda ({agenda.length})</h2>
          <button
            onClick={() => setShowAgendaModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-elevated text-text-secondary border border-border hover:bg-surface hover:text-text-primary transition-colors"
          >
            + Add agenda item
          </button>
        </div>
        {agendaError && (
          <div className="mx-6 mt-3 bg-danger-dim border border-danger/30 rounded-lg px-3 py-2 text-xs text-danger flex items-center justify-between">
            <span>{agendaError}</span>
            <button onClick={() => setAgendaError(null)} className="underline">dismiss</button>
          </div>
        )}
        {agenda.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-text-muted">No open agenda items.</div>
        ) : (
          <ul className="divide-y divide-border">
            {agenda.map(t => (
              <li key={t.id} className="px-6 py-3 flex items-start gap-3">
                <button
                  onClick={() => markAgendaDone(t.id)}
                  aria-label="Mark agenda item discussed"
                  className="mt-0.5 shrink-0 w-5 h-5 rounded border border-text-muted hover:border-gold flex items-center justify-center transition-colors"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.notes && <p className="text-xs text-text-muted mt-1 whitespace-pre-line">{t.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Interaction History */}
      <div className="bg-dark-card border border-border rounded-xl">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Interaction History ({interactions.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {interactions.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-text-muted text-sm mb-3">No interactions yet.</p>
              <button onClick={() => setShowInteractionModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors">
                + Log first interaction
              </button>
            </div>
          ) : interactions.map(i => (
            <Link key={i.id} href={`/interactions/${i.id}`} className="block px-6 py-4 hover:bg-dark-elevated transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{i.summary}</p>
                  {i.details && <p className="text-sm text-text-secondary mt-1 line-clamp-2">{i.details}</p>}
                  {i.follow_up_needed && (
                    <p className={`text-xs mt-1 ${i.status === 'Overdue' || (i.status === 'Pending' && i.follow_up_date && i.follow_up_date < todayLocal()) ? 'text-danger' : 'text-text-muted'}`}>
                      Follow-up: {i.follow_up_action || 'Needed'} {i.follow_up_date ? `by ${i.follow_up_date}` : ''}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary">{i.type}</span>
                  <p className="text-xs text-text-muted mt-1">{i.date}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Modals */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} canClose={() => guard(editDirty)} title="Edit Contact" wide>
        <ContactForm contact={contact} onSaved={() => { setEditDirty(false); setShowEditModal(false); fetchData() }} onCancel={closeEdit} onDirtyChange={setEditDirty} />
      </Modal>
      <Modal open={showInteractionModal} onClose={() => setShowInteractionModal(false)} canClose={() => guard(interactionDirty)} title="Log Interaction" wide>
        <InteractionForm preselectedContactId={id} onSaved={() => { setInteractionDirty(false); setShowInteractionModal(false); fetchData() }} onCancel={closeInteraction} onDirtyChange={setInteractionDirty} />
      </Modal>
      <Modal open={showAgendaModal} onClose={() => setShowAgendaModal(false)} canClose={() => guard(agendaDirty)} title="New Agenda Item">
        <TaskForm
          preselectedContactId={id}
          preselectedType="talk_about"
          lockType
          onSaved={() => { setAgendaDirty(false); setShowAgendaModal(false); fetchAgenda() }}
          onCancel={closeAgenda}
          onDirtyChange={setAgendaDirty}
        />
      </Modal>
      <DeleteConfirmModal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteError(null) }} onConfirm={handleDelete} name={contact.name} loading={deleting} error={deleteError} />
    </div>
  )
}
