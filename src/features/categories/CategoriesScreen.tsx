import { useMemo, useState } from 'react'
import { archiveCategory, useCategories } from '../../db/repository'
import { useToast } from '../../app/ToastProvider'
import { FALLBACK_CATEGORY_COLOR } from '../../lib/categoryColor'

export function CategoriesScreen() {
  const categories = useCategories()
  const { showErrorToast } = useToast()
  const [pendingId, setPendingId] = useState<number | null>(null)

  const activeCategories = useMemo(
    () => categories.filter((c) => !c.isArchived).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  )

  async function handleDelete(id: number) {
    setPendingId(id)
    try {
      await archiveCategory(id)
    } catch {
      showErrorToast('Could not delete category')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">Categories</h2>
      {activeCategories.length === 0 && (
        <p className="text-sm text-neutral-500">No categories yet.</p>
      )}
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {activeCategories.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2">
            <span className={`rounded-full px-3 py-1 text-sm ${c.color ?? FALLBACK_CATEGORY_COLOR}`}>
              {c.name}
            </span>
            <button
              type="button"
              onClick={() => void handleDelete(c.id)}
              disabled={pendingId === c.id}
              className="rounded px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
