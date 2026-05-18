'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import type { BrainEdge, BrainNode, BrainNodeType } from '@/types'
import type { GraphLink, GraphNode } from './BrainGraph'

const BrainGraph = dynamic(() => import('./BrainGraph'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
      Loading graph...
    </div>
  ),
})

const TYPE_COLORS: Record<BrainNodeType, string> = {
  person: '#F5A623',
  company: '#4A90D9',
  strategy: '#7ED321',
  decision: '#D0021B',
  research: '#9013FE',
  idea: '#F8E71C',
  event: '#50E3C2',
  technology: '#E8E8E8',
  term: '#BD10E0',
  milestone: '#FF6B35',
}

const ALL_TYPES: BrainNodeType[] = [
  'person', 'company', 'strategy', 'decision', 'research',
  'idea', 'event', 'technology', 'term', 'milestone',
]

const TYPE_LABEL: Record<BrainNodeType, string> = {
  person: 'People',
  company: 'Companies',
  strategy: 'Strategy',
  decision: 'Decisions',
  research: 'Research',
  idea: 'Ideas',
  event: 'Events',
  technology: 'Tech',
  term: 'Terms',
  milestone: 'Milestones',
}

type EditForm = {
  type: BrainNodeType
  title: string
  body: string
  tags: string // comma-separated in form, parsed on save
}

const emptyForm: EditForm = { type: 'idea', title: '', body: '', tags: '' }

