'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import type { BrainEdge, BrainNode, BrainNodeType, Contact } from '@/types'
import {
  CLUSTERS,
  clusterForNode,
  clusterTagFor,
  visibleTags,
  type ClusterId,
} from './clusters'
import Sidebar from './Sidebar'
import DetailPanel from './DetailPanel'
import EdgeModal from './EdgeModal'
import type { BrainGraphHandle, GraphLink, GraphNode } from './BrainGraph'

const BrainGraph = dynamic(() => import('./BrainGraph'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
      Loading graph…
    </div>
  ),
})

// Form types ------------------------------------------------------------------

const ALL_TYPES: BrainNodeType[] = [
  'person', 'company', 'strategy', 'decision', 'research',
  'idea', 'event', 'technology', 'term', 'milestone',
]

const TYPE_LABEL: Record<BrainNodeType, string> = {
  person: 'Person',
  company: 'Company',
  strategy: 'Strategy',
  decision: 'Decision',
  research: 'Research',
  idea: 'Idea',
  event: 'Event',
  technology: 'Technology',
  term: 'Term',
  milestone: 'Milestone',
}

interface NodeForm {
  type: BrainNodeType
  title: string
  body: string
  tags: string // comma-separated, excludes cluster: tag
  cluster: ClusterId
}

const emptyForm: NodeForm = { type: 'idea', title: '', body: '', tags: '', cluster: 'other' }

// Detect Baseline team people (used for color in graph).
function isTeamNode(n: BrainNode): boolean {
  const tags = (n.tags ?? []).map(t => t.toLowerCase())
  return tags.includes('baseline') || tags.includes('team')
}

// =============================================================================

