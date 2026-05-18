import type { SupabaseClient } from '@supabase/supabase-js'
import { todayLocal } from './dates'

const FOLLOWUP_KEYWORDS = ['follow-up', 'follow up', 'overdue', 'due', 'pending']
const TASK_KEYWORDS = ['task', 'agenda', 'todo', 'to-do', 'to do', 'open items', 'my plate', "what's on my"]
const BRAIN_KEYWORDS = ['brain', 'graph', 'knowledge', 'what do we know', 'connections', 'remember', 'history of']
const DATE_KEYWORDS = ['today', 'yesterday', 'this week', 'last week', 'this month']

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function nameMatches(contactName: string, msg: string): boolean {
  const lower = contactName.toLowerCase()
  if (new RegExp(`\\b${escapeRegExp(lower)}\\b`).test(msg)) return true
  for (const tok of lower.split(/\s+/)) {
    if (tok.length < 3) continue
    if (new RegExp(`\\b${escapeRegExp(tok)}\\b`).test(msg)) return true
  }
  return false
}

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('en-CA')
}

type ContactLite = { id: string; name: string }
type ContactFull = { id: string; name: string; organization: string | null; role: string | null; category: string; notes: string | null }
type InteractionRow = { contact_id: string; summary: string; date: string; type: string; follow_up_needed: boolean; follow_up_date: string | null; follow_up_action: string | null; status: string }
type TaskRow = { id: string; title: string; type: string; priority: string; contact_id: string | null; due_date: string | null }
type BrainNodeRow = { id: string; type: string; title: string; body: string | null; tags: string[] | null }
type BrainEdgeRow = { source_node_id: string; target_node_id: string; relationship: string }

function clusterTag(tags: string[] | null | undefined): string | null {
  if (!tags) return null
  return tags.find(t => t.startsWith('cluster:')) ?? null
}

async function loadConnectionsFor(
  supabase: SupabaseClient,
  nodeIds: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (nodeIds.length === 0) return out
  const { data: edges } = await supabase
    .from('brain_edges')
    .select('source_node_id, target_node_id, relationship')
    .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
  const edgeRows = (edges ?? []) as BrainEdgeRow[]
  const otherIds = new Set<string>()
  for (const e of edgeRows) {
    if (!nodeIds.includes(e.source_node_id)) otherIds.add(e.source_node_id)
    if (!nodeIds.includes(e.target_node_id)) otherIds.add(e.target_node_id)
  }
  const allIds = Array.from(new Set([...nodeIds, ...otherIds]))
  const { data: nodes } = await supabase
    .from('brain_nodes')
    .select('id, title')
    .in('id', allIds)
  const titleMap = new Map<string, string>(
    ((nodes ?? []) as Array<{ id: string; title: string }>).map(n => [n.id, n.title]),
  )
  for (const e of edgeRows) {
    const addTo = (mine: string, other: string) => {
      if (!nodeIds.includes(mine)) return
      const arr = out.get(mine) ?? []
      const otherTitle = titleMap.get(other)
      if (otherTitle && !arr.includes(otherTitle)) arr.push(otherTitle)
      out.set(mine, arr)
    }
    addTo(e.source_node_id, e.target_node_id)
    addTo(e.target_node_id, e.source_node_id)
  }
  return out
}

function formatBrainLine(n: BrainNodeRow, connections: string[] | undefined): string {
  const cluster = clusterTag(n.tags)
  const clusterStr = cluster ? ` (${cluster})` : ''
  const conn = connections && connections.length > 0
    ? ` — connected to: ${connections.slice(0, 5).join(', ')}${connections.length > 5 ? '…' : ''}`
    : ''
  return `- [${n.type}] "${n.title}"${clusterStr}${conn}`
}

/**
 * Builds a compact context block tailored to what the user is actually asking about.
 * Replaces the old "load everything every time" approach.
 */
