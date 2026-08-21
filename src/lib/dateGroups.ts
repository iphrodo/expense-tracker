import type { Transaction } from '../db/schema'

export interface DateGroup {
  date: string
  txs: Transaction[]
  totalCents: number
}

/**
 * Sorts by day (newest first) and groups into per-day buckets with running totals. When
 * `selectedCategoryId` is set, transactions in other categories are excluded before grouping, so
 * day totals and which days appear at all are naturally restricted to that category.
 */
export function groupTransactionsByDay(
  transactions: Transaction[],
  selectedCategoryId: number | null,
): DateGroup[] {
  const filtered =
    selectedCategoryId === null ? transactions : transactions.filter((tx) => tx.categoryId === selectedCategoryId)

  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.id - a.id
  })

  const groups: DateGroup[] = []
  for (const tx of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === tx.date) {
      last.txs.push(tx)
      last.totalCents += tx.amountCents
    } else {
      groups.push({ date: tx.date, txs: [tx], totalCents: tx.amountCents })
    }
  }
  return groups
}