export default function BrainPage() {
  const [nodes, setNodes] = useState<BrainNode[]>([])
  const [edges, setEdges] = useState<BrainEdge[]>([])
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'name' | 'organization' | 'role'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedCluster, setFocusedCluster] = useState<ClusterId | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [edgeOpen, setEdgeOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState<NodeForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const graphRef = useRef<BrainGraphHandle>(null)

  // ----- Data load -----------------------------------------------------------

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [nRes, eRes, cRes] = await Promise.all([
      supabase.from('brain_nodes').select('*').order('updated_at', { ascending: false }),
      supabase.from('brain_edges').select('*'),
      supabase.from('contacts').select('id, name, organization, role'),
    ])
    if (nRes.error) { setError(nRes.error.message); setLoading(false); return }
    if (eRes.error) { setError(eRes.error.message); setLoading(false); return }
    if (cRes.error) { setError(cRes.error.message); setLoading(false); return }
    setNodes((nRes.data ?? []) as BrainNode[])
    setEdges((eRes.data ?? []) as BrainEdge[])
    setContacts((cRes.data ?? []) as Pick<Contact, 'id' | 'name' | 'organization' | 'role'>[])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-side fetch on mount
    fetchAll()
  }, [fetchAll])

  // ----- Derived data --------------------------------------------------------

  const graphData = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {
    const degree = new Map<string, number>()
    for (const e of edges) {
      degree.set(e.source_node_id, (degree.get(e.source_node_id) ?? 0) + 1)
      degree.set(e.target_node_id, (degree.get(e.target_node_id) ?? 0) + 1)
    }
    const nodeIds = new Set(nodes.map(n => n.id))
    const gNodes: GraphNode[] = nodes.map(n => ({
      id: n.id,
      title: n.title,
      type: n.type,
      cluster: clusterForNode(n),
      isTeam: isTeamNode(n),
      tags: n.tags ?? [],
      degree: degree.get(n.id) ?? 0,
    }))
    const gLinks: GraphLink[] = edges
      .filter(e => nodeIds.has(e.source_node_id) && nodeIds.has(e.target_node_id))
      .map(e => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        relationship: e.relationship,
        strength: e.strength,
      }))
    return { nodes: gNodes, links: gLinks }
  }, [nodes, edges])

  const clusterCounts = useMemo(() => {
    const counts: Record<ClusterId, number> = { mlb: 0, investors: 0, iab: 0, technology: 0, strategy: 0, other: 0 }
    for (const n of nodes) counts[clusterForNode(n)]++
    return counts
  }, [nodes])

  const recentNodes = useMemo(() => [...nodes].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5), [nodes])

  const selected = useMemo(() => nodes.find(n => n.id === selectedId) ?? null, [nodes, selectedId])

  const connections = useMemo(() => {
    if (!selected) return []
    const byId = new Map(nodes.map(n => [n.id, n]))
    const out: Array<{ edge: BrainEdge; other: BrainNode; direction: 'out' | 'in' }> = []
    for (const e of edges) {
      if (e.source_node_id === selected.id) {
        const other = byId.get(e.target_node_id); if (other) out.push({ edge: e, other, direction: 'out' })
      } else if (e.target_node_id === selected.id) {
        const other = byId.get(e.source_node_id); if (other) out.push({ edge: e, other, direction: 'in' })
      }
    }
    return out
  }, [selected, edges, nodes])

  const selectedContactMatch = useMemo(() => {
    if (!selected || selected.type !== 'person') return null
    const lower = selected.title.toLowerCase()
    return contacts.find(c => c.name?.toLowerCase() === lower)
      ?? contacts.find(c => c.name?.toLowerCase().includes(lower))
      ?? null
  }, [selected, contacts])

  // ----- Handlers ------------------------------------------------------------

  const handleSelectNode = useCallback((id: string) => {
    setSelectedId(id)
    setMobileSidebarOpen(false)
    setTimeout(() => graphRef.current?.zoomToNode(id), 50)
  }, [])

  const handleClusterClick = useCallback((id: ClusterId) => {
    setFocusedCluster(prev => (prev === id ? null : id))
    setMobileSidebarOpen(false)
    setTimeout(() => {
      if (focusedCluster === id) graphRef.current?.zoomToFit()
      else graphRef.current?.zoomToCluster(id)
    }, 50)
  }, [focusedCluster])

  const openAdd = () => {
    setForm(emptyForm)
    setFormError(null)
    setAddOpen(true)
  }

  const openEdit = () => {
    if (!selected) return
    setForm({
      type: selected.type,
      title: selected.title,
      body: selected.body ?? '',
      tags: visibleTags(selected.tags).join(', '),
      cluster: clusterForNode(selected),
    })
    setFormError(null)
    setEditOpen(true)
  }

  const parseTags = (s: string): string[] => s.split(',').map(t => t.trim()).filter(Boolean)

  const buildSavePayload = (f: NodeForm) => {
    const cleanTags = parseTags(f.tags).filter(t => !t.toLowerCase().startsWith('cluster:'))
    return {
      type: f.type,
      title: f.title.trim(),
      body: f.body.trim() ? f.body.trim() : null,
      tags: [...cleanTags, clusterTagFor(f.cluster)],
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setFormError('Title is required'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('brain_nodes')
      .insert({ ...buildSavePayload(form), source: 'manual' })
      .select('*')
      .single()
    setSaving(false)
    if (err || !data) { setFormError(err?.message ?? 'Failed to create'); return }
    const created = data as BrainNode
    setNodes(prev => [created, ...prev])
    setAddOpen(false)
    setSelectedId(created.id)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (!form.title.trim()) { setFormError('Title is required'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('brain_nodes')
      .update(buildSavePayload(form))
      .eq('id', selected.id)
      .select('*')
      .single()
    setSaving(false)
    if (err || !data) { setFormError(err?.message ?? 'Failed to update'); return }
    setNodes(prev => prev.map(n => n.id === selected.id ? (data as BrainNode) : n))
    setEditOpen(false)
  }

  const handleDelete = async () => {
    if (!selected) return
    const id = selected.id
    const prevNodes = nodes
    const prevEdges = edges
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.source_node_id !== id && e.target_node_id !== id))
    setSelectedId(null)
    setConfirmDelete(false)
    const { error: err } = await supabase.from('brain_nodes').delete().eq('id', id)
    if (err) {
      setNodes(prevNodes)
      setEdges(prevEdges)
      setActionError(err.message)
    }
  }

  const handleEdgeCreated = (edge: BrainEdge) => {
    setEdges(prev => [...prev, edge])
  }

  // ----- Render --------------------------------------------------------------

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-text-muted">Loading…</div>
  }
  if (error) {
    return <div className="flex items-center justify-center h-64 text-danger text-sm">Failed to load: {error}</div>
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 flex h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] min-h-0 bg-black">
      {/* Mobile sidebar drawer + backdrop */}
      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div
        className={`md:relative md:flex md:w-[280px] md:shrink-0 fixed top-[3.5rem] sm:top-16 left-0 bottom-0 z-50 w-[280px] transition-transform duration-200 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <Sidebar
          search={search}
          onSearchChange={setSearch}
          clusterCounts={clusterCounts}
          focusedCluster={focusedCluster}
          onClusterClick={handleClusterClick}
          recentNodes={recentNodes}
          onSelectNode={handleSelectNode}
          onAddNode={openAdd}
          totalNodes={nodes.length}
          totalEdges={edges.length}
        />
      </div>

      {/* Center: graph */}
      <main className="flex-1 relative min-w-0">
        {/* Mobile sidebar toggle */}
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden absolute z-20 top-3 left-3 w-9 h-9 rounded-lg bg-dark-card/90 backdrop-blur border border-border text-text-secondary flex items-center justify-center"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>

        {/* Focus chip */}
        {focusedCluster && (
          <div className="absolute z-20 top-3 right-3 sm:right-[396px] flex items-center gap-2 px-2.5 py-1 rounded-full bg-dark-card/90 backdrop-blur border border-border text-xs text-text-secondary">
            Focusing <span className="text-text-primary font-medium">{CLUSTERS.find(c => c.id === focusedCluster)?.label}</span>
            <button
              type="button"
              onClick={() => { setFocusedCluster(null); graphRef.current?.zoomToFit() }}
              className="text-text-muted hover:text-text-primary"
              aria-label="Clear focus"
            >
              ×
            </button>
          </div>
        )}

        {/* Empty state */}
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 brain-dot-bg">
            <p className="text-text-secondary text-base">No knowledge captured yet.</p>
            <p className="text-text-muted text-sm mt-1">Add a node or chat with the Copilot to populate the graph.</p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors"
            >
              + Add Your First Node
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 brain-dot-bg">
            <BrainGraph
              ref={graphRef}
              nodes={graphData.nodes}
              links={graphData.links}
              search={search}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              selectedId={selectedId}
              focusedCluster={focusedCluster}
              onNodeClick={(n) => setSelectedId(n.id)}
              onBackgroundClick={() => setSelectedId(null)}
            />
          </div>
        )}

        {actionError && (
          <div className="absolute z-20 bottom-4 left-1/2 -translate-x-1/2 bg-danger-dim border border-danger/30 rounded-lg px-4 py-2 text-sm text-danger flex items-center gap-3">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-xs underline">dismiss</button>
          </div>
        )}

        {selected && (
          <DetailPanel
            node={selected}
            connections={connections}
            contactMatch={selectedContactMatch}
            onClose={() => setSelectedId(null)}
            onSelectNode={handleSelectNode}
            onEdit={openEdit}
            onDelete={() => setConfirmDelete(true)}
            onAddEdge={() => setEdgeOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Node">
        <NodeFormFields form={form} setForm={setForm} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} saving={saving} error={formError} submitLabel="Create" />
      </Modal>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Node">
        <NodeFormFields form={form} setForm={setForm} onSubmit={handleEdit} onCancel={() => setEditOpen(false)} saving={saving} error={formError} submitLabel="Save" />
      </Modal>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Node?">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will permanently delete <span className="text-text-primary font-medium">{selected?.title}</span> and any edges connected to it. This can&apos;t be undone.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <button onClick={() => setConfirmDelete(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface transition-colors">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-danger text-white hover:bg-red-600 transition-colors">Delete</button>
          </div>
        </div>
      </Modal>
      {selected && (
        <EdgeModal
          open={edgeOpen}
          onClose={() => setEdgeOpen(false)}
          sourceNode={selected}
          allNodes={nodes}
          onCreated={handleEdgeCreated}
        />
      )}
    </div>
  )
}

// =============================================================================

interface FormProps {
  form: NodeForm
  setForm: (f: NodeForm) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  error: string | null
  submitLabel: string
}

function NodeFormFields({ form, setForm, onSubmit, onCancel, saving, error, submitLabel }: FormProps) {
  const inputClass = 'w-full bg-dark-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors'
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
          <select className={inputClass} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as BrainNodeType })}>
            {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Cluster</label>
          <select className={inputClass} value={form.cluster} onChange={e => setForm({ ...form, cluster: e.target.value as ClusterId })}>
            {CLUSTERS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
        <input className={inputClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What is this node?" autoFocus />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Body</label>
        <textarea rows={5} className={inputClass} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Longer description or context" />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Tags (comma-separated)</label>
        <input className={inputClass} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="strategy, mlb, partnerships" />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-50">{saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  )
}
