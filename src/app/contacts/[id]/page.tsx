'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import ContactForm from '@/components/ContactForm'
import InteractionForm from '@/components/InteractionForm'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import type { Contact, Interaction } from '@/types'

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    const [contactRes, interactionsRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase.from('interactions').select('*').eq('contact_id', id).order('date', { ascending: false }),
    ])
    setContact(contactRes.data)
    setInteractions(interactionsRes.data ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- client-side Supabase fetch on param change
  useEffect(() => { fetchData(); }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('contacts').delete().eq('id', id)
    router.push('/contacts')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>
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

      {/* Interaction History */}
      <div className="bg-dark-card border border-border rounded-xl">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Interaction History ({interactions.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {interactions.length === 0 ? (
            <p className="px-6 py-8 text-center text-text-muted text-sm">No interactions logged yet</p>
          ) : interactions.map(i => (
            <Link key={i.id} href={`/interactions/${i.id}`} className="block px-6 py-4 hover:bg-dark-elevated transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{i.summary}</p>
                  {i.details && <p className="text-sm text-text-secondary mt-1 line-clamp-2">{i.details}</p>}
                  {i.follow_up_needed && (
                    <p className={`text-xs mt-1 ${i.status === 'Overdue' || (i.status === 'Pending' && i.follow_up_date && i.follow_up_date < new Date().toISOString().split('T')[0]) ? 'text-danger' : 'text-text-muted'}`}>
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
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Contact" wide>
        <ContactForm contact={contact} onSaved={() => { setShowEditModal(false); fetchData() }} onCancel={() => setShowEditModal(false)} />
      </Modal>
      <Modal open={showInteractionModal} onClose={() => setShowInteractionModal(false)} title="Log Interaction" wide>
        <InteractionForm preselectedContactId={id} onSaved={() => { setShowInteractionModal(false); fetchData() }} onCancel={() => setShowInteractionModal(false)} />
      </Modal>
      <DeleteConfirmModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} name={contact.name} loading={deleting} />
    </div>
  )
}
