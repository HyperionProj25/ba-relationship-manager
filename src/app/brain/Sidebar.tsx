'use client'

import type { BrainNode } from '@/types'
import { CLUSTERS, type ClusterId } from './clusters'

interface Props {
  search: string
  onSearchChange: (s: string) => void
  clusterCounts: Record<ClusterId, number>
  focusedCluster: ClusterId | null
  onClusterClick: (id: ClusterId) => void
  recentNodes: BrainNode[]
  onSelectNode: (id: string) => void
  onAddNode: () => void
  totalNodes: number
  totalEdges: number
}

export default function Sidebar({
  search,
  onSearchChange,
  clusterCounts,
  focusedCluster,
  onClusterClick,
  recentNodes,
  onSelectNode,
  onAddNode,
  totalNodes,
  totalEdges,
}: Props) {
  return (
    <aside className="flex flex-col h-full w-full bg-dark-card border-r border-border min-h-0">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <p className="text-[10px] font-medium text-gold uppercase tracking-widest">Second Brain</p>
        <h2 className="text-base font-semibold mt-0.5">Knowledge Graph</h2>
        <p className="text-[11px] text-text-muted mt-1">{totalNodes} nodes · {totalEdges} connections</p>
      </div>

      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search nodes, tags…"
            className="w-full bg-dark-elevated border border-border rounded-lg pl-8 pr-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors"
          />
          <svg viewBox="0 0 20 20" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l3 3" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <Section title="Clusters">
          <ul className="space-y-0.5">
            {CLUSTERS.map(c => {
              const active = focusedCluster === c.id
              const count = clusterCounts[c.id] ?? 0
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onClusterClick(c.id)}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors group ${
                      active ? 'bg-dark-elevated' : 'hover:bg-dark-elevated/60'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.color, boxShadow: active ? `0 0 0 3px ${c.color}33` : undefined }}
                    />
                    <span className={`text-sm flex-1 truncate ${active ? 'text-text-primary font-medium' : 'text-text-secondary group-hover:text-text-primary'}`}>
                      {c.label}
                    </span>
                    <span className="text-[11px] text-text-muted tabular-nums">{count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>

        <Section title="Recent activity">
          {recentNodes.length === 0 ? (
            <p className="px-2 py-1 text-[12px] text-text-muted">Nothing yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {recentNodes.map(n => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNode(n.id)}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-dark-elevated/60 transition-colors"
                  >
                    <p className="text-sm text-text-primary truncate">{n.title}</p>
                    <p className="text-[11px] text-text-muted mt-0.5 capitalize">{n.type} · {relativeTime(n.updated_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="px-3 py-3 border-t border-border">
        <button
          type="button"
          onClick={onAddNode}
          className="w-full px-3 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors"
        >
          + Add Node
        </button>
      </div>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-3">
      <p className="px-2 mb-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(mo / 12)}y ago`
}
