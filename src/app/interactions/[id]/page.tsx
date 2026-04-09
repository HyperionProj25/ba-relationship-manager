'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import InteractionForm from '@/components/InteractionForm'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import type { Interaction, Contact } from '@/types'

export default function InteractionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [interaction, setInteraction] = useState<Interaction | null>(null)
  const [contact, setContact] = useState<Pick<Contact, 'id' | 'name' | 'organization'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    const { data } = await supabase
      .from('interactions')
      .select('*, contacts(id, name, organization)')
      .eq('id', id)
      .single()
    if (data) {
      const { contacts: c, ...rest } = data as unknown as Interaction & { contacts: Pick<Contact, 'id' | 'name' | 'organization'> }
      setInteraction(rest)
      setContact(c)
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- client-side Supabase fetch on param change
  useEffect(() => { fetchData(); }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('interactions').delete().eq('id', id)
    router.push('/interactions')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>
  if (!interaction) return <div className="flex items-center justify-center h-64 text-text-muted">Interaction not found</div>

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = interaction.follow_up_needed && interaction.status === 'Pending' && interaction.follow_up_date && interaction.follow_up_date < today
  const effectiveStatus = isOverdue ? 'Overdue' : interaction.status

  const statusColor = {
    Pending: 'bg-gold-dim text-gold',
    Done: 'bg-success-dim text-success',
    Overdue: 'bg-danger-dim text-danger',
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link href="/interactions" className="hover:text-text-secondary transition-colors">Interactions</Link>
        <span>/</span>
        <span className="text-text-primary truncate">{interaction.summary}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{interaction.summary}</h1>
          {contact && (
            <p className="text-text-secondary mt-1">
              with <Link href={`/contacts/${contact.id}`} className="text-gold hover:text-gold-hover transition-colors">{contact.name}</Link>
              {contact.organization ? ` (${contact.organization})` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={() => setShowEditModal(true)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-dark-elevated text-text-primary border border-border hover:bg-surface transition-colors">
            Edit
          </button>
          <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-danger-dim text-danger border border-danger/30 hover:bg-danger hover:text-white transition-colors">
            Delete
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="bg-dark-card border border-border rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Date</p>
            <p className="text-sm">{interaction.date}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Type</p>
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary">{interaction.type}</span>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Contact</p>
            {contact && <Link href={`/contacts/${contact.id}`} className="text-sm text-gold hover:text-gold-hover transition-colors">{contact.name}</Link>}
          </div>
        </div>

        {interaction.details && (
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Details</p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{interaction.details}</p>
          </div>
        )}

        {interaction.follow_up_needed && (
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Follow-Up</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor[effectiveStatus as keyof typeof statusColor]}`}>
                  {effectiveStatus}
                </span>
              </div>
              {interaction.follow_up_date && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Due Date</p>
                  <p className={`text-sm ${isOverdue ? 'text-danger font-medium' : ''}`}>{interaction.follow_up_date}</p>
                </div>
              )}
              {interaction.follow_up_action && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Action</p>
                  <p className="text-sm text-text-secondary">{interaction.follow_up_action}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Interaction" wide>
        <InteractionForm interaction={interaction} onSaved={() => { setShowEditModal(false); fetchData() }} onCancel={() => setShowEditModal(false)} />
      </Modal>
      <DeleteConfirmModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} name={interaction.summary} loading={deleting} />
    </div>
  )
}
