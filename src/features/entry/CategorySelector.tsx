import { useMemo, useRef, useState, forwardRef, type KeyboardEvent } from 'react'
import type { Category } from '../../db/schema'
import { FALLBACK_CATEGORY_COLOR } from '../../lib/categoryColor'

const CHIP_COUNT = 10

interface CategorySelectorProps {
  rankedCategories: Category[]
  selectedCategoryId: number | null
  onSelect: (id: number) => void
  onCreateCategory: (name: string) => Promise<number>
  /** Called on Enter; `categoryId` is the just-resolved match, passed directly to avoid a stale read of `selectedCategoryId`. */
  onSubmit: (categoryId?: number) => void
}

function filterByPrefix(categories: Category[], query: string): Category[] {
  const lower = query.trim().toLowerCase()
  if (lower === '') {
    return categories
  }
  return categories.filter((c) => c.name.toLowerCase().startsWith(lower))
}

export const CategorySelector = forwardRef<HTMLInputElement, CategorySelectorProps>(
  function CategorySelector(
    { rankedCategories, selectedCategoryId, onSelect, onCreateCategory, onSubmit },
    typeaheadRef,
  ) {
    const [typeaheadQuery, setTypeaheadQuery] = useState('')
    const [highlightIndex, setHighlightIndex] = useState(0)
    const [moreOpen, setMoreOpen] = useState(false)
    const [moreQuery, setMoreQuery] = useState('')
    const moreInputRef = useRef<HTMLInputElement>(null)

    const chips = rankedCategories.slice(0, CHIP_COUNT)
    const typeaheadMatches = useMemo(
      () => filterByPrefix(rankedCategories, typeaheadQuery),
      [rankedCategories, typeaheadQuery],
    )
    const moreMatches = useMemo(
      () => filterByPrefix(rankedCategories, moreQuery),
      [rankedCategories, moreQuery],
    )

    const selectedCategory = rankedCategories.find((c) => c.id === selectedCategoryId)

    function handleTypeaheadKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIndex((i) => Math.min(i + 1, Math.max(typeaheadMatches.length - 1, 0)))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const resolved = typeaheadMatches[highlightIndex] ?? typeaheadMatches[0]
        if (resolved) {
          onSelect(resolved.id)
          onSubmit(resolved.id)
        } else {
          onSubmit()
        }
      }
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              tabIndex={-1}
              onClick={() => c.id !== undefined && onSelect(c.id)}
              className={`rounded-full px-3 py-1 text-sm ${c.color ?? FALLBACK_CATEGORY_COLOR} ${
                c.id === selectedCategoryId
                  ? 'font-semibold ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-neutral-900'
                  : 'hover:opacity-80'
              }`}
            >
              {c.name}
            </button>
          ))}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setMoreOpen((v) => !v)
              requestAnimationFrame(() => moreInputRef.current?.focus())
            }}
            className="rounded-full border border-dashed border-neutral-400 px-3 py-1 text-sm text-neutral-500"
          >
            more…
          </button>
        </div>

        <div>
          <input
            ref={typeaheadRef}
            type="text"
            value={typeaheadQuery}
            onChange={(e) => {
              setTypeaheadQuery(e.target.value)
              setHighlightIndex(0)
            }}
            onKeyDown={handleTypeaheadKeyDown}
            placeholder={selectedCategory ? selectedCategory.name : 'Category (type to search)'}
            aria-label="Category"
            className="w-full max-w-xs rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          {typeaheadQuery !== '' && (
            <ul className="mt-1 max-h-40 max-w-xs divide-y divide-black overflow-auto rounded border border-neutral-200 text-sm dark:border-neutral-700">
              {typeaheadMatches.map((c, i) => (
                <li
                  key={c.id}
                  className={`px-2 py-1 ${c.color ?? FALLBACK_CATEGORY_COLOR} ${
                    i === highlightIndex ? 'ring-2 ring-inset ring-emerald-500' : ''
                  }`}
                >
                  {c.name}
                </li>
              ))}
              {typeaheadMatches.length === 0 && (
                <li className="px-2 py-1 text-neutral-400">No match</li>
              )}
            </ul>
          )}
        </div>

        {moreOpen && (
          <div className="rounded border border-neutral-200 p-2 dark:border-neutral-700">
            <input
              ref={moreInputRef}
              type="text"
              value={moreQuery}
              onChange={(e) => setMoreQuery(e.target.value)}
              placeholder="Search all categories"
              className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <ul className="mt-2 max-h-48 divide-y divide-black overflow-auto text-sm">
              {moreMatches.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (c.id !== undefined) {
                        onSelect(c.id)
                      }
                      setMoreOpen(false)
                      setMoreQuery('')
                    }}
                    className={`w-full rounded px-2 py-1 text-left hover:opacity-80 ${c.color ?? 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
              {moreQuery.trim() !== '' && moreMatches.length === 0 && (
                <li>
                  <button
                    type="button"
                    onClick={async () => {
                      const id = await onCreateCategory(moreQuery.trim())
                      onSelect(id)
                      setMoreOpen(false)
                      setMoreQuery('')
                    }}
                    className="w-full rounded px-2 py-1 text-left text-emerald-600 hover:bg-neutral-100 dark:text-emerald-400 dark:hover:bg-neutral-800"
                  >
                    Create "{moreQuery.trim()}"
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    )
  },
)
