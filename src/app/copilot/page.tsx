'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { stripActionBlocks, containsActionBlock } from '@/lib/copilot-actions'
import type { CopilotChat, CopilotMessage } from '@/types'

type Role = 'user' | 'assistant'
interface UIMessage {
  role: Role
  content: string
}

const STARTER_PROMPTS = [
  'Give me my morning briefing',
  'Who needs attention this week?',
  'What follow-ups are overdue?',
  'Draft a check-in to my top investor',
]

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day === 1) return 'Yesterday'
  if (day < 7) return `${day}d ago`
  const wk = Math.round(day / 7)
  if (wk < 5) return `${wk}w ago`
  return new Date(iso).toLocaleDateString()
}

function renderAssistantContent(rawText: string) {
  const text = stripActionBlocks(rawText)
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
  const [chats, setChats] = useState<CopilotChat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [crmUpdatedAt, setCrmUpdatedAt] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastUserMessageRef = useRef<string | null>(null)
  const bootedRef = useRef(false)

  const createNewChat = useCallback(async (): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from('copilot_chats')
      .insert({ title: 'New Chat' })
      .select('*')
      .single()
    if (err || !data) {
      setBootError(err?.message ?? 'Failed to create chat')
      return null
    }
    const chat = data as CopilotChat
    setChats(prev => [chat, ...prev])
    setActiveChatId(chat.id)
    setMessages([])
    setError(null)
    return chat.id
  }, [])

  // Initial load: fetch chats; create one if none exist.
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    let cancelled = false
    ;(async () => {
      const { data, error: err } = await supabase
        .from('copilot_chats')
        .select('*')
        .order('updated_at', { ascending: false })
      if (cancelled) return
      if (err) {
        setBootError(err.message)
        return
      }
      const list = (data ?? []) as CopilotChat[]
      setChats(list)
      if (list.length === 0) {
        await createNewChat()
      } else {
        setActiveChatId(list[0].id)
      }
    })()
    return () => { cancelled = true }
  }, [createNewChat])

  // Load messages for the active chat.
  useEffect(() => {
    if (!activeChatId) return
    let cancelled = false
    setChatLoading(true)
    ;(async () => {
      const { data, error: err } = await supabase
        .from('copilot_messages')
        .select('*')
        .eq('chat_id', activeChatId)
        .order('created_at', { ascending: true })
      if (cancelled) return
      setChatLoading(false)
      if (err) {
        setError(`Failed to load messages: ${err.message}`)
        return
      }
      const rows = (data ?? []) as CopilotMessage[]
      setMessages(rows.map(r => ({ role: r.role, content: r.content })))
      setError(null)
    })()
    return () => { cancelled = true }
  }, [activeChatId])

  // Autofocus the input when the active chat changes.
  useEffect(() => {
    textareaRef.current?.focus()
  }, [activeChatId])

  // Auto-scroll to the bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, streaming, chatLoading])

  // Fade the "CRM updated" toast after a moment.
  useEffect(() => {
    if (crmUpdatedAt === null) return
    const t = setTimeout(() => setCrmUpdatedAt(null), 3500)
    return () => clearTimeout(t)
  }, [crmUpdatedAt])

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    const max = 4 * 24 + 16
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
  }

  const refreshChats = useCallback(async () => {
    const { data } = await supabase
      .from('copilot_chats')
      .select('*')
      .order('updated_at', { ascending: false })
    if (data) setChats(data as CopilotChat[])
  }, [])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming || !activeChatId) return
    setError(null)
    lastUserMessageRef.current = trimmed
    const next: UIMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: activeChatId, message: trimmed }),
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
      if (containsActionBlock(accumulated)) {
        setCrmUpdatedAt(Date.now())
      }
      refreshChats()
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

  const handleSelectChat = (id: string) => {
    if (id === activeChatId) {
      setSidebarOpen(false)
      return
    }
    setActiveChatId(id)
    setDeleteConfirmId(null)
    setSidebarOpen(false)
  }

  const handleNewChat = async () => {
    if (streaming) return
    setDeleteConfirmId(null)
    setSidebarOpen(false)
    await createNewChat()
  }

  const handleDelete = async (id: string) => {
    const previousActive = activeChatId
    setChats(prev => prev.filter(c => c.id !== id))
    setDeleteConfirmId(null)
    const { error: err } = await supabase.from('copilot_chats').delete().eq('id', id)
    if (err) {
      setError(`Failed to delete chat: ${err.message}`)
      // Refetch authoritative state on failure.
      refreshChats()
      return
    }
    if (previousActive === id) {
      const { data } = await supabase
        .from('copilot_chats')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
      const next = (data ?? [])[0] as CopilotChat | undefined
      if (next) {
        setActiveChatId(next.id)
      } else {
        await createNewChat()
      }
    }
  }

  const isEmpty = !chatLoading && messages.length === 0

  const Sidebar = (
    <div className="h-full flex flex-col">
      <div className="px-3 py-3 border-b border-border">
        <button
          onClick={handleNewChat}
          disabled={streaming}
          className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {chats.length === 0 ? (
          <div className="px-4 py-6 text-xs text-text-muted text-center">No chats yet</div>
        ) : (
          chats.map(c => {
            const isActive = c.id === activeChatId
            const confirming = deleteConfirmId === c.id
            return (
              <div
                key={c.id}
                className={`group relative flex items-center gap-2 px-3 py-2 mx-1 my-0.5 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-dark-elevated border-l-2 border-l-gold'
                    : 'hover:bg-dark-elevated border-l-2 border-l-transparent'
                }`}
                onClick={() => handleSelectChat(c.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className={`text-sm truncate ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {c.title || 'New Chat'}
                  </div>
                  <div className="text-[11px] text-text-muted">{relativeTime(c.updated_at)}</div>
                </div>
                {confirming ? (
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-danger text-white hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 rounded text-[11px] font-medium text-text-secondary hover:text-text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(c.id) }}
                    aria-label="Delete chat"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-danger hover:bg-dark-card opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-0 transition-opacity text-lg leading-none"
                  >
                    &times;
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  if (bootError) {
    return (
      <div className="flex items-center justify-center h-64 text-danger text-sm">
        Failed to load Copilot: {bootError}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8rem)]">
      <div>
        <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">AI Assistant</p>
        <h1 className="text-2xl font-bold">Copilot</h1>
        <p className="text-sm text-text-muted mt-1">Ask about contacts, follow-ups, and pipeline.</p>
      </div>

      <div className="mt-4 flex-1 flex bg-dark-card border border-border rounded-xl overflow-hidden min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-72 shrink-0 border-r border-border flex-col">
          {Sidebar}
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setSidebarOpen(false)}
            role="presentation"
          >
            <aside
              className="absolute left-0 top-0 bottom-0 w-72 max-w-[85%] bg-dark-card border-r border-border flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-sm font-medium">Chats</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                  className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary text-xl leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="flex-1 min-h-0">{Sidebar}</div>
            </aside>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {crmUpdatedAt !== null && (
            <div
              key={crmUpdatedAt}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
              role="status"
              aria-live="polite"
            >
              <div className="bg-success-dim border border-success/40 text-success rounded-full px-3 py-1 text-xs font-medium shadow-lg">
                ✓ CRM updated
              </div>
            </div>
          )}
          {/* Mobile chat header with sidebar toggle */}
          <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open chat history"
              className="w-9 h-9 flex flex-col items-center justify-center rounded-lg hover:bg-dark-elevated transition-colors gap-1"
            >
              <span className="block w-4 h-0.5 bg-text-secondary" />
              <span className="block w-4 h-0.5 bg-text-secondary" />
              <span className="block w-4 h-0.5 bg-text-secondary" />
            </button>
            <div className="min-w-0 flex-1 text-sm text-text-secondary truncate">
              {chats.find(c => c.id === activeChatId)?.title || 'New Chat'}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            {chatLoading ? (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">Loading...</div>
            ) : isEmpty ? (
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
                  const visibleContent = m.role === 'assistant' ? stripActionBlocks(m.content) : m.content
                  const showThinking = streaming && isLast && m.role === 'assistant' && visibleContent === ''
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
                disabled={streaming || !activeChatId}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim() || !activeChatId}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black hover:bg-gold-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
