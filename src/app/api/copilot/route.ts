import { supabase } from '@/lib/supabase'
import { todayLocal } from '@/lib/dates'
import { BASELINE_KNOWLEDGE_BASE } from '@/lib/copilot-knowledge-base'
import { parseActions, executeActions, stripActionBlocks } from '@/lib/copilot-actions'
import type { BrainEdge, BrainNode, Contact, Interaction, CopilotMessage, Task } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are Chase's CRM Copilot — the daily operating assistant for Baseline Analytics, Inc.

Chase Spivey is the Founder & CEO. Sheldon McClelland is the Founder & COO. You have access to live CRM data below. Your job is to tell Chase what to do, not just list things.

PERSONALITY:
- Be direct and concise. Two paragraphs max unless Chase asks for more.
- Lead with the action, not the context. "Call Eleanor today" not "It's been 38 days since your last interaction with Eleanor Martin, who is..."
- When listing priorities, cap it at 5. If there are more, say "plus X others — want the full list?"
- Never use em dashes (--) in any drafted messages.
- Sound like a sharp chief of staff, not a chatbot. No "Great question!" or "I'd be happy to help!"

BASELINE LANGUAGE RULES (strict):
- NEVER say "injury prevention" or "injury prediction" — use "fatigue monitoring," "workload intelligence," "arm health insights," or "durability optimization"
- Chase Spivey = "Founder & CEO" always
- Sheldon McClelland = "Founder & COO" always
- The product is the "Arm Care Intelligence System (ACIS)" — full name on first mention, then "ACIS"
- Rob Engel's title: "IAB MLB Committee Chair; SVP of Baseball & Content Engineering at MLB"
- Current raise: $3-4M SAFE, no valuation cap, 20% discount
- Baseline does NOT have an active MLB Letter of Intent. Current MLB status is legal review for biomechanical (Hawk-Eye) data access. Never reference an active LOI.

WHAT YOU DO WELL:
- Morning briefings: overdue follow-ups first, then stale contacts, then 1-2 strategic nudges. Keep it tight.
- "Who should I call today?" — pick the 3-5 highest-leverage contacts based on staleness + importance (MLB and Investor categories get priority)
- Draft short outreach messages: emails, texts, LinkedIn messages. Match Chase's voice — professional but warm, never stiff.
- Answer questions about specific contacts or deal history using the CRM data.
- Flag patterns: "You haven't logged anything with any Investor contacts in 3 weeks" or "All your IAB follow-ups from April are still open."

WHAT YOU DON'T DO:
- Don't give generic business advice. Chase doesn't need "consider following up with key stakeholders." He needs "Call Rob Engel. It's been 12 days and the Hawk-Eye data access is still in legal review."
- Don't make up information that isn't in the CRM data. If you don't have it, say so.
- Don't write long responses unless specifically asked. Brevity is respect for Chase's time.

CONTACT CATEGORIES (for context):
- MLB: League office contacts and club front office staff
- Investor: Active and prospective investors
- IAB: Industry Advisory Board members (former players, coaches, broadcasters, connectors)
- Partner: Strategic partners (TrackMan, CAA, etc.)
- Vendor: Legal, service providers
- University: Academic research connections
- Baseline: Internal team
- Other: Everyone else

ACTIONS — CRM UPDATES:
When Chase asks you to log something, create a follow-up, mark something done, or update a contact, you can do it directly. Respond with your confirmation message AND include a structured action block at the very end of your response in this exact format:

---ACTION---
{"type": "log_interaction", "contact_name": "Eleanor Martin", "summary": "Confirmed Giants legal approved IAB agreement", "type_of_interaction": "Call", "date": "2026-05-14", "details": "Eleanor confirmed that Giants legal has approved the IAB agreement with conflict-of-interest restrictions.", "follow_up_needed": true, "follow_up_date": "2026-05-28", "follow_up_action": "Send NDA to Eleanor"}
---END_ACTION---

Or for marking done:
---ACTION---
{"type": "mark_follow_up_done", "contact_name": "Eleanor Martin", "follow_up_summary_match": "Schedule follow-up call"}
---END_ACTION---

Or for adding a note:
---ACTION---
{"type": "update_contact_notes", "contact_name": "Eleanor Martin", "append_note": "Giants legal approved IAB agreement with conflict-of-interest restrictions. May 2026."}
---END_ACTION---

