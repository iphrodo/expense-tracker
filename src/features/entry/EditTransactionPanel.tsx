import { useRef, useState } from 'react'
import type { Category, Transaction } from '../../db/schema'
import { parseAmountExpression } from '../../lib/expressionParser'
import { formatCents } from '../../lib/money'
import { deleteTransaction, restoreTransaction, updateTransaction } from '../../db/repository'
import { useToast } from '../../app/ToastProvider'
import { CategorySelector, type CategorySelectorHandle } from './CategorySelector'

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
  const typeaheadRef = useRef<CategorySelectorHandle>(null)

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-s4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-s4 shadow-2">
        <h2 className="t-h2 mb-s3 text-text">Edit transaction</h2>

        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (error) setError(null)
          }}
          aria-label="Amount"
          className="t-display tabular-amount h-14 w-full rounded-md border border-border-strong bg-surface px-s3 text-text focus:border-accent"
        />
        {error && <p className="mt-1 text-sm text-error">{error}</p>}

        <div className="mt-s3">
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
          className="mt-s3 h-11 rounded-sm border border-border-strong bg-surface px-s2 text-text"
        />

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          className="mt-s3 h-11 w-full rounded-sm border border-border px-s3 text-sm text-text placeholder:text-text-3"
        />

        <div className="mt-s4 flex justify-between">
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="t-body h-11 rounded-md px-s3 font-semibold text-error hover:bg-error-weak"
          >
            Delete
          </button>
          <div className="flex gap-s2">
            <button
              type="button"
              onClick={onClose}
              className="t-body h-11 rounded-md px-s3 text-text-2 hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              className="t-body h-11 rounded-md bg-accent px-s3 font-semibold text-on-accent hover:bg-accent-hover active:bg-accent-press"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
