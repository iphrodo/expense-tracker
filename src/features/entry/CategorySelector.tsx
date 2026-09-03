import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from 'react'
import type { Category } from '../../db/schema'
import { getCategoryColorRoles } from '../../lib/categoryColor'

const CHIP_COUNT = 10

export interface CategorySelectorHandle {
  focus: () => void
}

interface CategoryPickerProps {
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

/** Top `CHIP_COUNT` categories by rank, with the selected category promoted to the front if it
 *  would otherwise fall outside that slice (e.g. just chosen from the "All" picker). */
// eslint-disable-next-line react-refresh/only-export-components -- this hook is intentionally colocated with its category UI helpers.
export function useCategoryChips(
  rankedCategories: Category[],
  selectedCategoryId: number | null,
): Category[] {
  return useMemo(() => {
    const top = rankedCategories.slice(0, CHIP_COUNT)
    if (selectedCategoryId == null || top.some((c) => c.id === selectedCategoryId)) {
      return top
    }
    const selected = rankedCategories.find((c) => c.id === selectedCategoryId)
    if (!selected) return top
    return [selected, ...top.slice(0, CHIP_COUNT - 1)]
  }, [rankedCategories, selectedCategoryId])
}

export function CategoryChipsRow({
  chips,
  selectedCategoryId,
  onSelect,
  scroll = true,
  className = '',
}: {
  chips: Category[]
  selectedCategoryId: number | null
  onSelect: (id: number) => void
  scroll?: boolean
  className?: string
}) {
  return (
    <div
      className={`chip-scroll flex gap-1.5 ${scroll ? 'flex-nowrap overflow-x-auto' : 'flex-wrap'} ${className}`}
      style={scroll ? { maskImage: 'linear-gradient(to right, #000 88%, transparent)' } : undefined}
    >
      {chips.map((c) => {
        const roles = getCategoryColorRoles(c)
        const selected = c.id === selectedCategoryId
        return (
          <button
            key={c.id}
            type="button"
            tabIndex={-1}
            onClick={() => c.id !== undefined && onSelect(c.id)}
            style={{
              backgroundColor: roles.tint,
              color: roles.text,
              boxShadow: selected ? `inset 0 0 0 1.5px ${roles.dot}` : undefined,
            }}
            className="t-meta h-[30px] flex-none whitespace-nowrap rounded-full px-[11px] font-medium transition-opacity duration-[120ms] ease-out hover:opacity-90"
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}

interface CategoryAllPickerProps extends CategoryPickerProps {
  label: ReactNode
  className?: string
  /** Which trigger edge anchors the dropdown. History uses left alignment to stay in viewport. */
  panelAlign?: 'left' | 'right'
  /** History/filter contexts select existing categories only. */
  allowCreate?: boolean
}

/** Trigger pill that opens the full searchable category picker next to its trigger,
 *  with keyboard navigation and inline category creation. */
export const CategoryAllPicker = forwardRef<CategorySelectorHandle, CategoryAllPickerProps>(
  function CategoryAllPicker(
    { rankedCategories, selectedCategoryId, onSelect, onCreateCategory, onSubmit, label, className = '', panelAlign = 'right', allowCreate = true },
    handleRef,
  ) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [highlightIndex, setHighlightIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    const matches = useMemo(() => filterByPrefix(rankedCategories, query), [rankedCategories, query])

    function openPanel() {
      setOpen(true)
      setQuery('')
      setHighlightIndex(-1)
      if (window.matchMedia('(pointer: fine)').matches) {
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    }
    function closePanel() {
      setOpen(false)
      setQuery('')
    }

    useImperativeHandle(handleRef, () => ({ focus: openPanel }))

    useEffect(() => {
      if (!open) return
      function handleKey(e: globalThis.KeyboardEvent) {
        if (e.key === 'Escape') closePanel()
      }
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }, [open])

    function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIndex((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const resolved = matches[highlightIndex] ?? matches[0]
        if (resolved?.id !== undefined) {
          onSelect(resolved.id)
          onSubmit(resolved.id)
          closePanel()
        } else {
          onSubmit()
        }
      }
    }

    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (open ? closePanel() : openPanel())}
          className="t-meta flex h-[30px] flex-none items-center whitespace-nowrap rounded-full border border-dashed border-border-strong px-[11px] font-medium text-text-2"
        >
          {label}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={closePanel} />
            <div className={`absolute top-[calc(100%+8px)] z-50 w-[min(20rem,calc(100vw-2rem))] max-h-96 overscroll-contain rounded-lg border border-border bg-surface p-s3 shadow-2 ${panelAlign === 'left' ? 'left-0' : 'right-0'}`}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHighlightIndex(-1)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search categories"
                aria-label="Search categories"
                className="h-11 w-full rounded-sm border border-border px-s2 text-sm text-text outline-none focus:outline-none"
              />
              <ul className="mt-s2 max-h-64 divide-y divide-border overflow-auto overscroll-contain text-sm">
                {matches.map((c, i) => {
                  const roles = getCategoryColorRoles(c)
                  return (
                    <li
                      key={c.id}
                      style={{ backgroundColor: i === highlightIndex ? roles.tint : undefined }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (c.id !== undefined) onSelect(c.id)
                          closePanel()
                        }}
                        className="flex w-full items-center gap-s2 rounded-sm px-s2 py-s2 text-left hover:opacity-80"
                      >
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: roles.dot,
                            boxShadow: c.id === selectedCategoryId ? `0 0 0 2px ${roles.dot}55` : undefined,
                          }}
                        />
                        <span style={{ color: roles.text }}>{c.name}</span>
                      </button>
                    </li>
                  )
                })}
                {allowCreate && query.trim() !== '' && matches.length === 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={async () => {
                        const id = await onCreateCategory(query.trim())
                        onSelect(id)
                        closePanel()
                      }}
                      className="w-full rounded-sm px-s2 py-s2 text-left text-accent hover:bg-surface-2"
                    >
                      Create "{query.trim()}"
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    )
  },
)

/** Convenience wrapper combining the chip row and the "All categories" picker in a single
 *  wrapping flex row, for contexts (e.g. the edit-transaction modal) that don't need the
 *  entry form's responsive multi-row layout. */
export const CategorySelector = forwardRef<CategorySelectorHandle, CategoryPickerProps>(
  function CategorySelector(props, handleRef) {
    const chips = useCategoryChips(props.rankedCategories, props.selectedCategoryId)
    return (
      <div className="flex flex-wrap items-center gap-s2">
        <CategoryChipsRow
          chips={chips}
          selectedCategoryId={props.selectedCategoryId}
          onSelect={props.onSelect}
          scroll={false}
        />
        <CategoryAllPicker ref={handleRef} {...props} label="All categories" />
      </div>
    )
  },
)