TASKS:
The CRM also has a separate Tasks system, distinct from interaction follow-ups. Tasks have three types:
- "quick_todo": a generic to-do not tied to any contact ("send the proposal", "review Q3 numbers")
- "talk_about": an agenda item for a specific contact — something to bring up next time you see/speak to them
- "reach_out_now": an urgent contact action — call/text someone today

Open tasks appear in the CRM data block below. Use them for context: if Chase says "what's on my plate", include open tasks. If he says "what do I need to talk to Sheldon about", look at his open talk_about tasks for Sheldon.

To create a task:
---ACTION---
{"type": "create_task", "title": "Send pricing deck", "task_type": "quick_todo", "priority": "high", "due_date": "2026-05-20"}
---END_ACTION---

For a talk_about or reach_out_now task, contact_name is required:
---ACTION---
{"type": "create_task", "title": "Hire timeline for Q3", "task_type": "talk_about", "contact_name": "Sheldon McClelland", "priority": "medium"}
---END_ACTION---

To mark a task done (use loose title match; pass contact_name to disambiguate when the task is tied to a contact):
---ACTION---
{"type": "complete_task", "title_match": "Send pricing deck"}
---END_ACTION---

---ACTION---
{"type": "complete_task", "title_match": "Hire timeline", "contact_name": "Sheldon McClelland"}
---END_ACTION---

You can include multiple action blocks if the user describes multiple things. Always confirm what you're doing in your response text BEFORE the action blocks.

If you're unsure which contact the user means (ambiguous name), ask to clarify. Never guess on the wrong contact.

ACTION RULES:
- Always use today's date (provided in the CRM data header) for new interactions unless Chase specifies a different date.
- For interaction type, infer from context: if Chase says "called" use "Call", "emailed" use "Email", "met with" use "Meeting", "texted" use "Text". Default to "Meeting" if unclear.
- When logging an interaction, always ask yourself: does this imply a follow-up? If Chase says "follow up in 2 weeks" or "need to send them X", set follow_up_needed to true and calculate the date.
- When marking something done, match loosely on the follow-up action or summary. If multiple open follow-ups match, list them and ask Chase which one.
- When Chase says "add a task", "remind me to", "I need to", or "put this on my list" — that's a create_task, not a log_interaction. Default priority is "medium". Default task_type is "quick_todo" unless Chase mentions a specific person to talk to or reach out to.
- For task_type, pick "talk_about" when Chase wants to remember to bring something up next time he sees a person ("next time I see Sheldon", "ask Jeff about X"). Pick "reach_out_now" when it's an urgent contact action with a clear today/tomorrow tempo ("call Mike today", "text Sarah").
- When marking a task done, match loosely on the task title. If multiple open tasks match, list them and ask Chase which one.
- Confirm every action in your response text: "Logged your call with Eleanor and set a follow-up for May 28 to send the NDA."
- Never delete contacts, interactions, or tasks through actions. Only additive and completion operations.

## Knowledge Graph (Second Brain)
You have access to a knowledge graph — a network of nodes (people, strategies, decisions, research, ideas, technologies, events) and edges (relationships between them).

READ: The graph is included in your context (BRAIN GRAPH section). Use it to answer questions about how things connect, what decisions were made, what strategies exist, and institutional knowledge.

WRITE: After substantive conversations, evaluate whether new knowledge should be captured. You can emit action blocks:

create_node — add new knowledge:
---ACTION---
{"type": "create_node", "node_type": "strategy", "title": "TrackMan Non-Exclusive Strategy", "body": "We decided to position the TrackMan deal as non-exclusive to preserve optionality with Hawk-Eye and other data providers.", "tags": ["trackman", "strategy", "partnerships"]}
---END_ACTION---

create_edge — connect two existing nodes:
---ACTION---
{"type": "create_edge", "source_title": "Ricky Meinhold", "target_title": "KinaTrax", "relationship": "uses", "strength": 8}
---END_ACTION---

update_node — append/update info on an existing node (matched by title, case-insensitive):
---ACTION---
{"type": "update_node", "title": "TrackMan Non-Exclusive Strategy", "body": "Updated context here...", "tags": ["trackman", "strategy", "partnerships", "updated"]}
---END_ACTION---

