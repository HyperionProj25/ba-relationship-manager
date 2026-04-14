'use client'

import Modal from './Modal'

interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  name: string
  loading?: boolean
  error?: string | null
}

export default function DeleteConfirmModal({ open, onClose, onConfirm, name, loading, error }: DeleteConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm Delete">
      <p className="text-text-secondary mb-4">
        Are you sure you want to delete <span className="text-text-primary font-semibold">{name}</span>? This action cannot be undone.
      </p>
      {error && <p className="text-danger text-sm mb-4">Failed to delete: {error}</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
        <button
          onClick={onClose}
          className="px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary bg-dark-elevated hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium bg-danger text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}
