import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrainNodeType, InteractionType, TaskPriority, TaskType } from '@/types'

export type LogInteractionAction = {
  type: 'log_interaction'
  contact_name: string
  summary: string
  type_of_interaction: string
  date: string
  details?: string
  follow_up_needed?: boolean
  follow_up_date?: string
  follow_up_action?: string
}

export type MarkFollowUpDoneAction = {
  type: 'mark_follow_up_done'
  contact_name: string
  follow_up_summary_match: string
}

export type UpdateContactNotesAction = {
  type: 'update_contact_notes'
  contact_name: string
  append_note: string
}

export type CreateTaskAction = {
  type: 'create_task'
  title: string
  task_type: TaskType
  priority?: TaskPriority
  contact_name?: string
  notes?: string
  due_date?: string
}

export type CompleteTaskAction = {
  type: 'complete_task'
  title_match: string
  contact_name?: string
}

export type CreateNodeAction = {
  type: 'create_node'
  node_type: BrainNodeType
  title: string
  body?: string
  tags?: string[]
}

export type CreateEdgeAction = {
  type: 'create_edge'
  source_title: string
  target_title: string
  relationship: string
  strength?: number
}

export type UpdateNodeAction = {
  type: 'update_node'
  title: string
  body?: string
  tags?: string[]
  // Optional: if creating-on-miss, the node type to use
  node_type?: BrainNodeType
}

export type CopilotAction =
  | LogInteractionAction
  | MarkFollowUpDoneAction
  | UpdateContactNotesAction
  | CreateTaskAction
  | CompleteTaskAction
  | CreateNodeAction
  | CreateEdgeAction
  | UpdateNodeAction

export interface ActionResult {
  ok: boolean
  type: CopilotAction['type'] | 'unknown'
  message: string
}

const ACTION_BLOCK_RE = /---ACTION---([\s\S]*?)---END_ACTION---/g
// Used when stripping mid-stream: hides everything after an unclosed `---ACTION---`.
const UNCLOSED_TRAILING_RE = /---ACTION---[\s\S]*$/

const VALID_INTERACTION_TYPES: InteractionType[] = ['Call', 'Email', 'Meeting', 'Text', 'LinkedIn', 'In-Person']
const VALID_TASK_TYPES: TaskType[] = ['quick_todo', 'talk_about', 'reach_out_now']
const VALID_TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']
const VALID_NODE_TYPES: BrainNodeType[] = [
  'person', 'company', 'strategy', 'decision', 'research',
  'idea', 'event', 'technology', 'term', 'milestone',
]

export function parseActions(text: string): CopilotAction[] {
  const out: CopilotAction[] = []
  let blockIndex = 0
  for (const match of text.matchAll(ACTION_BLOCK_RE)) {
    blockIndex++
    const raw = match[1].trim()
    console.log(`[copilot.parseActions] block #${blockIndex} raw JSON (${raw.length} chars):`, raw)
    try {
      const parsed = JSON.parse(raw) as unknown
      if (isCopilotAction(parsed)) {
        out.push(parsed)
      } else {
        console.log(`[copilot.parseActions] block #${blockIndex} parsed but failed validation:`, parsed)
      }
    } catch (err) {
      console.log(`[copilot.parseActions] block #${blockIndex} JSON.parse threw:`,
        err instanceof Error ? err.message : err)
    }
  }
  return out
}

export function stripActionBlocks(text: string): string {
  return text.replace(ACTION_BLOCK_RE, '').replace(UNCLOSED_TRAILING_RE, '').replace(/\n{3,}/g, '\n\n').trimEnd()
}

export function containsActionBlock(text: string): boolean {
  return text.includes('---ACTION---')
}

