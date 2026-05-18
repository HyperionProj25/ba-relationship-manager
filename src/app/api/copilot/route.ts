import { supabase } from '@/lib/supabase'
import { getRelevantContext } from '@/lib/copilot-context'
import { parseActions, executeActions, stripActionBlocks } from '@/lib/copilot-actions'
import type { CopilotMessage } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HISTORY_MESSAGE_LIMIT = 4

const SYSTEM_PROMPT = `You are the Baseline Analytics CRM copilot. You help Chase Spivey manage relationships, follow-ups, tasks, and a growing knowledge graph.

Be concise. Use only the CRM/brain data provided below to answer. If you don't have enough context, say so — don't guess.

To take an action, end your response with one or more blocks in this exact format:
---ACTION---
{json}
---END_ACTION---

CRM actions:
- log_interaction: {contact_name, summary, type_of_interaction, date, details?, follow_up_needed?, follow_up_date?, follow_up_action?}
- mark_follow_up_done: {contact_name, follow_up_summary_match}
- update_contact_notes: {contact_name, append_note}
- create_task: {title, task_type, priority?, contact_name?, due_date?}
- complete_task: {title_match, contact_name?}

Notes:
- type_of_interaction: Call | Email | Meeting | Text | LinkedIn | In-Person
- task_type: quick_todo | talk_about | reach_out_now (talk_about and reach_out_now require contact_name; quick_todo must not)
- priority: low | medium | high
- Use today's date from the data header for new interactions unless Chase specifies otherwise.
- Confirm every action briefly in your response text before the block(s).

BRAIN GRAPH — AUTOMATIC KNOWLEDGE CAPTURE:
You maintain a knowledge graph of people, strategies, decisions, technology, and ideas.

When Chase tells you something substantive — a new relationship, a strategic decision, a technology evaluation, a meeting outcome — you should BOTH respond conversationally AND emit brain actions to capture it.

Rules for auto-capture:
- Only capture things worth remembering in 6 months. "Just talked to Rob" is not worth a node. "Rob confirmed MLB legal is reviewing our Hawk-Eye data request" IS worth capturing.
- Never duplicate. If a node for "Hawk-Eye Data Access" already exists, update it or create an edge to it — don't create a new node with a similar name. Check the BRAIN GRAPH section of the data header before creating.
- Prefer edges over nodes. Connecting existing nodes is more valuable than creating new ones.
- Tag every node with a cluster: one of "cluster:mlb", "cluster:investors", "cluster:iab", "cluster:technology", "cluster:strategy", or "cluster:other".
- When you auto-capture, mention it briefly at the end of your response ("Added to the brain: …") so Chase knows the graph is growing.
- Do NOT auto-capture when Chase is just asking a question. Only capture when he's TELLING you something new.

Brain actions:
- create_node: {"type": "create_node", "node_type": "strategy|decision|technology|idea|research|event|milestone|term", "title": "...", "body": "...", "tags": ["cluster:mlb", "other-tag"]}
- create_edge: {"type": "create_edge", "source_title": "...", "target_title": "...", "relationship": "...", "strength": 5}
- update_node: {"type": "update_node", "title": "...", "body": "new body text", "tags": ["cluster:technology"]}

You can emit multiple actions in one response. Each action gets its own ---ACTION--- block.`

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
    crmContext = await getRelevantContext(userMessage, supabase)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error building CRM context'
    return new Response(msg, { status: 500 })
  }

  const systemMessage = `${SYSTEM_PROMPT}\n\n=== CRM DATA ===\n${crmContext}`

  // Cap history to keep TPM under control; older messages stay visible in the UI.
  const recentHistory = history.slice(-HISTORY_MESSAGE_LIMIT)

  const payload = {
    model: 'llama-3.3-70b-versatile',
    stream: true,
    messages: [
      { role: 'system', content: systemMessage },
      ...recentHistory.map(m => ({ role: m.role, content: m.content })),
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
