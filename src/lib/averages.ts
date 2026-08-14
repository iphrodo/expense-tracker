import type { AverageExclusion, Category, MonthFlag, Transaction } from '../db/schema'

export function monthOf(date: string): string {
  return date.slice(0, 7)
}

export function currentMonth(now: Date): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function isMonthComplete(month: string, now: Date, monthFlags: MonthFlag[]): boolean {
  const flag = monthFlags.find((f) => f.month === month)
  if (flag) {
    return flag.isComplete
  }
  return month < currentMonth(now)
}

export interface AverageRow {
  categoryId: number
  total: number
  monthsCounted: number
  average: number | null
}

export function computeAverages(
  transactions: Transaction[],
  exclusions: AverageExclusion[],
  monthFlags: MonthFlag[],
  now: Date,
): AverageRow[] {
  const exclusionKeys = new Set(exclusions.map((e) => `${e.categoryId}|${e.month}`))

  const eligible = transactions.filter((tx) => {
    const month = monthOf(tx.date)
    if (!isMonthComplete(month, now, monthFlags)) {
      return false
    }
    if (exclusionKeys.has(`${tx.categoryId}|${month}`)) {
      return false
    }
    return true
  })

  const byCategory = new Map<number, { total: number; months: Set<string> }>()
  for (const tx of eligible) {
    const entry = byCategory.get(tx.categoryId) ?? { total: 0, months: new Set<string>() }
    entry.total += tx.amountCents
    entry.months.add(monthOf(tx.date))
    byCategory.set(tx.categoryId, entry)
  }

  const rows: AverageRow[] = []
  for (const [categoryId, { total, months }] of byCategory) {
    const monthsCounted = months.size
    rows.push({
      categoryId,
      total,
      monthsCounted,
      average: monthsCounted === 0 ? null : total / monthsCounted,
    })
  }
  return rows
}

export interface DailyRunRate {
  totalCents: number
  daysElapsed: number
  dailyRateCents: number
  daysInMonth: number
  projectedCents: number
}

export function computeDailyRunRate(
  transactions: Transaction[],
  categories: Category[],
  now: Date,
): DailyRunRate {
  const dailyCategoryIds = new Set(categories.filter((c) => c.isDaily).map((c) => c.id))
  const month = currentMonth(now)
  const totalCents = transactions
    .filter((tx) => monthOf(tx.date) === month && dailyCategoryIds.has(tx.categoryId))
    .reduce((sum, tx) => sum + tx.amountCents, 0)

  const daysElapsed = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dailyRateCents = daysElapsed === 0 ? 0 : totalCents / daysElapsed
  const projectedCents = dailyRateCents * daysInMonth

  return { totalCents, daysElapsed, dailyRateCents, daysInMonth, projectedCents }
}
