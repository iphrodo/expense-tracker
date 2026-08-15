import { useState } from 'react'

interface ConfirmDialogProps {
  title: string
  initialReason: string
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function ConfirmDialog({ title, initialReason, onConfirm, onClose }: ConfirmDialogProps) {
  const [reason, setReason] = useState(initialReason)

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-s4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface p-s4 shadow-2"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="t-h2 mb-s3 text-text">{title}</h2>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          rows={3}
          className="w-full rounded-sm border border-border px-s3 py-s2 text-sm text-text placeholder:text-text-3"
        />

        <div className="mt-s3 flex justify-end gap-s2">
          <button
            type="button"
            onClick={onClose}
            className="t-body h-11 rounded-md border border-border-strong px-s3 text-text hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            className="t-body h-11 rounded-md bg-accent px-s3 font-semibold text-white hover:bg-accent-hover active:bg-accent-press"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