export default function BrainPage() {
  const [nodes, setNodes] = useState<BrainNode[]>([])
  const [edges, setEdges] = useState<BrainEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [hiddenTypes, setHiddenTypes] = useState<Set<BrainNodeType>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState<EditForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [nRes, eRes] = await Promise.all([
      supabase.from('brain_nodes').select('*').order('updated_at', { ascending: false }),
      supabase.from('brain_edges').select('*'),
    ])
    if (nRes.error) { setError(nRes.error.message); setLoading(false); return }
    if (eRes.error) { setError(eRes.error.message); setLoading(false); return }
    setNodes((nRes.data ?? []) as BrainNode[])
    setEdges((eRes.data ?? []) as BrainEdge[])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-side fetch on mount
    fetchAll()
  }, [fetchAll])

  // Build degree-annotated graph data.
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
      body: n.body,
      tags: n.tags ?? [],
      contact_id: n.contact_id,
      created_at: n.created_at,
      updated_at: n.updated_at,
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

  const selected = useMemo(() => nodes.find(n => n.id === selectedId) ?? null, [nodes, selectedId])
  const connections = useMemo(() => {
    if (!selected) return [] as Array<{ edge: BrainEdge; other: BrainNode; direction: 'out' | 'in' }>
    const byId = new Map(nodes.map(n => [n.id, n]))
    const out: Array<{ edge: BrainEdge; other: BrainNode; direction: 'out' | 'in' }> = []
    for (const e of edges) {
      if (e.source_node_id === selected.id) {
        const other = byId.get(e.target_node_id)
        if (other) out.push({ edge: e, other, direction: 'out' })
      } else if (e.target_node_id === selected.id) {
        const other = byId.get(e.source_node_id)
        if (other) out.push({ edge: e, other, direction: 'in' })
      }
    }
    return out
  }, [selected, edges, nodes])

  const stats = `${nodes.length} nodes · ${edges.length} connections`

  const toggleType = (t: BrainNodeType) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

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
      tags: (selected.tags ?? []).join(', '),
    })
    setFormError(null)
    setEditOpen(true)
  }

  const parseTags = (s: string): string[] => s.split(',').map(t => t.trim()).filter(Boolean)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) { setFormError('Title is required'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('brain_nodes')
      .insert({
        type: form.type,
        title,
        body: form.body.trim() ? form.body.trim() : null,
        tags: parseTags(form.tags),
        source: 'manual',
      })
      .select('*')
      .single()
    setSaving(false)
    if (err || !data) { setFormError(err?.message ?? 'Failed to create'); return }
    setNodes(prev => [data as BrainNode, ...prev])
    setAddOpen(false)
    setSelectedId((data as BrainNode).id)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const title = form.title.trim()
    if (!title) { setFormError('Title is required'); return }
    setSaving(true)
    const update = {
      type: form.type,
      title,
      body: form.body.trim() ? form.body.trim() : null,
      tags: parseTags(form.tags),
    }
    const { data, error: err } = await supabase
      .from('brain_nodes')
      .update(update)
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>
  }
  if (error) {
    return <div className="flex items-center justify-center h-64 text-danger text-sm">Failed to load: {error}</div>
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8rem)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">Second Brain</p>
          <h1 className="text-2xl font-bold">Knowledge Graph</h1>
          <p className="text-sm text-text-muted mt-1">{stats}</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors"
        >
          + Add Node
        </button>
      </div>

      {actionError && (
        <div className="mt-3 bg-danger-dim border border-danger/30 rounded-lg px-4 py-2 text-sm text-danger flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs underline">dismiss</button>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search nodes by title or tag..."
          className="w-full sm:w-72 bg-dark-card border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors"
        />
        <div className="flex flex-wrap gap-1.5">
          {ALL_TYPES.map(t => {
            const hidden = hiddenTypes.has(t)
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  hidden
                    ? 'bg-transparent border-border text-text-muted opacity-50'
                    : 'bg-dark-card border-border-light text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[t] }} />
                {TYPE_LABEL[t]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex-1 relative bg-black border border-border rounded-xl overflow-hidden min-h-0">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="text-text-secondary text-base">No knowledge captured yet.</p>
            <p className="text-text-muted text-sm mt-1">Add a node, or chat with the Copilot to populate the graph.</p>
            <button
              onClick={openAdd}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors"
            >
              + Add Your First Node
            </button>
          </div>
        ) : (
          <BrainGraph
            nodes={graphData.nodes}
            links={graphData.links}
            colorByType={TYPE_COLORS}
            search={search}
            hiddenTypes={hiddenTypes}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            selectedId={selectedId}
            onNodeClick={(n) => setSelectedId(n.id)}
          />
        )}

        {selected && (
          <DetailPanel
            node={selected}
            connections={connections}
            onClose={() => setSelectedId(null)}
            onSelectNode={(id) => setSelectedId(id)}
            onEdit={openEdit}
            onDelete={() => setConfirmDelete(true)}
            colorByType={TYPE_COLORS}
          />
        )}
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Node">
        <NodeForm
          form={form}
          setForm={setForm}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
          saving={saving}
          error={formError}
          submitLabel="Create"
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Node">
        <NodeForm
          form={form}
          setForm={setForm}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
          saving={saving}
          error={formError}
          submitLabel="Save"
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Node?">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will permanently delete <span className="text-text-primary font-medium">{selected?.title}</span> and any
            edges connected to it. This can&apos;t be undone.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-danger text-white hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface DetailPanelProps {
  node: BrainNode
  connections: Array<{ edge: BrainEdge; other: BrainNode; direction: 'out' | 'in' }>
  onClose: () => void
  onSelectNode: (id: string) => void
  onEdit: () => void
  onDelete: () => void
  colorByType: Record<BrainNodeType, string>
}

function DetailPanel({ node, connections, onClose, onSelectNode, onEdit, onDelete, colorByType }: DetailPanelProps) {
  const created = new Date(node.created_at).toLocaleDateString('en-CA')
  const updated = new Date(node.updated_at).toLocaleDateString('en-CA')
  return (
    <aside
      className="absolute z-20 right-0 bottom-0 sm:top-0 w-full sm:w-96 max-h-[65%] sm:max-h-full bg-dark-card border-t sm:border-t-0 sm:border-l border-border flex flex-col"
      role="dialog"
      aria-label="Node details"
    >
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
              style={{ backgroundColor: `${colorByType[node.type]}20`, color: colorByType[node.type] }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorByType[node.type] }} />
              {node.type}
            </span>
          </div>
          <h3 className="text-base font-semibold mt-1.5 break-words">{node.title}</h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          className="shrink-0 w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {node.body && (
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{node.body}</p>
        )}

        {node.tags && node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {node.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-dark-elevated border border-border text-[11px] text-text-secondary">
                {tag}
              </span>
            ))}
          </div>
        )}

        {node.contact_id && (
          <div>
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest mb-1">CRM Contact</p>
            <Link
              href={`/contacts/${node.contact_id}`}
              className="text-sm text-gold hover:text-gold-hover transition-colors"
            >
              View contact →
            </Link>
          </div>
        )}

        <div>
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest mb-2">
            Connections ({connections.length})
          </p>
          {connections.length === 0 ? (
            <p className="text-xs text-text-muted">No connections yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {connections.map(({ edge, other, direction }) => (
                <li key={edge.id}>
                  <button
                    onClick={() => onSelectNode(other.id)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dark-elevated transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorByType[other.type] }}
                    />
                    <span className="text-xs text-text-muted">
                      {direction === 'out' ? '→' : '←'} {edge.relationship}
                    </span>
                    <span className="text-sm text-text-primary truncate">{other.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-[11px] text-text-muted space-y-0.5 pt-2 border-t border-border">
          <div>Created: {created}</div>
          <div>Updated: {updated}</div>
        </div>
      </div>

      <div className="flex gap-2 px-4 py-3 border-t border-border">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-dark-elevated text-text-primary hover:bg-surface border border-border transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger-dim border border-danger/30 transition-colors"
        >
          Delete
        </button>
      </div>
    </aside>
  )
}

interface NodeFormProps {
  form: EditForm
  setForm: (f: EditForm) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  error: string | null
  submitLabel: string
}

function NodeForm({ form, setForm, onSubmit, onCancel, saving, error, submitLabel }: NodeFormProps) {
  const inputClass = 'w-full bg-dark-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors'
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
        <select
          className={inputClass}
          value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value as BrainNodeType })}
        >
          {ALL_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_LABEL[t]} ({t})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
        <input
          className={inputClass}
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="What is this node?"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Body</label>
        <textarea
          rows={5}
          className={inputClass}
          value={form.body}
          onChange={e => setForm({ ...form, body: e.target.value })}
          placeholder="Longer description or context"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Tags (comma-separated)</label>
        <input
          className={inputClass}
          value={form.tags}
          onChange={e => setForm({ ...form, tags: e.target.value })}
          placeholder="strategy, mlb, partnerships"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
