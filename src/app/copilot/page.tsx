'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

type Role = 'user' | 'assistant'
interface Message {
  role: Role
  content: string
}

const STARTER_PROMPTS = [
  'Give me my morning briefing',
  'Who needs attention this week?',
  'What follow-ups are overdue?',
  'Draft a check-in to my top investor',
]

function renderAssistantContent(text: string) {
  const lines = text.split('\n')
  const blocks: Array<{ type: 'p' | 'ul'; items: string[] }> = []
  for (const raw of lines) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
    } else {
      blocks.push({ type: 'p', items: [line] })
    }
  }

  const renderInline = (s: string, keyPrefix: string) => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={`${keyPrefix}-${i}`} className="font-semibold">{p.slice(2, -2)}</strong>
      }
      return <span key={`${keyPrefix}-${i}`}>{p}</span>
    })
  }

  return blocks.map((b, bi) => {
    if (b.type === 'ul') {
      return (
        <ul key={bi} className="list-disc list-outside pl-5 space-y-1 my-2">
          {b.items.map((item, ii) => (
            <li key={ii}>{renderInline(item, `${bi}-${ii}`)}</li>
          ))}
        </ul>
      )
    }
    const content = b.items[0]
    if (content === '') return <div key={bi} className="h-2" aria-hidden />
    return (
      <p key={bi} className="my-1.5 first:mt-0 last:mb-0 whitespace-pre-wrap">
        {renderInline(content, `${bi}`)}
      </p>
    )
  })
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastUserMessageRef = useRef<string | null>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    const max = 4 * 24 + 16
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return
    setError(null)
    lastUserMessageRef.current = trimmed
    const next: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => '')
        throw new Error(detail || `Request failed (${res.status})`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const copy = prev.slice()
          copy[copy.length - 1] = { role: 'assistant', content: accumulated }
          return copy
        })
      }
      if (accumulated === '') {
        setMessages(prev => prev.slice(0, -1))
        throw new Error('No response from copilot')
      }
    } catch (err) {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.content === '') return prev.slice(0, -1)
        return prev
      })
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setStreaming(false)
    }
  }

  const retry = () => {
    if (lastUserMessageRef.current && !streaming) {
      const text = lastUserMessageRef.current
      setMessages(prev => {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === 'user' && prev[i].content === text) {
            return prev.slice(0, i)
          }
        }
        return prev
      })
      sendMessage(text)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8rem)]">
      <div>
        <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">AI Assistant</p>
        <h1 className="text-2xl font-bold">Copilot</h1>
        <p className="text-sm text-text-muted mt-1">Ask about contacts, follow-ups, and pipeline.</p>
      </div>

      <div className="mt-4 flex-1 flex flex-col bg-dark-card border border-border rounded-xl overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6">
              <div>
                <p className="text-base font-medium text-text-primary">How can I help today?</p>
                <p className="text-sm text-text-muted mt-1">Pick a starter or type your own question.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                {STARTER_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    disabled={streaming}
                    className="px-4 py-2 rounded-full text-sm bg-dark-elevated border border-border text-text-secondary hover:text-gold hover:border-gold/40 transition-colors disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => {
                const isUser = m.role === 'user'
                const isLast = i === messages.length - 1
                const showThinking = streaming && isLast && m.role === 'assistant' && m.content === ''
                return (
                  <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                        isUser
                          ? 'bg-gold-dim text-text-primary'
                          : 'bg-dark-elevated border border-border text-text-primary'
                      }`}
                    >
                      {showThinking ? (
                        <span className="text-text-muted inline-flex items-center gap-1">
                          Thinking
                          <span className="inline-flex gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-text-muted animate-pulse" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 rounded-full bg-text-muted animate-pulse" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 rounded-full bg-text-muted animate-pulse" style={{ animationDelay: '300ms' }} />
                          </span>
                        </span>
                      ) : isUser ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        renderAssistantContent(m.content)
                      )}
                    </div>
                  </div>
                )
              })}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-danger-dim border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger flex items-center gap-3">
                    <span>Error: {error}</span>
                    {lastUserMessageRef.current && (
                      <button
                        onClick={retry}
                        disabled={streaming}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-danger text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-dark-elevated px-3 py-3 sm:px-4 sm:py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoGrow(e.target) }}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask about your contacts, follow-ups, pipeline..."
              className="flex-1 resize-none bg-dark-card border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors"
              disabled={streaming}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={streaming || !input.trim()}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