function isCopilotAction(value: unknown): value is CopilotAction {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.type !== 'string') return false
  if (v.type === 'log_interaction') {
    return typeof v.contact_name === 'string'
      && typeof v.summary === 'string'
      && typeof v.type_of_interaction === 'string'
      && typeof v.date === 'string'
  }
  if (v.type === 'mark_follow_up_done') {
    return typeof v.contact_name === 'string' && typeof v.follow_up_summary_match === 'string'
  }
  if (v.type === 'update_contact_notes') {
    return typeof v.contact_name === 'string' && typeof v.append_note === 'string'
  }
  if (v.type === 'create_task') {
    if (typeof v.title !== 'string' || typeof v.task_type !== 'string') return false
    if (!VALID_TASK_TYPES.includes(v.task_type as TaskType)) return false
    if (v.priority !== undefined && !VALID_TASK_PRIORITIES.includes(v.priority as TaskPriority)) return false
    if (v.contact_name !== undefined && typeof v.contact_name !== 'string') return false
    return true
  }
  if (v.type === 'complete_task') {
    if (typeof v.title_match !== 'string') return false
    if (v.contact_name !== undefined && typeof v.contact_name !== 'string') return false
    return true
  }
  if (v.type === 'create_node') {
    if (typeof v.node_type !== 'string' || !VALID_NODE_TYPES.includes(v.node_type as BrainNodeType)) return false
    if (typeof v.title !== 'string' || !v.title.trim()) return false
    if (v.body !== undefined && typeof v.body !== 'string') return false
    if (v.tags !== undefined && !(Array.isArray(v.tags) && v.tags.every(t => typeof t === 'string'))) return false
    return true
  }
  if (v.type === 'create_edge') {
    if (typeof v.source_title !== 'string' || !v.source_title.trim()) return false
    if (typeof v.target_title !== 'string' || !v.target_title.trim()) return false
    if (typeof v.relationship !== 'string' || !v.relationship.trim()) return false
    if (v.strength !== undefined && typeof v.strength !== 'number') return false
    return true
  }
  if (v.type === 'update_node') {
    if (typeof v.title !== 'string' || !v.title.trim()) return false
    if (v.body !== undefined && typeof v.body !== 'string') return false
    if (v.tags !== undefined && !(Array.isArray(v.tags) && v.tags.every(t => typeof t === 'string'))) return false
    if (v.node_type !== undefined && (typeof v.node_type !== 'string' || !VALID_NODE_TYPES.includes(v.node_type as BrainNodeType))) return false
    return true
  }
  return false
}

function normalizeInteractionType(raw: string): InteractionType {
  const cleaned = raw.trim().toLowerCase()
  const found = VALID_INTERACTION_TYPES.find(t => t.toLowerCase() === cleaned)
  if (found) return found
  if (cleaned === 'in person' || cleaned === 'inperson') return 'In-Person'
  if (cleaned === 'linked in' || cleaned === 'linkedin message') return 'LinkedIn'
  return 'Meeting'
}

async function findUniqueContact(
  client: SupabaseClient,
  name: string,
): Promise<{ id: string; name: string; notes: string | null } | { error: string }> {
  const trimmed = name.trim()
  if (!trimmed) {
    console.log('[copilot.findUniqueContact] empty contact name')
    return { error: 'empty contact name' }
  }
  const { data, error } = await client
    .from('contacts')
    .select('id, name, notes')
    .ilike('name', `%${trimmed}%`)
    .limit(5)
  if (error) {
    console.log('[copilot.findUniqueContact] supabase error', { query: trimmed, error: error.message })
    return { error: error.message }
  }
  const rows = (data ?? []) as Array<{ id: string; name: string; notes: string | null }>
  console.log('[copilot.findUniqueContact] lookup', { query: trimmed, matches: rows.map(r => r.name) })
  if (rows.length === 0) return { error: `no contact matches "${trimmed}"` }
  if (rows.length > 1) {
    const exact = rows.find(r => r.name.toLowerCase() === trimmed.toLowerCase())
    if (exact) {
      console.log('[copilot.findUniqueContact] resolved via exact match', exact.name)
      return exact
    }
    return { error: `ambiguous: multiple contacts match "${trimmed}" (${rows.map(r => r.name).join(', ')})` }
  }
  return rows[0]
}

