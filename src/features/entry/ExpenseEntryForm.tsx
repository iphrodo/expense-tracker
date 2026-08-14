import { useEffect, useMemo, useRef, useState } from 'react'
import { parseAmountExpression } from '../../lib/expressionParser'
import { rankCategoriesByRecency } from '../../lib/categoryRanking'
import {
  createTransactions,
  deleteTransactions,
  getOrCreateCategory,
  useCategories,
  useTransactions,
} from '../../db/repository'
import { useToast } from '../../app/ToastProvider'
import { CategorySelector } from './CategorySelector'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayOf(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function ExpenseEntryForm() {
  const categories = useCategories()
  const transactions = useTransactions()
  const { showUndoToast } = useToast()

  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [date, setDate] = useState(todayIso())
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [categoryResetKey, setCategoryResetKey] = useState(0)

  const amountRef = useRef<HTMLInputElement>(null)
  const categoryTypeaheadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  const rankedCategories = useMemo(
    () => rankCategoriesByRecency(categories, transactions, new Date()),
    [categories, transactions],
  )

  async function handleSave(categoryOverride?: number) {
    const categoryId = categoryOverride ?? selectedCategoryId
    const parsed = parseAmountExpression(amount)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    if (categoryId === null || categoryId === undefined) {
      setError('Select a category')
      return
    }
    setError(null)

    const entries = parsed.centsPerTerm.map((amountCents) => ({
      amountCents,
      categoryId,
      date,
      note,
    }))

    const savedCount = entries.length
    const idsPromise = createTransactions(entries)

    setAmount('')
    setSelectedCategoryId(null)
    setNote('')
    setNoteOpen(false)
    setCategoryResetKey((k) => k + 1)
    amountRef.current?.focus()

    const ids = await idsPromise
    showUndoToast(
      savedCount === 1 ? 'Transaction saved' : `${savedCount} transactions saved`,
      () => {
        void deleteTransactions(ids)
      },
    )
  }

  async function handleCreateCategory(name: string): Promise<number> {
    return getOrCreateCategory(name, false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <input
          ref={amountRef}
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (selectedCategoryId !== null) {
                void handleSave()
              } else {
                categoryTypeaheadRef.current?.focus()
              }
            }
          }}
          placeholder="Amount, e.g. 5.96+4.22"
          aria-label="Amount"
          autoFocus
          className="w-full rounded border border-neutral-300 px-3 py-3 text-2xl dark:border-neutral-700 dark:bg-neutral-900"
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>

      <CategorySelector
        key={categoryResetKey}
        ref={categoryTypeaheadRef}
        rankedCategories={rankedCategories}
        selectedCategoryId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
        onCreateCategory={handleCreateCategory}
        onSubmit={(categoryId) => void handleSave(categoryId)}
      />

      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setDate((d) => yesterdayOf(d))}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700"
        >
          Yesterday
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={() => setDate(todayIso())}
          className="text-neutral-500 underline"
        >
          Today
        </button>
      </div>

      <div>
        {!noteOpen ? (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="text-sm text-neutral-500 underline"
          >
            Add note
          </button>
        ) : (
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Note"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
      >
        Save
      </button>
    </div>
  )
}
