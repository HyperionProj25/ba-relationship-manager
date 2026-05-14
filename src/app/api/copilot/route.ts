import { supabase } from '@/lib/supabase'
import { todayLocal } from '@/lib/dates'
import type { Contact, Interaction } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are the Baseline Analytics CRM Copilot — a daily assistant for Chase Spivey, Founder & CEO of Baseline Analytics, Inc.

Your job is to help Chase stay organized across his relationships with MLB contacts, investors, advisory board members, partners, and vendors. You have access to his live CRM data below.

What you're great at:
- Summarizing who needs attention and what follow-ups are overdue
- Giving a quick morning briefing of priorities
- Drafting short outreach messages (emails, texts, Slack messages)
- Answering questions about specific contacts or interaction history
- Suggesting who to reach out to and why

Rules:
- Be concise and direct. Chase is busy — no fluff.
- When drafting emails for Chase, never use em dashes (--).
- Never say "injury prevention" or "injury prediction" — Baseline's language is "fatigue monitoring," "workload intelligence," "arm health insights," or "durability optimization."
- Chase Spivey = Founder & CEO. Sheldon McClelland = Founder & COO. Always use these exact titles.
- When you reference CRM data, be specific: use names, dates, and details from the data provided.
- If Chase asks about something not in the CRM data, say so honestly rather than guessing.
- Keep responses to 2-4 paragraphs unless Chase asks for something longer.
- For morning briefings, prioritize: overdue follow-ups first, then contacts needing attention, then upcoming priorities.`

type ContactLite = Pick<Contact, 'id' | 'name' | 'organization' | 'role' | 'category'>
type InteractionLite = Pick<
  Interaction,
  'id' | 'contact_id' | 'summary' | 'date' | 'type' | 'follow_up_needed' | 'follow_up_date' | 'follow_up_action' | 'status'
>

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(to + 'T00:00:00')
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

async function buildContext(): Promise<string> {
  const today = todayLocal()

  const [contactsRes, interactionsRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, organization, role, category')
      .order('name', { ascending: true }),
    supabase
      .from('interactions')
      .select('id, contact_id, summary, date, type, follow_up_needed, follow_up_date, follow_up_action, status')
      .order('date', { ascending: false }),
  ])

  if (contactsRes.error) throw new Error(`Failed to load contacts: ${contactsRes.error.message}`)
  if (interactionsRes.error) throw new Error(`Failed to load interactions: ${interactionsRes.error.message}`)

  const contacts = (contactsRes.data ?? []) as ContactLite[]
  const interactions = (interactionsRes.data ?? []) as InteractionLite[]
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

  return lines.join('\n')
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response('GROQ_API_KEY is not configured', { status: 500 })
  }

  let body: { messages?: ChatMessage[] }
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const messages = body.messages ?? []
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('messages must be a non-empty array', { status: 400 })
  }

  let crmContext: string
  try {
    crmContext = await buildContext()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error building CRM context'
    return new Response(msg, { status: 500 })
  }

  const payload = {
    model: 'llama-3.3-70b-versatile',
    stream: true,
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${crmContext}` },
      ...messages.map(m => ({ role: m.role, content: m.content })),
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = ''
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
              return
            }
            try {
              const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
              const content = parsed.choices?.[0]?.delta?.content
              if (content) controller.enqueue(encoder.encode(content))
            } catch {
              // ignore malformed chunk
            }
          }
        }
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`\n\n[Stream error: ${msg}]`))
        controller.close()
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