async function executeLogInteraction(
  client: SupabaseClient,
  action: LogInteractionAction,
): Promise<ActionResult> {
  const contact = await findUniqueContact(client, action.contact_name)
  if ('error' in contact) return { ok: false, type: action.type, message: `log_interaction: ${contact.error}` }

  const interactionType = normalizeInteractionType(action.type_of_interaction)
  const followUp = action.follow_up_needed === true
  const insert = {
    contact_id: contact.id,
    summary: action.summary,
    date: action.date,
    type: interactionType,
    details: action.details ?? null,
    follow_up_needed: followUp,
    follow_up_date: followUp ? action.follow_up_date ?? null : null,
    follow_up_action: followUp ? action.follow_up_action ?? null : null,
    status: 'Pending',
  }
  const { error } = await client.from('interactions').insert(insert)
  if (error) return { ok: false, type: action.type, message: `log_interaction (${contact.name}): ${error.message}` }
  return { ok: true, type: action.type, message: `Logged ${interactionType} with ${contact.name}` }
}

async function executeMarkDone(
  client: SupabaseClient,
  action: MarkFollowUpDoneAction,
): Promise<ActionResult> {
  console.log('[copilot.mark_follow_up_done] action', action)
  const contact = await findUniqueContact(client, action.contact_name)
  if ('error' in contact) {
    console.log('[copilot.mark_follow_up_done] contact lookup failed', contact.error)
    return { ok: false, type: action.type, message: `mark_follow_up_done: ${contact.error}` }
  }
  console.log('[copilot.mark_follow_up_done] resolved contact', { id: contact.id, name: contact.name })

  const { data, error } = await client
    .from('interactions')
    .select('id, summary, follow_up_action, status, follow_up_date')
    .eq('contact_id', contact.id)
    .eq('follow_up_needed', true)
    .neq('status', 'Done')
  if (error) {
    console.log('[copilot.mark_follow_up_done] fetch open follow-ups failed', error.message)
    return { ok: false, type: action.type, message: `mark_follow_up_done: ${error.message}` }
  }

  type OpenRow = { id: string; summary: string; follow_up_action: string | null; status: string; follow_up_date: string | null }
  const rows = (data ?? []) as OpenRow[]
  console.log('[copilot.mark_follow_up_done] open follow-ups', rows.map(r => ({
    id: r.id,
    status: r.status,
    follow_up_action: r.follow_up_action,
    summary: r.summary,
  })))
  if (rows.length === 0) {
    return { ok: false, type: action.type, message: `No open follow-ups found for ${contact.name}` }
  }

  const needle = action.follow_up_summary_match.trim().toLowerCase()
  console.log('[copilot.mark_follow_up_done] needle', JSON.stringify(needle))
  // Match against follow_up_action and summary. Both sides must be non-empty before we let
  // "contains" go either direction — otherwise needle.includes('') is always true and a NULL
  // follow_up_action would match every row, producing a false "ambiguous" result.
  const matches = rows.filter(r => {
    const a = (r.follow_up_action ?? '').toLowerCase().trim()
    const s = (r.summary ?? '').toLowerCase().trim()
    if (!needle) return false
    if (a && (a.includes(needle) || needle.includes(a))) return true
    if (s && (s.includes(needle) || needle.includes(s))) return true
    return false
  })
  console.log('[copilot.mark_follow_up_done] fuzzy matches', matches.map(m => m.id))

  const target = matches.length === 1
    ? matches[0]
    : (matches.length === 0 && rows.length === 1 ? rows[0] : null)
  if (!target) {
    const detail = matches.length > 1
      ? `${matches.length} fuzzy matches`
      : `${rows.length} open follow-ups, none matched needle "${needle}"`
    console.log('[copilot.mark_follow_up_done] no unique target', detail)
    return { ok: false, type: action.type, message: `Ambiguous follow-up match for ${contact.name} (${detail})` }
  }
  console.log('[copilot.mark_follow_up_done] target row', { id: target.id, follow_up_action: target.follow_up_action, summary: target.summary })

  const { data: updData, error: updErr } = await client
    .from('interactions')
    .update({ status: 'Done', completed_at: new Date().toISOString() })
    .eq('id', target.id)
    .select('id, status')
  if (updErr) {
    console.log('[copilot.mark_follow_up_done] update error', updErr.message)
    return { ok: false, type: action.type, message: `mark_follow_up_done: ${updErr.message}` }
  }
  const updatedRows = (updData ?? []) as Array<{ id: string; status: string }>
  console.log('[copilot.mark_follow_up_done] update result', updatedRows)
  if (updatedRows.length === 0) {
    return { ok: false, type: action.type, message: `Update affected 0 rows (id=${target.id}) — likely RLS or stale id` }
  }
  return { ok: true, type: action.type, message: `Marked done: ${contact.name} — ${target.follow_up_action ?? target.summary}` }
}

