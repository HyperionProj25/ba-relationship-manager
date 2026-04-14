'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
  /** If set and returns false, close is blocked. Useful for unsaved-changes guards. */
  canClose?: () => boolean
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children, wide, canClose }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const attemptClose = () => {
    if (canClose && !canClose()) return
    onClose()
  }

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const focusables = () => Array.from(contentRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    const first = focusables()[0]
    first?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { attemptClose(); return }
      if (e.key !== 'Tab') return
      const nodes = focusables()
      if (nodes.length === 0) { e.preventDefault(); return }
      const firstEl = nodes[0]
      const lastEl = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && active === lastEl) { e.preventDefault(); firstEl.focus() }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) attemptClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div ref={contentRef} className={`bg-dark-card border border-border sm:rounded-xl rounded-t-xl shadow-2xl w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border sticky top-0 bg-dark-card z-10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={attemptClose} aria-label="Close" className="text-text-muted hover:text-text-primary transition-colors text-2xl leading-none w-10 h-10 flex items-center justify-center">&times;</button>
        </div>
        <div className="px-5 sm:px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
