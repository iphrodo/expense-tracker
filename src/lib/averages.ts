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
  projectedCents: number
}

export function computeMonthSummary(
  transactions: Transaction[],
  categories: Category[],
  month: string,
  now: Date,
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
  const projectedCents = dailyRateCents * daysInMonthOf(month)

  return { totalCents, nonDailyCents, dailyCents, dailyRateCents, projectedCents }
}