async function executeUpdateNotes(
  client: SupabaseClient,
  action: UpdateContactNotesAction,
): Promise<ActionResult> {
  const contact = await findUniqueContact(client, action.contact_name)
  if ('error' in contact) return { ok: false, type: action.type, message: `update_contact_notes: ${contact.error}` }

  const existing = contact.notes?.trim() ?? ''
  const addition = action.append_note.trim()
  if (!addition) return { ok: false, type: action.type, message: 'empty note' }
  const next = existing ? `${existing}\n${addition}` : addition
  const { error } = await client.from('contacts').update({ notes: next }).eq('id', contact.id)
  if (error) return { ok: false, type: action.type, message: `update_contact_notes: ${error.message}` }
  return { ok: true, type: action.type, message: `Appended note to ${contact.name}` }
}

async function executeCreateTask(
  client: SupabaseClient,
  action: CreateTaskAction,
): Promise<ActionResult> {
  const requiresContact = action.task_type === 'talk_about' || action.task_type === 'reach_out_now'
  let contactId: string | null = null
  let resolvedContactName: string | null = null
  if (requiresContact) {
    if (!action.contact_name) {
      return { ok: false, type: action.type, message: `create_task: ${action.task_type} requires a contact_name` }
    }
    const contact = await findUniqueContact(client, action.contact_name)
    if ('error' in contact) return { ok: false, type: action.type, message: `create_task: ${contact.error}` }
    contactId = contact.id
    resolvedContactName = contact.name
  } else if (action.contact_name) {
    return { ok: false, type: action.type, message: 'create_task: quick_todo must not have a contact' }
  }

  const title = action.title.trim()
  if (!title) return { ok: false, type: action.type, message: 'create_task: empty title' }

  const insert = {
    title,
    type: action.task_type,
    priority: action.priority ?? 'medium',
    status: 'open' as const,
    contact_id: contactId,
    notes: action.notes?.trim() ? action.notes.trim() : null,
    due_date: action.due_date ?? null,
  }
  const { error } = await client.from('tasks').insert(insert)
  if (error) return { ok: false, type: action.type, message: `create_task: ${error.message}` }
  const subject = resolvedContactName ? `${title} (${resolvedContactName})` : title
  return { ok: true, type: action.type, message: `Created task: ${subject}` }
}

