'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { TASK_SAVED_EVENT } from '@/components/QuickCaptureFab'
import type { TaskPriority, TaskStatus, TaskType, TaskWithContact } from '@/types'

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 }

type StatusFilter = 'open' | 'done' | 'all'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All' },
]

const SECTIONS: { type: TaskType; label: string; empty: string }[] = [
  { type: 'quick_todo', label: 'To Do', empty: 'No quick todos. Tap + to add one.' },
  { type: 'talk_about', label: 'Talk About', empty: 'No agenda items. Tap + to add one.' },
  { type: 'reach_out_now', label: 'Reach Out Now', empty: 'Nobody to chase. Tap + to add one.' },
]

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  high: 'bg-danger-dim text-danger',
  medium: 'bg-gold-dim text-gold',
  low: 'bg-dark-elevated text-text-muted',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithContact[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('tasks')
      .select('*, contacts(id, name)')
      .order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    const rows = (data ?? []) as unknown as TaskWithContact[]
    rows.sort((a, b) => {
      // Open first, then by priority (high → low), then most recent
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1
      const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
      if (pr !== 0) return pr
      return b.created_at.localeCompare(a.created_at)
    })
    setTasks(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-side Supabase fetch + cross-component refresh
    fetchTasks()
    const onSaved = () => { fetchTasks() }
    window.addEventListener(TASK_SAVED_EVENT, onSaved)
    return () => window.removeEventListener(TASK_SAVED_EVENT, onSaved)
  }, [fetchTasks])

  const setTaskStatus = async (id: string, nextStatus: TaskStatus) => {
    const prev = tasks.find(t => t.id === id)
    if (!prev) return
    const completed_at = nextStatus === 'done' ? new Date().toISOString() : null
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status: nextStatus, completed_at } : t))
    const { error: err } = await supabase
      .from('tasks')
      .update({ status: nextStatus, completed_at })
      .eq('id', id)
    if (err) {
      setTasks(ts => ts.map(t => t.id === id ? prev : t))
      setActionError(err.message)
    }
  }

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks
    return tasks.filter(t => t.status === statusFilter)
  }, [tasks, statusFilter])

  const counts = useMemo(() => ({
    open: tasks.filter(t => t.status === 'open').length,
    done: tasks.filter(t => t.status === 'done').length,
    all: tasks.length,
  }), [tasks])

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>
  if (error) return <div className="flex items-center justify-center h-64 text-danger text-sm">Failed to load: {error}</div>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium text-gold uppercase tracking-widest mb-1">What needs doing</p>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-sm text-text-muted mt-1">Quick todos, agenda items, and urgent reach-outs.</p>
      </div>

      {actionError && (
        <div className="bg-danger-dim border border-danger/30 rounded-lg px-4 py-2 text-sm text-danger flex items-center justify-between">
          <span>Update failed: {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs underline">dismiss</button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s.value
                ? 'bg-gold text-black'
                : 'bg-dark-card text-text-secondary border border-border hover:bg-dark-elevated'
            }`}
          >
            {s.label} ({counts[s.value]})
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {SECTIONS.map(section => (
          <TaskSection
            key={section.type}
            type={section.type}
            label={section.label}
            empty={section.empty}
            tasks={filteredTasks.filter(t => t.type === section.type)}
            onToggle={(id, current) => setTaskStatus(id, current === 'done' ? 'open' : 'done')}
          />
        ))}
      </div>
    </div>
  )
}

interface TaskSectionProps {
  type: TaskType
  label: string
  empty: string
  tasks: TaskWithContact[]
  onToggle: (id: string, current: TaskStatus) => void
}

function TaskSection({ type, label, empty, tasks, onToggle }: TaskSectionProps) {
  const groupedByContact = useMemo(() => {
    if (type !== 'talk_about') return null
    const map = new Map<string, TaskWithContact[]>()
    for (const t of tasks) {
      const key = t.contacts?.name ?? '(no contact)'
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tasks, type])

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium text-gold uppercase tracking-widest">{label}</h2>
      {tasks.length === 0 ? (
        <div className="bg-dark-card border border-border rounded-xl px-5 py-6 text-sm text-text-muted text-center">
          {empty}
        </div>
      ) : groupedByContact ? (
        <div className="space-y-4">
          {groupedByContact.map(([contactName, items]) => (
            <div key={contactName} className="space-y-2">
              <p className="text-xs text-text-secondary font-medium">{contactName}</p>
              <div className="space-y-2">
                {items.map(t => <TaskRow key={t.id} task={t} onToggle={onToggle} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => <TaskRow key={t.id} task={t} onToggle={onToggle} />)}
        </div>
      )}
    </section>
  )
}

interface TaskRowProps {
  task: TaskWithContact
  onToggle: (id: string, current: TaskStatus) => void
}

function TaskRow({ task, onToggle }: TaskRowProps) {
  const done = task.status === 'done'
  const overdue = !done && task.due_date && task.due_date < new Date().toLocaleDateString('en-CA')
  return (
    <div className={`bg-dark-card border rounded-xl px-4 py-3 flex items-start gap-3 transition-opacity ${done ? 'opacity-60' : ''} ${overdue ? 'border-danger/40 border-l-2 border-l-danger' : 'border-border border-l-2 border-l-gold/30'}`}>
      <button
        onClick={() => onToggle(task.id, task.status)}
        aria-label={done ? 'Mark task open' : 'Mark task done'}
        className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          done
            ? 'bg-success border-success text-white'
            : 'border-text-muted hover:border-gold'
        }`}
      >
        {done && <span className="text-xs leading-none">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${done ? 'line-through text-text-secondary' : ''}`}>
          {task.title}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${PRIORITY_BADGE[task.priority]}`}>
            {task.priority}
          </span>
          {task.due_date && (
            <span className={`text-xs ${overdue ? 'text-danger font-medium' : 'text-text-muted'}`}>
              Due {task.due_date}
            </span>
          )}
          {task.contacts && (
            <Link href={`/contacts/${task.contacts.id}`} className="text-xs text-gold hover:text-gold-hover transition-colors">
              {task.contacts.name}
            </Link>
          )}
          {task.completed_at && done && (
            <span className="text-xs text-text-muted">Done {new Date(task.completed_at).toLocaleDateString('en-CA')}</span>
          )}
        </div>
        {task.notes && (
          <p className="text-xs text-text-muted mt-1 whitespace-pre-line">{task.notes}</p>
        )}
      </div>
    </div>
  )
}

