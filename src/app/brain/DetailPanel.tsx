'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { BrainEdge, BrainNode, BrainNodeType, Contact, Interaction, Task } from '@/types'
import { CLUSTER_BY_ID, clusterForNode, visibleTags, type ClusterId } from './clusters'

interface Connection {
  edge: BrainEdge
  other: BrainNode
  direction: 'out' | 'in'
}

interface Props {
  node: BrainNode
  connections: Connection[]
  contactMatch: Pick<Contact, 'id' | 'name' | 'organization' | 'role'> | null
  onClose: () => void
  onSelectNode: (id: string) => void
  onEdit: () => void
  onDelete: () => void
  onAddEdge: () => void
}

const TYPE_COLORS: Record<BrainNodeType, string> = {
  person: '#4A90D9',
  company: '#3DA5D9',
  strategy: '#7ED321',
  decision: '#D0021B',
  research: '#9013FE',
  idea: '#F8E71C',
  event: '#50E3C2',
  technology: '#E8E8E8',
  term: '#BD10E0',
  milestone: '#FF6B35',
}

const STAKEHOLDER_TYPES: ReadonlySet<BrainNodeType> = new Set<BrainNodeType>(['strategy', 'decision'])

export default function DetailPanel({
  node,
  connections,
  contactMatch,
  onClose,
  onSelectNode,
  onEdit,
  onDelete,
  onAddEdge,
}: Props) {
  const cluster: ClusterId = clusterForNode(node)
  const clusterMeta = CLUSTER_BY_ID[cluster]
  const typeColor = TYPE_COLORS[node.type] ?? '#888'
  const tags = visibleTags(node.tags)
  const isPerson = node.type === 'person'
  const showStakeholders = STAKEHOLDER_TYPES.has(node.type)

  const stakeholders = showStakeholders
    ? connections.map(c => c.other).filter(o => o.type === 'person')
    : []

  return (
    <aside
      className="absolute z-30 inset-x-0 bottom-0 sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 w-full sm:w-[380px] max-h-[70vh] sm:max-h-none bg-dark-card border-t sm:border-t-0 sm:border-l border-border flex flex-col shadow-2xl"
      role="dialog"
      aria-label="Node details"
    >
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center py-1.5">
        <span className="w-10 h-1 rounded-full bg-border-light" />
      </div>

      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <Badge color={typeColor}>{node.type}</Badge>
            <Badge color={clusterMeta.color} subtle>{clusterMeta.label}</Badge>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mr-1 -mt-1 w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-dark-elevated transition-colors"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <h2 className="text-lg font-semibold mt-2 break-words leading-tight">{node.title}</h2>
        {contactMatch && (
          <p className="text-xs text-text-muted mt-1">
            {contactMatch.role ?? '—'}
            {contactMatch.organization ? ` · ${contactMatch.organization}` : ''}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-5">
        {isPerson ? (
          <PersonSections node={node} contactMatch={contactMatch} />
        ) : (
          <BodySection node={node} />
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-dark-elevated border border-border text-[11px] text-text-secondary">
                {t}
              </span>
            ))}
          </div>
        )}

        {showStakeholders && stakeholders.length > 0 && (
          <div>
            <SectionLabel>Stakeholders</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {stakeholders.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectNode(p.id)}
                  className="px-2 py-1 rounded-md bg-dark-elevated border border-border text-xs text-text-secondary hover:text-text-primary hover:border-gold/40 transition-colors"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <SectionLabel>Connections ({connections.length})</SectionLabel>
            <button
              type="button"
              onClick={onAddEdge}
              className="text-[11px] text-gold hover:text-gold-hover transition-colors"
            >
              + Link to…
            </button>
          </div>
          {connections.length === 0 ? (
            <p className="text-xs text-text-muted">No connections yet.</p>
          ) : (
            <ul className="space-y-1">
              {connections.map(({ edge, other, direction }) => (
                <li key={edge.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNode(other.id)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-dark-elevated transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[other.type] ?? '#888' }}
                    />
                    <span className="text-[10px] text-text-muted shrink-0">
                      {direction === 'out' ? '→' : '←'} {edge.relationship}
                    </span>
                    <span className="text-sm text-text-primary truncate flex-1">{other.title}</span>
                    <Badge color={TYPE_COLORS[other.type] ?? '#888'} small>{other.type}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-[11px] text-text-muted space-y-0.5 pt-3 border-t border-border">
          <div>Created: {new Date(node.created_at).toLocaleDateString('en-CA')}</div>
          <div>Updated: {new Date(node.updated_at).toLocaleDateString('en-CA')}</div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex gap-2 px-4 py-3 border-t border-border bg-dark-card/95">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-dark-elevated text-text-primary hover:bg-surface border border-border transition-colors"
        >
          <PencilIcon /> Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger-dim border border-danger/30 transition-colors"
        >
          <TrashIcon /> Delete
        </button>
      </div>
    </aside>
  )
}

// --- Body sections -----------------------------------------------------------

function BodySection({ node }: { node: BrainNode }) {
  if (!node.body) return <p className="text-xs text-text-muted italic">No description.</p>
  return <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{node.body}</p>
}

interface PersonExtras {
  lastInteraction: Interaction | null
  openFollowUps: Interaction[]
  openTasks: Task[]
  loading: boolean
  error: string | null
}

function PersonSections({
  node,
  contactMatch,
}: {
  node: BrainNode
  contactMatch: Pick<Contact, 'id' | 'name' | 'organization' | 'role'> | null
}) {
  const [extras, setExtras] = useState<PersonExtras>({
    lastInteraction: null,
    openFollowUps: [],
    openTasks: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!contactMatch) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- triggers lazy fetch when contact match changes
    setExtras(e => ({ ...e, loading: true, error: null }))

    const run = async () => {
      const [lastRes, followRes, tasksRes] = await Promise.all([
        supabase
          .from('interactions')
          .select('*')
          .eq('contact_id', contactMatch.id)
          .order('date', { ascending: false })
          .limit(1),
        supabase
          .from('interactions')
          .select('*')
          .eq('contact_id', contactMatch.id)
          .eq('follow_up_needed', true)
          .eq('status', 'Pending')
          .order('follow_up_date', { ascending: true }),
        supabase
          .from('tasks')
          .select('*')
          .eq('contact_id', contactMatch.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return

      const firstError = lastRes.error || followRes.error || tasksRes.error
      if (firstError) {
        setExtras({ lastInteraction: null, openFollowUps: [], openTasks: [], loading: false, error: firstError.message })
        return
      }
      setExtras({
        lastInteraction: (lastRes.data?.[0] as Interaction) ?? null,
        openFollowUps: (followRes.data ?? []) as Interaction[],
        openTasks: (tasksRes.data ?? []) as Task[],
        loading: false,
        error: null,
      })
    }
    run()
    return () => { cancelled = true }
  }, [contactMatch])

  if (!contactMatch) {
    return (
      <>
        <BodySection node={node} />
        <p className="text-[11px] text-text-muted italic">No matching CRM contact.</p>
      </>
    )
  }

  return (
    <>
      <div>
        <SectionLabel>Role &amp; Organization</SectionLabel>
        <p className="text-sm text-text-primary">
          {contactMatch.role ?? '—'}
          {contactMatch.organization ? ` at ${contactMatch.organization}` : ''}
        </p>
      </div>

      {node.body && <BodySection node={node} />}

      <div>
        <SectionLabel>Last interaction</SectionLabel>
        {extras.loading ? (
          <p className="text-xs text-text-muted">Loading…</p>
        ) : extras.error ? (
          <p className="text-xs text-danger">{extras.error}</p>
        ) : extras.lastInteraction ? (
          <div className="text-sm text-text-secondary">
            <p className="text-text-primary">{extras.lastInteraction.summary}</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {extras.lastInteraction.type} · {extras.lastInteraction.date}
            </p>
          </div>
        ) : (
          <p className="text-xs text-text-muted">No interactions logged.</p>
        )}
      </div>

      {extras.openFollowUps.length > 0 && (
        <div>
          <SectionLabel>Open follow-ups ({extras.openFollowUps.length})</SectionLabel>
          <ul className="space-y-1">
            {extras.openFollowUps.map(f => (
              <li key={f.id} className="text-sm text-text-secondary">
                <span className="text-text-primary">{f.follow_up_action ?? f.summary}</span>
                {f.follow_up_date && <span className="text-[11px] text-text-muted ml-1.5">· by {f.follow_up_date}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {extras.openTasks.length > 0 && (
        <div>
          <SectionLabel>Open tasks ({extras.openTasks.length})</SectionLabel>
          <ul className="space-y-1">
            {extras.openTasks.map(t => (
              <li key={t.id} className="text-sm text-text-secondary">
                <span className="text-text-primary">{t.title}</span>
                {t.due_date && <span className="text-[11px] text-text-muted ml-1.5">· due {t.due_date}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href={`/contacts/${contactMatch.id}`}
        className="inline-flex items-center gap-1 text-sm text-gold hover:text-gold-hover transition-colors"
      >
        View in CRM →
      </Link>
    </>
  )
}

// --- Tiny presentational pieces ---------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1.5">{children}</p>
}

function Badge({ color, subtle, small, children }: { color: string; subtle?: boolean; small?: boolean; children: React.ReactNode }) {
  const size = small ? 'text-[9px] px-1.5 py-px' : 'text-[10px] px-2 py-0.5'
  return (
    <span
      className={`inline-flex items-center gap-1 ${size} rounded font-medium uppercase tracking-wide`}
      style={{
        backgroundColor: subtle ? `${color}1a` : `${color}26`,
        color: color,
      }}
    >
      {!small && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </span>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3l3 3-9 9H5v-3l9-9z" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11" />
    </svg>
  )
}