async function executeCompleteTask(
  client: SupabaseClient,
  action: CompleteTaskAction,
): Promise<ActionResult> {
  console.log('[copilot.complete_task] action', action)

  let contactId: string | null = null
  let contactNameForMsg: string | null = null
  if (action.contact_name) {
    const contact = await findUniqueContact(client, action.contact_name)
    if ('error' in contact) return { ok: false, type: action.type, message: `complete_task: ${contact.error}` }
    contactId = contact.id
    contactNameForMsg = contact.name
  }

  let query = client.from('tasks').select('id, title, contact_id').eq('status', 'open')
  if (contactId) query = query.eq('contact_id', contactId)
  const { data, error } = await query
  if (error) return { ok: false, type: action.type, message: `complete_task: ${error.message}` }

  type OpenRow = { id: string; title: string; contact_id: string | null }
  const rows = (data ?? []) as OpenRow[]
  if (rows.length === 0) {
    const scope = contactNameForMsg ? ` for ${contactNameForMsg}` : ''
    return { ok: false, type: action.type, message: `No open tasks${scope}` }
  }

  const needle = action.title_match.trim().toLowerCase()
  if (!needle) return { ok: false, type: action.type, message: 'complete_task: empty title_match' }

  const matches = rows.filter(r => {
    const t = r.title.toLowerCase().trim()
    if (!t) return false
    return t.includes(needle) || needle.includes(t)
  })

  const target = matches.length === 1
    ? matches[0]
    : (matches.length === 0 && rows.length === 1 ? rows[0] : null)
  if (!target) {
    const detail = matches.length > 1
      ? `${matches.length} tasks match "${needle}" (${matches.map(m => m.title).join(', ')})`
      : `${rows.length} open tasks, none matched "${needle}"`
    return { ok: false, type: action.type, message: `Ambiguous task match: ${detail}` }
  }

  const { data: updData, error: updErr } = await client
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', target.id)
    .select('id, status')
  if (updErr) return { ok: false, type: action.type, message: `complete_task: ${updErr.message}` }
  const updatedRows = (updData ?? []) as Array<{ id: string; status: string }>
  if (updatedRows.length === 0) {
    return { ok: false, type: action.type, message: `Update affected 0 rows (id=${target.id})` }
  }
  return { ok: true, type: action.type, message: `Marked task done: ${target.title}` }
}

async function findBrainNodeByTitle(
  client: SupabaseClient,
  title: string,
): Promise<{ id: string; title: string; type: BrainNodeType; body: string | null; tags: string[] } | null> {
  const trimmed = title.trim()
  if (!trimmed) return null
  // Try exact (case-insensitive) match first, then fuzzy.
  const exactRes = await client
    .from('brain_nodes')
    .select('id, title, type, body, tags')
    .ilike('title', trimmed)
    .limit(1)
  if (!exactRes.error && exactRes.data && exactRes.data.length > 0) {
    return exactRes.data[0] as { id: string; title: string; type: BrainNodeType; body: string | null; tags: string[] }
  }
  const fuzzyRes = await client
    .from('brain_nodes')
    .select('id, title, type, body, tags')
    .ilike('title', `%${trimmed}%`)
    .limit(5)
  if (fuzzyRes.error) return null
  const rows = (fuzzyRes.data ?? []) as Array<{ id: string; title: string; type: BrainNodeType; body: string | null; tags: string[] }>
  if (rows.length === 0) return null
  // Prefer shortest title (most specific match for substring search).
  rows.sort((a, b) => a.title.length - b.title.length)
  return rows[0]
}

async function executeCreateNode(
  client: SupabaseClient,
  action: CreateNodeAction,
): Promise<ActionResult> {
  const title = action.title.trim()
  if (!title) return { ok: false, type: action.type, message: 'create_node: empty title' }
  // Skip if a node with the same title and type already exists (idempotent).
  const existingRes = await client
    .from('brain_nodes')
    .select('id, title')
    .eq('type', action.node_type)
    .ilike('title', title)
    .limit(1)
  if (!existingRes.error && existingRes.data && existingRes.data.length > 0) {
    return { ok: true, type: action.type, message: `Node already exists: ${existingRes.data[0].title}` }
  }
  const insert = {
    type: action.node_type,
    title,
    body: action.body?.trim() ? action.body.trim() : null,
    tags: Array.isArray(action.tags) ? action.tags.map(t => t.trim()).filter(Boolean) : [],
    source: 'copilot',
  }
  const { error } = await client.from('brain_nodes').insert(insert)
  if (error) return { ok: false, type: action.type, message: `create_node: ${error.message}` }
  return { ok: true, type: action.type, message: `Created ${action.node_type} node: ${title}` }
}

