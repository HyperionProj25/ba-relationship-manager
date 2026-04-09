'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}

export default function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={`bg-dark-card border border-border sm:rounded-xl rounded-t-xl shadow-2xl w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border sticky top-0 bg-dark-card z-10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors text-2xl leading-none w-10 h-10 flex items-center justify-center">&times;</button>
        </div>
        <div className="px-5 sm:px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
