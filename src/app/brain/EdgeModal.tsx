'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'
import type { BrainEdge, BrainNode } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  sourceNode: BrainNode
  allNodes: BrainNode[]
  onCreated: (edge: BrainEdge) => void
}

const RELATIONSHIP_SUGGESTIONS = [
  'works_at', 'advised_by', 'led_to', 'blocked_by', 'informed',
  'related_to', 'depends_on', 'competes_with', 'member_of', 'uses',
]

export default function EdgeModal({ open, onClose, sourceNode, allNodes, onCreated }: Props) {
  const [query, setQuery] = useState('')
  const [targetId, setTargetId] = useState<string | null>(null)
  const [relationship, setRelationship] = useState('related_to')
  const [strength, setStrength] = useState(5)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates = useMemo(() => {
    const lower = query.trim().toLowerCase()
    const list = allNodes.filter(n => n.id !== sourceNode.id)
    if (!lower) return list.slice(0, 8)
    return list
      .filter(n => n.title.toLowerCase().includes(lower) || n.tags.some(t => t.toLowerCase().includes(lower)))
      .slice(0, 12)
  }, [allNodes, sourceNode.id, query])

  const target = useMemo(() => allNodes.find(n => n.id === targetId) ?? null, [allNodes, targetId])

  const reset = () => {
    setQuery('')
    setTargetId(null)
    setRelationship('related_to')
    setStrength(5)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetId) { setError('Pick a target node.'); return }
    const rel = relationship.trim()
    if (!rel) { setError('Relationship label is required.'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('brain_edges')
      .insert({
        source_node_id: sourceNode.id,
        target_node_id: targetId,
        relationship: rel,
        strength,
      })
      .select('*')
      .single()
    setSaving(false)
    if (err || !data) {
      setError(err?.message ?? 'Failed to create connection.')
      return
    }
    onCreated(data as BrainEdge)
    reset()
    onClose()
  }

  const inputClass = 'w-full bg-dark-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors'

  return (
    <Modal open={open} onClose={handleClose} title={`Link "${sourceNode.title}" to…`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-danger text-sm">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Target node</label>
          {target ? (
            <div className="flex items-center justify-between gap-2 bg-dark-elevated border border-border rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-text-primary truncate">{target.title}</p>
                <p className="text-[11px] text-text-muted capitalize">{target.type}</p>
              </div>
              <button type="button" onClick={() => setTargetId(null)} className="text-xs text-text-muted hover:text-text-primary">
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                className={inputClass}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search nodes…"
                autoFocus
              />
              <ul className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-dark-elevated">
                {candidates.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-text-muted">No matches.</li>
                ) : candidates.map(c => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setTargetId(c.id)}
                      className="w-full text-left px-3 py-2 hover:bg-surface transition-colors"
                    >
                      <p className="text-sm text-text-primary truncate">{c.title}</p>
                      <p className="text-[11px] text-text-muted capitalize">{c.type}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Relationship</label>
          <input
            className={inputClass}
            value={relationship}
            onChange={e => setRelationship(e.target.value)}
            list="rel-suggestions"
            placeholder="e.g. advised_by"
          />
          <datalist id="rel-suggestions">
            {RELATIONSHIP_SUGGESTIONS.map(r => <option key={r} value={r} />)}
          </datalist>
          <div className="mt-2 flex flex-wrap gap-1">
            {RELATIONSHIP_SUGGESTIONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRelationship(r)}
                className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                  relationship === r ? 'bg-gold-dim border-gold/40 text-gold' : 'bg-dark-elevated border-border text-text-muted hover:text-text-secondary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Strength <span className="text-text-muted">({strength})</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={strength}
            onChange={e => setStrength(parseInt(e.target.value, 10))}
            className="w-full accent-[var(--color-gold)]"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create link'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
