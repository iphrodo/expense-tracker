import { useRef, useState } from 'react'
import type { Category, Transaction } from '../../db/schema'
import { parseAmountExpression } from '../../lib/expressionParser'
import { formatCents } from '../../lib/money'
import { deleteTransaction, restoreTransaction, updateTransaction } from '../../db/repository'
import { useToast } from '../../app/ToastProvider'
import { CategorySelector } from './CategorySelector'

interface EditTransactionPanelProps {
  transaction: Transaction
  rankedCategories: Category[]
  onCreateCategory: (name: string) => Promise<number>
  onClose: () => void
}

export function EditTransactionPanel({
  transaction,
  rankedCategories,
  onCreateCategory,
  onClose,
}: EditTransactionPanelProps) {
  const { showUndoToast, showErrorToast } = useToast()
  const [amount, setAmount] = useState(formatCents(transaction.amountCents))
  const [error, setError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<number>(transaction.categoryId)
  const [date, setDate] = useState(transaction.date)
  const [note, setNote] = useState(transaction.note)
  const typeaheadRef = useRef<HTMLInputElement>(null)

  async function handleSave(categoryOverride?: number) {
    const parsed = parseAmountExpression(amount, { editMode: true })
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    try {
      await updateTransaction(transaction.id, {
        amountCents: parsed.centsPerTerm[0] ?? 0,
        categoryId: categoryOverride ?? categoryId,
        date,
        note,
      })
      onClose()
    } catch {
      showErrorToast('Could not save changes')
    }
  }

  async function handleDelete() {
    try {
      const removed = await deleteTransaction(transaction.id)
      onClose()
      if (removed) {
        showUndoToast('Transaction deleted', () => {
          void restoreTransaction(removed)
        })
      }
    } catch {
      showErrorToast('Could not delete transaction')
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl dark:bg-neutral-900">
        <h2 className="mb-3 text-lg font-semibold">Edit transaction</h2>

        <input
          type="text"
          inputMode="text"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (error) setError(null)
          }}
          aria-label="Amount"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-xl dark:border-neutral-700 dark:bg-neutral-800"
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

        <div className="mt-3">
          <CategorySelector
            ref={typeaheadRef}
            rankedCategories={rankedCategories}
            selectedCategoryId={categoryId}
            onSelect={setCategoryId}
            onCreateCategory={onCreateCategory}
            onSubmit={(id) => void handleSave(id)}
          />
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-3 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        />

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          className="mt-3 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />

        <div className="mt-4 flex justify-between">
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
