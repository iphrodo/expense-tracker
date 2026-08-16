import { useMemo, useState } from 'react'
import { archiveCategory, createCategory, updateCategory, useCategories } from '../../db/repository'
import { useToast } from '../../app/ToastProvider'
import { getCategoryColorRoles } from '../../lib/categoryColor'
import type { Category } from '../../db/schema'
import { CategoryForm } from './CategoryForm'

function CategoryRow({
  category,
  pending,
  onEdit,
  onDelete,
}: {
  category: Category
  pending: boolean
  onEdit: (category: Category) => void
  onDelete: (id: number) => void
}) {
  const roles = getCategoryColorRoles(category)
  return (
    <div className="flex h-[52px] items-center gap-s3 border-b border-border px-s3 last:border-b-0">
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: roles.dot }} />
      <span className="t-body min-w-0 flex-1 truncate text-text">{category.name}</span>
      <span
        className="t-meta rounded-full px-s2 py-0.5 font-medium"
        style={{ backgroundColor: roles.tint, color: roles.text }}
      >
        {category.isDaily ? 'daily' : 'non-daily'}
      </span>
      <button
        type="button"
        onClick={() => onEdit(category)}
        disabled={pending}
        className="t-meta h-9 rounded-md px-s2 font-semibold text-text-2 hover:bg-surface-2 disabled:opacity-50"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(category.id)}
        disabled={pending}
        className="t-meta h-9 rounded-md px-s2 font-semibold text-error hover:bg-error-weak disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  )
}

export function CategoriesScreen() {
  const categories = useCategories()
  const { showErrorToast } = useToast()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const activeCategories = useMemo(
    () => categories.filter((c) => !c.isArchived).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  )
  const dailyCategories = useMemo(() => activeCategories.filter((c) => c.isDaily), [activeCategories])
  const nonDailyCategories = useMemo(() => activeCategories.filter((c) => !c.isDaily), [activeCategories])

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
    <div className="mx-auto flex max-w-xl flex-col gap-s4 p-s4">
      <div className="flex items-center justify-between">
        <h1 className="t-h1 text-text">Categories</h1>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="t-body h-10 rounded-md bg-accent px-s3 font-semibold text-white hover:bg-accent-hover active:bg-accent-press"
        >
          Add category
        </button>
      </div>
      {activeCategories.length === 0 && <p className="t-body text-text-2">No categories yet.</p>}

      {dailyCategories.length > 0 && (
        <div className="rounded-lg border border-border bg-surface shadow-1">
          <h2 className="t-micro px-s3 pt-s3 pb-s2 text-text-3">Daily</h2>
          {dailyCategories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              pending={pendingId === c.id}
              onEdit={setEditingCategory}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {nonDailyCategories.length > 0 && (
        <div className="rounded-lg border border-border bg-surface shadow-1">
          <h2 className="t-micro px-s3 pt-s3 pb-s2 text-text-3">Non-daily</h2>
          {nonDailyCategories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              pending={pendingId === c.id}
              onEdit={setEditingCategory}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showAddForm && (
        <CategoryForm
          title="Add category"
          onSubmit={async (name, isDaily) => {
            await createCategory(name, isDaily)
            setShowAddForm(false)
          }}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editingCategory && (
        <CategoryForm
          title="Edit category"
          initialName={editingCategory.name}
          initialIsDaily={editingCategory.isDaily}
          onSubmit={async (name, isDaily) => {
            await updateCategory(editingCategory.id, { name, isDaily })
            setEditingCategory(null)
          }}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </div>
  )
}
