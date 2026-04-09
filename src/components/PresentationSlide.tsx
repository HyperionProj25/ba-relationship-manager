'use client'

import { cadenceColor, cadenceLabel } from '@/lib/cadence'
import type { Contact, Interaction } from '@/types'

interface PresentationSlideProps {
  contact: Contact
  interactions: Interaction[]
  followUps: Interaction[]
  cadenceDays: number
}

const statusColor: Record<string, string> = {
  Pending: 'bg-gold-dim text-gold',
  Done: 'bg-success-dim text-success',
  Overdue: 'bg-danger-dim text-danger',
}

export default function PresentationSlide({ contact, interactions, followUps, cadenceDays }: PresentationSlideProps) {
  const color = cadenceColor(cadenceDays)
  const label = cadenceLabel(cadenceDays)
  const today = new Date().toISOString().split('T')[0]

  const getEffectiveStatus = (i: Interaction) => {
    if (i.follow_up_needed && i.status === 'Pending' && i.follow_up_date && i.follow_up_date < today) return 'Overdue'
    return i.status
  }

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-6 sm:px-10 pt-6 sm:pt-10 pb-4 sm:pb-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-sm font-medium" style={{ color }}>{label}</span>
              <span className="inline-block px-2.5 py-0.5 rounded text-xs bg-surface text-text-secondary">{contact.category}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold truncate">{contact.name}</h2>
            {(contact.organization || contact.role) && (
              <p className="text-base sm:text-lg text-text-secondary mt-1">
                {contact.organization}{contact.organization && contact.role ? ' — ' : ''}{contact.role}
              </p>
            )}
          </div>
        </div>

        {/* Contact details row */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-text-secondary">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="hover:text-gold transition-colors">{contact.email}</a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="hover:text-gold transition-colors">{contact.phone}</a>
          )}
          {contact.linkedin && (
            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">LinkedIn</a>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 sm:px-10 py-4 sm:py-6 space-y-6 overflow-y-auto">
        {/* Pending follow-ups */}
        {followUps.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gold uppercase tracking-widest mb-3">Pending Follow-Ups</h3>
            <div className="space-y-2">
              {followUps.map(fu => {
                const effStatus = getEffectiveStatus(fu)
                const isOverdue = effStatus === 'Overdue'
                return (
                  <div key={fu.id} className={`rounded-lg border p-3 sm:p-4 ${isOverdue ? 'border-danger/40 bg-danger-dim' : 'border-border bg-dark-card'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium self-start ${statusColor[effStatus] ?? ''}`}>
                        {effStatus}
                      </span>
                      {fu.follow_up_date && (
                        <span className={`text-xs ${isOverdue ? 'text-danger font-medium' : 'text-text-muted'}`}>
                          Due: {formatDate(fu.follow_up_date)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-1">{fu.follow_up_action || fu.summary}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent interactions */}
        <div>
          <h3 className="text-xs font-medium text-gold uppercase tracking-widest mb-3">
            Recent Interactions {interactions.length > 0 && `(${interactions.length})`}
          </h3>
          {interactions.length === 0 ? (
            <p className="text-sm text-text-muted italic">No interactions logged yet</p>
          ) : (
            <div className="space-y-2">
              {interactions.slice(0, 5).map(i => (
                <div key={i.id} className="rounded-lg border border-border bg-dark-card p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                    <span className="text-xs text-text-muted">{formatDate(i.date)}</span>
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary self-start">{i.type}</span>
                  </div>
                  <p className="text-sm font-medium">{i.summary}</p>
                  {i.details && <p className="text-xs text-text-muted mt-1 line-clamp-2">{i.details}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {contact.notes && (
          <div>
            <h3 className="text-xs font-medium text-gold uppercase tracking-widest mb-3">Notes</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
