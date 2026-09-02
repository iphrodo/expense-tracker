import type { Transaction } from '../db/schema'

export interface CategoryHistoryMonth {
  month: string
  year: number
  monthIndex: number
  totalCents: number
  transactions: Transaction[]
  barMagnitude: number
}

/** Builds the active calendar months for one category, newest first, from reactive transaction data. */
export function groupCategoryHistoryByMonth(
  transactions: Transaction[],
  categoryId: number,
): CategoryHistoryMonth[] {
  const monthsByKey = new Map<string, CategoryHistoryMonth>()

  for (const tx of transactions) {
    if (tx.categoryId !== categoryId) continue
    const month = tx.date.slice(0, 7)
    const year = Number(tx.date.slice(0, 4))
    const monthIndex = Number(tx.date.slice(5, 7)) - 1
    if (monthIndex < 0 || monthIndex > 11) continue
    const entry = monthsByKey.get(month) ?? { month, year, monthIndex, totalCents: 0, transactions: [], barMagnitude: 0 }
    entry.transactions.push(tx)
    entry.totalCents += tx.amountCents
    monthsByKey.set(month, entry)
  }

  const months = [...monthsByKey.values()].sort((a, b) => (a.month < b.month ? 1 : -1))
  for (const month of months) {
    month.transactions.sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1))
  }

  const maximum = Math.max(0, ...months.map((month) => Math.abs(month.totalCents)))
  return months.map((month) => ({
    ...month,
    barMagnitude: maximum === 0 ? 0 : Math.abs(month.totalCents) / maximum,
  }))
}
