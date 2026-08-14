import { useMemo, useState } from 'react'
import type { Transaction } from '../../db/schema'
import { monthOf } from '../../lib/averages'
import { rankCategoriesByRecency } from '../../lib/categoryRanking'
import { formatCents } from '../../lib/money'
import {
  getOrCreateCategory,
  removeExclusion,
  setExclusion,
  setMonthFlag,
  clearMonthFlag,
  useCategories,
  useExclusions,
  useMonthFlags,
  useTransactions,
} from '../../db/repository'
import { EditTransactionPanel } from '../entry/EditTransactionPanel'

function currentMonthIso(): string {
  return new Date().toISOString().slice(0, 7)
}

export function MonthView() {
  const categories = useCategories()
  const transactions = useTransactions()
  const exclusions = useExclusions()
  const monthFlags = useMonthFlags()

  const [month, setMonth] = useState(currentMonthIso())
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const rankedCategories = useMemo(
    () => rankCategoriesByRecency(categories, transactions, new Date()),
    [categories, transactions],
  )

  const monthTransactions = useMemo(
    () => transactions.filter((tx) => monthOf(tx.date) === month),
    [transactions, month],
  )

  const grouped = useMemo(() => {
    const map = new Map<number, Transaction[]>()
    for (const tx of monthTransactions) {
      const list = map.get(tx.categoryId) ?? []
      list.push(tx)
      map.set(tx.categoryId, list)
    }
    return [...map.entries()].sort((a, b) => {
      const nameA = categoryById.get(a[0])?.name ?? ''
      const nameB = categoryById.get(b[0])?.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [monthTransactions, categoryById])

  const monthTotal = monthTransactions.reduce((sum, tx) => sum + tx.amountCents, 0)

  const exclusionKeys = useMemo(
    () => new Set(exclusions.map((e) => `${e.categoryId}|${e.month}`)),
    [exclusions],
  )
  const monthFlag = monthFlags.find((f) => f.month === month)

  async function toggleExclusion(categoryId: number) {
    const key = `${categoryId}|${month}`
    if (exclusionKeys.has(key)) {
      await removeExclusion(categoryId, month)
    } else {
      const reason = window.prompt('Reason for excluding this category-month (optional)') ?? ''
      await setExclusion(categoryId, month, reason)
    }
  }

  async function toggleMonthComplete() {
    if (monthFlag) {
      if (monthFlag.isComplete) {
        await setMonthFlag(month, false)
      } else {
        await clearMonthFlag(month)
      }
    } else {
      await setMonthFlag(month, true)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={() => void toggleMonthComplete()}
          className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700"
        >
          {monthFlag ? (monthFlag.isComplete ? 'Marked complete' : 'Marked incomplete') : 'Mark complete/incomplete'}
        </button>
        <span className="text-lg font-semibold sm:ml-auto">
          Total: {formatCents(monthTotal)}
        </span>
      </div>

      {grouped.length === 0 && <p className="text-neutral-500">No transactions this month.</p>}

      {grouped.map(([categoryId, txs]) => {
        const subtotal = txs.reduce((sum, tx) => sum + tx.amountCents, 0)
        const excluded = exclusionKeys.has(`${categoryId}|${month}`)
        return (
          <div key={categoryId} className="rounded border border-neutral-200 p-3 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {categoryById.get(categoryId)?.name ?? 'Unknown'}
                {excluded && (
                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    excluded from averages
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <span className="font-mono">{formatCents(subtotal)}</span>
                <button
                  type="button"
                  onClick={() => void toggleExclusion(categoryId)}
                  className="text-xs text-neutral-500 underline"
                >
                  {excluded ? 'include' : 'exclude'}
                </button>
              </div>
            </div>
            <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
              {txs.map((tx) => (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => setEditingTx(tx)}
                    className="flex w-full items-center justify-between py-1 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span>
                      {tx.date}
                      {tx.note && <span className="ml-2 text-neutral-400">{tx.note}</span>}
                    </span>
                    <span className="font-mono">{formatCents(tx.amountCents)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {editingTx && (
        <EditTransactionPanel
          transaction={editingTx}
          rankedCategories={rankedCategories}
          onCreateCategory={(name) => getOrCreateCategory(name, false)}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  )
}
