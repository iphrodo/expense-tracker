import { useState } from 'react'

interface CategoryFormProps {
  title: string
  initialName?: string
  initialIsDaily?: boolean
  onSubmit: (name: string, isDaily: boolean) => Promise<void>
  onClose: () => void
}

const segmentClass = (active: boolean) =>
  `t-meta h-9 flex-1 rounded-full px-s3 font-semibold transition-colors duration-[120ms] ease-out ${
    active ? 'bg-surface text-text shadow-1' : 'text-text-2 hover:text-text'
  }`

export function CategoryForm({
  title,
  initialName = '',
  initialIsDaily = false,
  onSubmit,
  onClose,
}: CategoryFormProps) {
  const [name, setName] = useState(initialName)
  const [isDaily, setIsDaily] = useState(initialIsDaily)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a category name')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit(trimmed, isDaily)
    } catch {
      setError('A category with this name already exists')
    } finally {
      setSaving(false)
    }
  }

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

        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSubmit()
            }
          }}
          placeholder="Category name"
          aria-label="Category name"
          autoFocus
          className="h-12 w-full rounded-md border border-border-strong bg-surface px-s3 text-text outline-none placeholder:text-text-3"
        />
        {error && <p className="mt-1 text-sm text-error">{error}</p>}

        <div className="mt-s3 inline-flex w-full gap-0.5 rounded-full bg-surface-2 p-0.5">
          <button type="button" onClick={() => setIsDaily(true)} className={segmentClass(isDaily)}>
            Daily
          </button>
          <button
            type="button"
            onClick={() => setIsDaily(false)}
            className={segmentClass(!isDaily)}
          >
            Non-daily
          </button>
        </div>

        <div className="mt-s4 flex justify-end gap-s2">
          <button
            type="button"
            onClick={onClose}
            className="t-body h-11 rounded-md border border-border-strong px-s3 text-text hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="t-body h-11 rounded-md bg-accent px-s3 font-semibold text-white hover:bg-accent-hover active:bg-accent-press disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
