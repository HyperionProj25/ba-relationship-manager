'use client'

import Link from 'next/link'
import { cadenceColor, cadenceLabel } from '@/lib/cadence'
import type { ContactWithCadence } from '@/types'

interface CadenceCardProps {
  contact: ContactWithCadence
}

export default function CadenceCard({ contact }: CadenceCardProps) {
  const color = cadenceColor(contact.daysSinceLastInteraction)
  const label = cadenceLabel(contact.daysSinceLastInteraction)
  const hasInteraction = contact.lastInteractionDate !== null

  const formattedDate = hasInteraction
    ? new Date(contact.lastInteractionDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <Link
      href={`/contacts/${contact.id}`}
      className="block bg-dark-card border border-border rounded-xl p-4 hover:bg-dark-elevated transition-colors border-l-[3px]"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-block px-2 py-0.5 rounded text-xs bg-surface text-text-secondary">
          {contact.category}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium" style={{ color }}>{label}</span>
        </div>
      </div>

      <p className="text-sm font-medium text-text-primary truncate">{contact.name}</p>
      {contact.organization && (
        <p className="text-xs text-text-secondary truncate mt-0.5">{contact.organization}</p>
      )}

      <div className="mt-3 pt-2 border-t border-border">
        {hasInteraction ? (
          <p className="text-xs text-text-muted truncate">
            Last: {contact.lastInteractionType} on {formattedDate}
          </p>
        ) : (
          <p className="text-xs text-danger italic">No interactions yet</p>
        )}
      </div>
    </Link>
  )
}