async function executeCreateEdge(
  client: SupabaseClient,
  action: CreateEdgeAction,
): Promise<ActionResult> {
  const source = await findBrainNodeByTitle(client, action.source_title)
  const target = await findBrainNodeByTitle(client, action.target_title)
  if (!source || !target) {
    // Silent skip per spec — return ok=false with a soft message so it's logged but not surfaced as error.
    const missing = !source ? action.source_title : action.target_title
    return { ok: false, type: action.type, message: `create_edge: node not found "${missing}" (skipped)` }
  }
  if (source.id === target.id) {
    return { ok: false, type: action.type, message: 'create_edge: source and target are the same node' }
  }
  const rawStrength = typeof action.strength === 'number' ? action.strength : 5
  const strength = Math.max(1, Math.min(10, Math.round(rawStrength)))
  const insert = {
    source_node_id: source.id,
    target_node_id: target.id,
    relationship: action.relationship.trim(),
    strength,
  }
  const { error } = await client.from('brain_edges').insert(insert)
  if (error) {
    // Duplicate (unique constraint) is fine — treat as success.
    if (error.code === '23505') {
      return { ok: true, type: action.type, message: `Edge already exists: ${source.title} --[${insert.relationship}]--> ${target.title}` }
    }
    return { ok: false, type: action.type, message: `create_edge: ${error.message}` }
  }
  return { ok: true, type: action.type, message: `Linked ${source.title} --[${insert.relationship}]--> ${target.title}` }
}

async function executeUpdateNode(
  client: SupabaseClient,
  action: UpdateNodeAction,
): Promise<ActionResult> {
  const existing = await findBrainNodeByTitle(client, action.title)
  if (!existing) {
    // Per spec: create it if not found.
    const nodeType = action.node_type ?? 'idea'
    return executeCreateNode(client, {
      type: 'create_node',
      node_type: nodeType,
      title: action.title,
      body: action.body,
      tags: action.tags,
    })
  }
  const update: Record<string, unknown> = {}
  if (action.body !== undefined) update.body = action.body.trim() || null
  if (action.tags !== undefined) update.tags = action.tags.map(t => t.trim()).filter(Boolean)
  if (Object.keys(update).length === 0) {
    return { ok: false, type: action.type, message: 'update_node: nothing to update' }
  }
  const { error } = await client.from('brain_nodes').update(update).eq('id', existing.id)
  if (error) return { ok: false, type: action.type, message: `update_node: ${error.message}` }
  return { ok: true, type: action.type, message: `Updated node: ${existing.title}` }
}

export async function executeActions(
  client: SupabaseClient,
  actions: CopilotAction[],
): Promise<ActionResult[]> {
  console.log('[copilot.executeActions] received', actions.length, 'action(s)')
  const results: ActionResult[] = []
  for (const action of actions) {
    try {
      let result: ActionResult
      if (action.type === 'log_interaction') {
        result = await executeLogInteraction(client, action)
      } else if (action.type === 'mark_follow_up_done') {
        result = await executeMarkDone(client, action)
      } else if (action.type === 'update_contact_notes') {
        result = await executeUpdateNotes(client, action)
      } else if (action.type === 'create_task') {
        result = await executeCreateTask(client, action)
      } else if (action.type === 'complete_task') {
        result = await executeCompleteTask(client, action)
      } else if (action.type === 'create_node') {
        result = await executeCreateNode(client, action)
      } else if (action.type === 'create_edge') {
        result = await executeCreateEdge(client, action)
      } else if (action.type === 'update_node') {
        result = await executeUpdateNode(client, action)
      } else {
        result = { ok: false, type: 'unknown', message: 'unknown action type' }
      }
      console.log('[copilot.executeActions] result', { ok: result.ok, type: result.type, message: result.message })
      results.push(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error'
      console.log('[copilot.executeActions] threw', { type: action.type, message })
      results.push({ ok: false, type: action.type, message })
    }
  }
  return results
}
