'use client'

import { useState } from 'react'
import Modal from './Modal'
import TaskForm from './TaskForm'

export const TASK_SAVED_EVENT = 'tasks:saved'

export default function QuickCaptureFab() {
  const [open, setOpen] = useState(false)
  const [dirty, setDirty] = useState(false)

  const guardClose = () => !dirty || window.confirm('Discard unsaved changes?')
  const close = () => { if (guardClose()) { setDirty(false); setOpen(false) } }

  const handleSaved = () => {
    setDirty(false)
    setOpen(false)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TASK_SAVED_EVENT))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add task"
        className="fixed right-6 sm:right-8 w-14 h-14 rounded-full bg-gold text-black text-3xl font-light shadow-2xl hover:bg-gold-hover transition-colors z-40 flex items-center justify-center"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        +
      </button>
      <Modal open={open} onClose={close} canClose={guardClose} title="New Task">
        <TaskForm
          onSaved={handleSaved}
          onCancel={close}
          onDirtyChange={setDirty}
        />
      </Modal>
    </>
  )
}
