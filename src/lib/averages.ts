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

  const allMonths = new Set(
    transactions.map((tx) => monthOf(tx.date)).filter((month) => isMonthComplete(month, now, monthFlags)),
  )

  const totalsByCategory = new Map<number, number>()
  for (const tx of eligible) {
    totalsByCategory.set(tx.categoryId, (totalsByCategory.get(tx.categoryId) ?? 0) + tx.amountCents)
  }

  const excludedMonthsByCategory = new Map<number, number>()
  for (const e of exclusions) {
    if (!allMonths.has(e.month)) {
      continue
    }
    excludedMonthsByCategory.set(e.categoryId, (excludedMonthsByCategory.get(e.categoryId) ?? 0) + 1)
  }

  const rows: AverageRow[] = []
  for (const [categoryId, total] of totalsByCategory) {
    const monthsCounted = allMonths.size - (excludedMonthsByCategory.get(categoryId) ?? 0)
    rows.push({
      categoryId,
      total,
      monthsCounted,
      average: monthsCounted <= 0 ? null : total / monthsCounted,
    })
  }
  return rows
}

export interface HistoricalTotals {
  totalCents: number
  monthsCount: number
  firstMonth: string | null
  lastMonth: string | null
  dailyAverageCents: number
  monthlyAverageCents: number
  nonDailyMonthlyAverageCents: number
}

export function computeHistoricalTotals(
  transactions: Transaction[],
  categories: Category[],
  monthFlags: MonthFlag[],
  now: Date,
): HistoricalTotals {
  const dailyCategoryIds = new Set(categories.filter((c) => c.isDaily).map((c) => c.id))

  const completeMonths = new Set(
    transactions.map((tx) => monthOf(tx.date)).filter((month) => isMonthComplete(month, now, monthFlags)),
  )

  const eligible = transactions.filter((tx) => completeMonths.has(monthOf(tx.date)))
  const totalCents = eligible.reduce((sum, tx) => sum + tx.amountCents, 0)
  const nonDailyCents = eligible
    .filter((tx) => !dailyCategoryIds.has(tx.categoryId))
    .reduce((sum, tx) => sum + tx.amountCents, 0)

  const sortedMonths = [...completeMonths].sort()
  const monthsCount = sortedMonths.length
  const totalDays = sortedMonths.reduce((sum, month) => sum + daysInMonthOf(month), 0)

  return {
    totalCents,
    monthsCount,
    firstMonth: sortedMonths[0] ?? null,
    lastMonth: sortedMonths[sortedMonths.length - 1] ?? null,
    dailyAverageCents: totalDays === 0 ? 0 : totalCents / totalDays,
    monthlyAverageCents: monthsCount === 0 ? 0 : totalCents / monthsCount,
    nonDailyMonthlyAverageCents: monthsCount === 0 ? 0 : nonDailyCents / monthsCount,
  }
}

function daysInMonthOf(month: string): number {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m), 0).getDate()
}

function daysElapsedIn(month: string, now: Date): number {
  return month === currentMonth(now) ? now.getDate() : daysInMonthOf(month)
}

export interface NamedCategoryGroup {
  label: string
  categoryNames: string[]
}

export const DETAIL_CATEGORY_GROUPS: NamedCategoryGroup[] = [
  { label: 'тільки їжа', categoryNames: ['Іжа в закладі', 'Іжа на виніс', 'Продукти'] },
  { label: 'солодке+алк+чіпси', categoryNames: ['Солодке', 'Алкоголь', 'Снеки'] },
]

export interface NamedCategoryDailyAverage {
  label: string
  dailyRateCents: number
}

export function computeNamedCategoryDailyAverages(
  transactions: Transaction[],
  categories: Category[],
  month: string,
  now: Date,
): NamedCategoryDailyAverage[] {
  const daysElapsed = daysElapsedIn(month, now)

  return DETAIL_CATEGORY_GROUPS.map(({ label, categoryNames }) => {
    const categoryIds = new Set(
      categories.filter((c) => categoryNames.includes(c.name)).map((c) => c.id),
    )
    const totalCents = transactions
      .filter((tx) => categoryIds.has(tx.categoryId) && monthOf(tx.date) === month)
      .reduce((sum, tx) => sum + tx.amountCents, 0)
    const dailyRateCents = daysElapsed === 0 ? 0 : totalCents / daysElapsed
    return { label, dailyRateCents }
  })
}

export interface MonthSummary {
  totalCents: number
  nonDailyCents: number
  dailyCents: number
  dailyRateCents: number
  totalProjectedCents: number
}

/**
 * Projects the month's total spend as: money already spent, plus the current
 * daily-category pace carried through the remaining days, plus whichever is
 * bigger of this month's non-daily spend so far or the typical monthly
 * non-daily spend (one-off bills that haven't landed yet still get budgeted
 * for). For a month that has already ended, this collapses to the actual total.
 */
export function computeMonthSummary(
  transactions: Transaction[],
  categories: Category[],
  month: string,
  now: Date,
  typicalNonDailyMonthlyCents = 0,
): MonthSummary {
  const dailyCategoryIds = new Set(categories.filter((c) => c.isDaily).map((c) => c.id))
  const monthTransactions = transactions.filter((tx) => monthOf(tx.date) === month)

  const totalCents = monthTransactions.reduce((sum, tx) => sum + tx.amountCents, 0)
  const dailyCents = monthTransactions
    .filter((tx) => dailyCategoryIds.has(tx.categoryId))
    .reduce((sum, tx) => sum + tx.amountCents, 0)
  const nonDailyCents = totalCents - dailyCents

  const daysElapsed = daysElapsedIn(month, now)
  const dailyRateCents = daysElapsed === 0 ? 0 : dailyCents / daysElapsed
  const daysRemaining = daysInMonthOf(month) - daysElapsed

  const totalProjectedCents =
    daysRemaining <= 0
      ? totalCents
      : dailyCents + dailyRateCents * daysRemaining + Math.max(nonDailyCents, typicalNonDailyMonthlyCents)

  return { totalCents, nonDailyCents, dailyCents, dailyRateCents, totalProjectedCents }
}