export async function getRelevantContext(
  userMessage: string,
  supabase: SupabaseClient,
): Promise<string> {
  const today = todayLocal()
  const msg = userMessage.toLowerCase()
  const sections: string[] = [`Today: ${today}`]

  // 1) Name matching — pull all contacts as id+name only, match in JS with word boundaries.
  const allContactsRes = await supabase.from('contacts').select('id, name').order('name')
  const allContacts = (allContactsRes.data ?? []) as ContactLite[]
  const matched = allContacts.filter(c => nameMatches(c.name, msg))

  if (matched.length > 0) {
    const ids = matched.map(c => c.id)
    const [fullRes, interRes, tasksRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('id, name, organization, role, category, notes')
        .in('id', ids),
      supabase
        .from('interactions')
        .select('contact_id, summary, date, type, follow_up_needed, follow_up_date, follow_up_action, status')
        .in('contact_id', ids)
        .order('date', { ascending: false }),
      supabase
        .from('tasks')
        .select('id, title, type, priority, contact_id, due_date')
        .eq('status', 'open')
        .in('contact_id', ids),
    ])
    const fulls = (fullRes.data ?? []) as ContactFull[]
    const inters = (interRes.data ?? []) as InteractionRow[]
    const ctasks = (tasksRes.data ?? []) as TaskRow[]

    sections.push('')
    sections.push(`MENTIONED CONTACTS (${fulls.length}):`)
    for (const c of fulls) {
      sections.push(`- ${c.name} | ${c.organization ?? '—'} | ${c.role ?? '—'} | ${c.category}`)
      if (c.notes) sections.push(`  notes: ${c.notes.length > 280 ? c.notes.slice(0, 280) + '…' : c.notes}`)
      const last3 = inters.filter(i => i.contact_id === c.id).slice(0, 3)
      for (const i of last3) {
        sections.push(`  ${i.date} ${i.type}: ${i.summary}`)
        if (i.follow_up_needed && i.status !== 'Done') {
          const due = i.follow_up_date ? `, due ${i.follow_up_date}` : ''
          sections.push(`    open follow-up: ${i.follow_up_action ?? '(unspecified)'}${due}`)
        }
      }
      const myTasks = ctasks.filter(t => t.contact_id === c.id)
      for (const t of myTasks) {
        const due = t.due_date ? ` (due ${t.due_date})` : ''
        sections.push(`  open task [${t.type}, ${t.priority}]: ${t.title}${due}`)
      }
    }

    // Pull any brain nodes whose title matches the mentioned contacts so the copilot
    // sees what's already captured before creating duplicates.
    const orExpr = fulls.map(c => `title.ilike.%${c.name.replace(/[,()]/g, '')}%`).join(',')
    if (orExpr) {
      const { data: brainMatches } = await supabase
        .from('brain_nodes')
        .select('id, type, title, body, tags')
        .or(orExpr)
        .limit(10)
      const nodes = (brainMatches ?? []) as BrainNodeRow[]
      if (nodes.length > 0) {
        const connMap = await loadConnectionsFor(supabase, nodes.map(n => n.id))
        sections.push('')
        sections.push(`RELATED BRAIN NODES (${nodes.length}):`)
        for (const n of nodes) sections.push(formatBrainLine(n, connMap.get(n.id)))
      }
    }
  }

  // 2) Keyword routing.
  let loadedFollowUps = false
  if (FOLLOWUP_KEYWORDS.some(k => msg.includes(k))) {
    const { data } = await supabase
      .from('interactions')
      .select('contact_id, summary, date, follow_up_date, follow_up_action, status')
      .eq('follow_up_needed', true)
      .neq('status', 'Done')
      .order('follow_up_date', { ascending: true, nullsFirst: false })
    const rows = (data ?? []) as Array<Pick<InteractionRow, 'contact_id' | 'summary' | 'date' | 'follow_up_date' | 'follow_up_action' | 'status'>>
    if (rows.length > 0) {
      const cmap = await contactNameMap(supabase, rows.map(r => r.contact_id))
      sections.push('')
      sections.push(`OPEN FOLLOW-UPS (${rows.length}):`)
      for (const r of rows) {
        const due = r.follow_up_date ? `due ${r.follow_up_date}` : 'no due date'
        sections.push(`- ${cmap.get(r.contact_id) ?? 'Unknown'}: ${r.follow_up_action ?? r.summary} (${due})`)
      }
      loadedFollowUps = true
    }
  }

  if (TASK_KEYWORDS.some(k => msg.includes(k))) {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, type, priority, contact_id, due_date')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as TaskRow[]
    if (rows.length > 0) {
      const cmap = await contactNameMap(
        supabase,
        rows.map(r => r.contact_id).filter((id): id is string => !!id),
      )
      sections.push('')
      sections.push(`OPEN TASKS (${rows.length}):`)
      for (const t of rows) {
        const who = t.contact_id ? ` [${cmap.get(t.contact_id) ?? '?'}]` : ''
        const due = t.due_date ? ` due ${t.due_date}` : ''
        sections.push(`- [${t.type}] ${t.title}${who} (${t.priority})${due}`)
      }
    }
  }

  if (BRAIN_KEYWORDS.some(k => msg.includes(k))) {
    const { data } = await supabase
      .from('brain_nodes')
      .select('id, type, title, body, tags')
      .order('updated_at', { ascending: false })
      .limit(20)
    const nodes = (data ?? []) as BrainNodeRow[]
    if (nodes.length > 0) {
      const connMap = await loadConnectionsFor(supabase, nodes.map(n => n.id))
      sections.push('')
      sections.push(`BRAIN GRAPH (${nodes.length} most recent):`)
      for (const n of nodes) sections.push(formatBrainLine(n, connMap.get(n.id)))
    }
  }

  // Date references → recent interactions (skip if we already loaded follow-ups, which usually covers the same intent).
  if (!loadedFollowUps && DATE_KEYWORDS.some(k => msg.includes(k))) {
    const span = msg.includes('last week') || msg.includes('this week') || msg.includes('this month') ? 14 : 3
    const sinceStr = daysAgoISO(span)
    const { data } = await supabase
      .from('interactions')
      .select('contact_id, summary, date, type')
      .gte('date', sinceStr)
      .order('date', { ascending: false })
      .limit(20)
    const rows = (data ?? []) as Array<{ contact_id: string; summary: string; date: string; type: string }>
    if (rows.length > 0) {
      const cmap = await contactNameMap(supabase, rows.map(r => r.contact_id))
      sections.push('')
      sections.push(`INTERACTIONS SINCE ${sinceStr} (${rows.length}):`)
      for (const r of rows) {
        sections.push(`- ${r.date} ${r.type} ${cmap.get(r.contact_id) ?? '?'}: ${r.summary}`)
      }
    }
  }

  // 3) Fallback summary when nothing else fired (only the "Today:" header is present).
  if (sections.length === 1) {
    const [contactsRes, followRes, tasksRes, brainNodesRes, brainEdgesRes] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .eq('follow_up_needed', true)
        .neq('status', 'Done'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('brain_nodes').select('id', { count: 'exact', head: true }),
      supabase.from('brain_edges').select('id', { count: 'exact', head: true }),
    ])
    sections.push('')
    sections.push('SUMMARY:')
    sections.push(`- ${contactsRes.count ?? 0} total contacts`)
    sections.push(`- ${followRes.count ?? 0} open follow-ups`)
    sections.push(`- ${tasksRes.count ?? 0} open tasks`)
    sections.push(`- Brain: ${brainNodesRes.count ?? 0} nodes, ${brainEdgesRes.count ?? 0} connections`)
  }

  return sections.join('\n')
}

async function contactNameMap(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const unique = Array.from(new Set(ids))
  const { data } = await supabase.from('contacts').select('id, name').in('id', unique)
  return new Map(((data ?? []) as ContactLite[]).map(c => [c.id, c.name]))
}