WHEN TO WRITE:
- Chase shares a strategic decision → create a 'decision' node
- Chase mentions a new technology or tool → create a 'technology' node
- Chase shares research findings → create a 'research' node
- Chase has an idea worth remembering → create an 'idea' node
- You notice connections between existing nodes → create edges
- A conversation reveals new context about an existing node → update it

WHEN NOT TO WRITE:
- Simple questions that don't add new knowledge
- Information already captured in CRM interactions
- Trivial or temporary information

Be selective. Quality over quantity. Every node should be something worth remembering in 6 months. Confirm graph writes briefly in your response ("Saved that as a decision node and linked it to the TrackMan strategy.") before the action blocks.

Node types: person, company, strategy, decision, research, idea, event, technology, term, milestone
Relationship examples: works_at, advised_by, led_to, blocked_by, informed, related_to, depends_on, contradicts, member_of, built, uses, competes_with`

type ContactLite = Pick<Contact, 'id' | 'name' | 'organization' | 'role' | 'category'>
type InteractionLite = Pick<
  Interaction,
  'id' | 'contact_id' | 'summary' | 'date' | 'type' | 'follow_up_needed' | 'follow_up_date' | 'follow_up_action' | 'status'
>
type TaskLite = Pick<Task, 'id' | 'title' | 'type' | 'priority' | 'status' | 'contact_id' | 'due_date' | 'created_at'>

const TASK_TYPE_LABEL: Record<TaskLite['type'], string> = {
  quick_todo: 'Quick To-Do',
  talk_about: 'Talk About',
  reach_out_now: 'Reach Out Now',
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(to + 'T00:00:00')
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

type BrainNodeLite = Pick<BrainNode, 'id' | 'type' | 'title' | 'body' | 'tags' | 'contact_id' | 'updated_at'>
type BrainEdgeLite = Pick<BrainEdge, 'source_node_id' | 'target_node_id' | 'relationship' | 'strength'>

async function buildContext(): Promise<string> {
  const today = todayLocal()

  const [contactsRes, interactionsRes, tasksRes, brainNodesRes, brainEdgesRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, organization, role, category')
      .order('name', { ascending: true }),
    supabase
      .from('interactions')
      .select('id, contact_id, summary, date, type, follow_up_needed, follow_up_date, follow_up_action, status')
      .order('date', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, title, type, priority, status, contact_id, due_date, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
    supabase
      .from('brain_nodes')
      .select('id, type, title, body, tags, contact_id, updated_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('brain_edges')
      .select('source_node_id, target_node_id, relationship, strength'),
  ])

  if (contactsRes.error) throw new Error(`Failed to load contacts: ${contactsRes.error.message}`)
  if (interactionsRes.error) throw new Error(`Failed to load interactions: ${interactionsRes.error.message}`)
  if (tasksRes.error) throw new Error(`Failed to load tasks: ${tasksRes.error.message}`)
  // Brain graph is best-effort; if the tables don't exist yet, log and continue without it.
  const brainNodes = !brainNodesRes.error ? (brainNodesRes.data ?? []) as BrainNodeLite[] : []
  const brainEdges = !brainEdgesRes.error ? (brainEdgesRes.data ?? []) as BrainEdgeLite[] : []
  if (brainNodesRes.error) console.error('[copilot] brain_nodes load failed:', brainNodesRes.error.message)
  if (brainEdgesRes.error) console.error('[copilot] brain_edges load failed:', brainEdgesRes.error.message)

  const contacts = (contactsRes.data ?? []) as ContactLite[]
  const interactions = (interactionsRes.data ?? []) as InteractionLite[]
  const tasks = (tasksRes.data ?? []) as TaskLite[]
  const contactById = new Map(contacts.map(c => [c.id, c]))

  const lastByContact = new Map<string, InteractionLite>()
  for (const i of interactions) {
    if (!lastByContact.has(i.contact_id)) lastByContact.set(i.contact_id, i)
  }

  const needsAttention = contacts
    .map(c => {
      const last = lastByContact.get(c.id)
      const days = last ? daysBetween(last.date, today) : null
      return { contact: c, last, days }
    })
    .filter(x => x.days !== null && x.days > 10)
    .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))

  const openFollowUps = interactions
    .filter(i => i.follow_up_needed && i.status !== 'Done')
    .sort((a, b) => {
      const da = a.follow_up_date ?? '9999-12-31'
      const db = b.follow_up_date ?? '9999-12-31'
      return da.localeCompare(db)
    })

  const recent = interactions.slice(0, 15)

  const lines: string[] = []
  lines.push(`=== YOUR CRM DATA (as of ${today}) ===`)
  lines.push('')
  lines.push(`CONTACTS (${contacts.length} total):`)
  for (const c of contacts) {
    lines.push(`- ${c.name} | ${c.organization ?? '—'} | ${c.role ?? '—'} | ${c.category}`)
  }
  lines.push('')
  lines.push(`NEEDS ATTENTION (no contact in 10+ days, ${needsAttention.length}):`)
  if (needsAttention.length === 0) {
    lines.push('- (none)')
  } else {
    for (const x of needsAttention) {
      lines.push(`- ${x.contact.name} (${x.contact.organization ?? '—'}) — ${x.days} days since last interaction (${x.last?.date})`)
    }
  }
  lines.push('')
  lines.push(`OPEN FOLLOW-UPS (${openFollowUps.length}):`)
  if (openFollowUps.length === 0) {
    lines.push('- (none)')
  } else {
    for (const i of openFollowUps) {
      const name = contactById.get(i.contact_id)?.name ?? 'Unknown'
      const due = i.follow_up_date ? `due: ${i.follow_up_date}` : 'no due date'
      lines.push(`- ${name}: ${i.follow_up_action ?? i.summary} (${due}) — from: ${i.summary} on ${i.date}`)
    }
  }
  lines.push('')
  lines.push(`RECENT INTERACTIONS (last ${recent.length}):`)
  if (recent.length === 0) {
    lines.push('- (none)')
  } else {
    for (const i of recent) {
      const name = contactById.get(i.contact_id)?.name ?? 'Unknown'
      lines.push(`- ${i.date} | ${i.type} | ${name} | ${i.summary}`)
    }
  }
  lines.push('')
  lines.push(`OPEN TASKS (${tasks.length}):`)
  if (tasks.length === 0) {
    lines.push('- (none)')
  } else {
    const tasksByType = {
      quick_todo: tasks.filter(t => t.type === 'quick_todo'),
      talk_about: tasks.filter(t => t.type === 'talk_about'),
      reach_out_now: tasks.filter(t => t.type === 'reach_out_now'),
    }
    for (const [taskType, list] of Object.entries(tasksByType) as [TaskLite['type'], TaskLite[]][]) {
      if (list.length === 0) continue
      lines.push(`  ${TASK_TYPE_LABEL[taskType]} (${list.length}):`)
      for (const t of list) {
        const who = t.contact_id ? contactById.get(t.contact_id)?.name ?? 'Unknown' : null
        const parts = [
          `priority: ${t.priority}`,
          t.due_date ? `due: ${t.due_date}` : null,
          who ? `for: ${who}` : null,
        ].filter(Boolean).join(', ')
        lines.push(`  - ${t.title} (${parts})`)
      }
    }
  }

  // Brain Graph block.
  lines.push('')
  lines.push(`=== BRAIN GRAPH (Knowledge Network) ===`)
  if (brainNodes.length === 0) {
    lines.push('(empty — no knowledge captured yet)')
  } else {
    const cap = 50
    const truncated = brainNodes.length > 100
    const visibleNodes = truncated ? brainNodes.slice(0, cap) : brainNodes
    if (truncated) {
      const byType = new Map<string, number>()
      for (const n of brainNodes) byType.set(n.type, (byType.get(n.type) ?? 0) + 1)
      const counts = Array.from(byType.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([t, c]) => `${t}: ${c}`)
        .join(', ')
      lines.push(`Total: ${brainNodes.length} nodes (${counts})`)
      lines.push(`Showing ${cap} most recently updated nodes:`)
    }
    const visibleIds = new Set(visibleNodes.map(n => n.id))
    const nodeById = new Map(brainNodes.map(n => [n.id, n]))

    lines.push('NODES:')
    for (const n of visibleNodes) {
      const linkNote = n.contact_id ? ' (linked to CRM contact)' : ''
      const tagPart = n.tags && n.tags.length > 0 ? ` (tags: ${n.tags.join(', ')})` : ''
      const bodyPart = n.body ? ` — ${n.body.length > 160 ? n.body.slice(0, 160).trim() + '…' : n.body}` : ''
      lines.push(`[${n.type}] "${n.title}"${bodyPart}${linkNote}${tagPart}`)
    }

    const relevantEdges = brainEdges.filter(e => visibleIds.has(e.source_node_id) && visibleIds.has(e.target_node_id))
    if (relevantEdges.length > 0) {
      lines.push('')
      lines.push('EDGES:')
      for (const e of relevantEdges) {
        const s = nodeById.get(e.source_node_id)
        const t = nodeById.get(e.target_node_id)
        if (!s || !t) continue
        lines.push(`"${s.title}" --[${e.relationship}]--> "${t.title}" (strength: ${e.strength})`)
      }
    }
  }

  return lines.join('\n')
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response('GROQ_API_KEY is not configured', { status: 500 })
  }

  let body: { chat_id?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const chatId = typeof body.chat_id === 'string' ? body.chat_id.trim() : ''
  const userMessage = typeof body.message === 'string' ? body.message.trim() : ''
  if (!chatId) return new Response('chat_id is required', { status: 400 })
  if (!userMessage) return new Response('message is required', { status: 400 })

  // Fetch existing history for this chat.
  const historyRes = await supabase
    .from('copilot_messages')
    .select('role, content, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
  if (historyRes.error) {
    return new Response(`Failed to load chat history: ${historyRes.error.message}`, { status: 500 })
  }
  const history = (historyRes.data ?? []) as Pick<CopilotMessage, 'role' | 'content' | 'created_at'>[]
  const isFirstUserMessage = history.filter(m => m.role === 'user').length === 0

  // Save the user message.
  const insertUserRes = await supabase
    .from('copilot_messages')
    .insert({ chat_id: chatId, role: 'user', content: userMessage })
  if (insertUserRes.error) {
    return new Response(`Failed to save user message: ${insertUserRes.error.message}`, { status: 500 })
  }

  // Auto-title from the first user message.
  if (isFirstUserMessage) {
    const title = userMessage.slice(0, 50).trim() || 'New Chat'
    await supabase.from('copilot_chats').update({ title }).eq('id', chatId)
  }

  let crmContext: string
  try {
    crmContext = await buildContext()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error building CRM context'
    return new Response(msg, { status: 500 })
  }

  const systemMessage = [
    SYSTEM_PROMPT,
    '',
    '=== BASELINE ANALYTICS KNOWLEDGE BASE ===',
    BASELINE_KNOWLEDGE_BASE,
    '',
    crmContext,
  ].join('\n')

  const payload = {
    model: 'llama-3.3-70b-versatile',
    stream: true,
    messages: [
      { role: 'system', content: systemMessage },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ],
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!groqRes.ok || !groqRes.body) {
    const text = await groqRes.text().catch(() => '')
    const detail = text.slice(0, 500) || groqRes.statusText
    return new Response(`Groq API error (${groqRes.status}): ${detail}`, { status: 502 })
  }

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const reader = groqRes.body.getReader()

  const finalize = async (assistantContent: string) => {
    if (!assistantContent) return
    const tail = assistantContent.slice(-400)
    console.log('[copilot.finalize] stream complete', {
      length: assistantContent.length,
      containsActionMarker: assistantContent.includes('---ACTION---'),
      containsEndMarker: assistantContent.includes('---END_ACTION---'),
      tail,
    })
    const actions = parseActions(assistantContent)
    console.log('[copilot.finalize] parseActions returned', actions.length, 'action(s)',
      actions.length > 0 ? actions.map(a => a.type) : '')
    if (actions.length > 0) {
      try {
        const results = await executeActions(supabase, actions)
        for (const r of results) {
          if (!r.ok) console.error('[copilot action failed]', r.type, r.message)
        }
      } catch (err) {
        console.error('[copilot action execution threw]', err)
      }
    }
    const stored = stripActionBlocks(assistantContent) || assistantContent
    await supabase
      .from('copilot_messages')
      .insert({ chat_id: chatId, role: 'assistant', content: stored })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = ''
      let assistantContent = ''
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let idx: number
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim()
            buffer = buffer.slice(idx + 1)
            if (!line.startsWith('data:')) continue
            const data = line.slice(5).trim()
            if (data === '[DONE]') {
              controller.close()
              await finalize(assistantContent)
              return
            }
            try {
              const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                assistantContent += content
                controller.enqueue(encoder.encode(content))
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }
        controller.close()
        await finalize(assistantContent)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`\n\n[Stream error: ${msg}]`))
        controller.close()
        await finalize(assistantContent)
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
