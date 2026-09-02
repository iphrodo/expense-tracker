import { describe, expect, it } from 'vitest'
import type { AverageExclusion, MonthFlag, Transaction } from '../db/schema'
import {
  computeAverages,
  computeFoodAverageSummary,
  computeHistoricalTotals,
  computeMonthSummary,
  computeNamedCategoryDailyAverages,
} from './averages'

let nextId = 1

function tx(partial: Partial<Transaction> & Pick<Transaction, 'categoryId' | 'date' | 'amountCents'>): Transaction {
  return { id: nextId++, note: '', ...partial }
}

describe('computeAverages', () => {
  it('divides by every tracked month, not just months a category has transactions in', () => {
    const now = new Date('2026-06-15')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-05', amountCents: 1000 }),
      tx({ categoryId: 1, date: '2026-02-05', amountCents: 1000 }),
      tx({ categoryId: 1, date: '2026-03-05', amountCents: 1000 }),
      tx({ categoryId: 2, date: '2026-01-05', amountCents: 900 }),
      tx({ categoryId: 2, date: '2026-02-05', amountCents: 900 }),
      tx({ categoryId: 2, date: '2026-03-05', amountCents: 900 }),
      tx({ categoryId: 2, date: '2026-04-05', amountCents: 900 }),
      tx({ categoryId: 2, date: '2026-05-05', amountCents: 900 }),
    ]
    const rows = computeAverages(transactions, [], [], now)
    const rowA = rows.find((r) => r.categoryId === 1)
    const rowB = rows.find((r) => r.categoryId === 2)
    // Five distinct months (Jan-May) are tracked overall, so both categories divide by 5.
    expect(rowA?.monthsCounted).toBe(5)
    expect(rowA?.averageDivisorMonths).toBe(5)
    expect(rowA?.average).toBe(600)
    expect(rowB?.monthsCounted).toBe(5)
    expect(rowB?.average).toBe(900)
  })

  it('removes an excluded category-month from the numerator and shrinks the divisor by one', () => {
    const now = new Date('2026-06-15')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-05', amountCents: 1000 }),
      tx({ categoryId: 1, date: '2026-02-05', amountCents: 1000 }),
      tx({ categoryId: 1, date: '2026-03-05', amountCents: 1000 }),
      tx({ categoryId: 1, date: '2026-04-05', amountCents: 1000 }),
    ]
    const exclusions: AverageExclusion[] = [{ id: 1, categoryId: 1, month: '2026-02', reason: '' }]
    const rows = computeAverages(transactions, exclusions, [], now)
    const rowA = rows.find((r) => r.categoryId === 1)
    // 4 tracked months minus 1 excluded month = 3.
    expect(rowA?.monthsCounted).toBe(3)
    expect(rowA?.total).toBe(3000)
    expect(rowA?.periodTotal).toBe(4000)
    expect(rowA?.average).toBe(1000)
  })

  it('shows the unexcluded period total when every tracked month is excluded from the average', () => {
    const now = new Date('2026-06-15')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-05', amountCents: 1000 }),
      tx({ categoryId: 1, date: '2026-02-05', amountCents: 1000 }),
    ]
    const exclusions: AverageExclusion[] = [
      { id: 1, categoryId: 1, month: '2026-01', reason: '' },
      { id: 2, categoryId: 1, month: '2026-02', reason: '' },
    ]
    const rows = computeAverages(transactions, exclusions, [], now)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      categoryId: 1,
      total: 0,
      periodTotal: 2000,
      monthsCounted: 0,
      averageDivisorMonths: 0,
      average: null,
    })
  })

  it('spreads equipment spending over its five-year lifetime', () => {
    const now = new Date('2026-06-15')
    const transactions: Transaction[] = [
      tx({ categoryId: 22, date: '2026-01-05', amountCents: 120000 }),
      tx({ categoryId: 22, date: '2026-02-05', amountCents: -6000 }),
    ]
    const categories = [{ id: 22, name: 'Техніка', isDaily: false }]

    const rows = computeAverages(transactions, [], [], now, categories)

    expect(rows[0]).toMatchObject({
      categoryId: 22,
      total: 114000,
      periodTotal: 114000,
      monthsCounted: 2,
      averageDivisorMonths: 60,
      average: 1900,
    })
  })

  it('summarizes food categories separately using unexcluded totals and their individual averages', () => {
    const now = new Date('2026-03-15')
    const categories = [
      { id: 1, name: 'Продукти', isDaily: true },
      { id: 2, name: 'Алкоголь', isDaily: true },
      { id: 3, name: 'Транспорт', isDaily: true },
    ]
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-05', amountCents: 1000 }),
      tx({ categoryId: 2, date: '2026-02-05', amountCents: 2000 }),
      tx({ categoryId: 3, date: '2026-01-10', amountCents: 9000 }),
    ]
    const exclusions: AverageExclusion[] = [
      { id: 1, categoryId: 2, month: '2026-02', reason: 'event' },
    ]
    const rows = computeAverages(transactions, exclusions, [], now, categories)

    expect(computeFoodAverageSummary(rows, categories)).toEqual({
      totalCents: 3000,
      monthlyAverageCents: 500,
    })
  })

  it('excludes the current month from averages unless a MonthFlag override says complete', () => {
    const now = new Date('2026-06-15')
    const transactions: Transaction[] = [tx({ categoryId: 1, date: '2026-06-05', amountCents: 500 })]

    const withoutFlag = computeAverages(transactions, [], [], now)
    expect(withoutFlag).toHaveLength(0)

    const withFlag = computeAverages(
      transactions,
      [],
      [{ id: 1, month: '2026-06', isComplete: true }],
      now,
    )
    expect(withFlag[0]?.monthsCounted).toBe(1)
    expect(withFlag[0]?.average).toBe(500)
  })

  it('excludes a past month for every category when a MonthFlag marks it incomplete', () => {
    const now = new Date('2026-06-15')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2025-11-05', amountCents: 500 }),
      tx({ categoryId: 2, date: '2025-11-05', amountCents: 700 }),
      tx({ categoryId: 3, date: '2025-11-05', amountCents: 300 }),
      tx({ categoryId: 4, date: '2025-11-05', amountCents: 200 }),
      tx({ categoryId: 5, date: '2025-11-05', amountCents: 100 }),
    ]
    const monthFlags: MonthFlag[] = [{ id: 1, month: '2025-11', isComplete: false }]
    const rows = computeAverages(transactions, [], monthFlags, now)
    expect(rows).toHaveLength(0)
  })

  it('reflects a refund (negative transaction) in the reduced average, not filtered or absoluted', () => {
    const now = new Date('2026-06-15')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-05', amountCents: 10000 }),
      tx({ categoryId: 1, date: '2026-02-05', amountCents: 8000 }),
      tx({ categoryId: 1, date: '2026-02-10', amountCents: -2000 }),
    ]
    const rows = computeAverages(transactions, [], [], now)
    const rowA = rows.find((r) => r.categoryId === 1)
    expect(rowA?.monthsCounted).toBe(2)
    expect(rowA?.total).toBe(16000)
    expect(rowA?.periodTotal).toBe(16000)
    expect(rowA?.average).toBe(8000)
  })
})

describe('computeHistoricalTotals', () => {
  const categories = [
    { id: 1, name: 'Продукти', isDaily: true },
    { id: 2, name: 'Квартира', isDaily: false },
  ]

  it('averages totals across every complete month, ignoring average exclusions entirely', () => {
    const now = new Date('2026-06-15')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-05', amountCents: 10000 }),
      tx({ categoryId: 2, date: '2026-02-05', amountCents: 20000 }),
    ]
    const monthFlags: MonthFlag[] = []
    const result = computeHistoricalTotals(transactions, categories, monthFlags, now)
    expect(result.monthsCount).toBe(2)
    expect(result.firstMonth).toBe('2026-01')
    expect(result.lastMonth).toBe('2026-02')
    expect(result.totalCents).toBe(30000)
    // Jan (31 days) + Feb (28 days) = 59 days.
    expect(result.dailyAverageCents).toBeCloseTo(30000 / 59)
    expect(result.monthlyAverageCents).toBe(15000)
    // Only the Квартира (non-daily) transaction counts, spread over 2 months.
    expect(result.nonDailyMonthlyAverageCents).toBe(10000)
  })

  it('excludes the current (incomplete) month unless a MonthFlag marks it complete', () => {
    const now = new Date('2026-06-15')
    const transactions: Transaction[] = [tx({ categoryId: 1, date: '2026-06-05', amountCents: 5000 })]
    const withoutFlag = computeHistoricalTotals(transactions, categories, [], now)
    expect(withoutFlag.monthsCount).toBe(0)
    expect(withoutFlag.totalCents).toBe(0)

    const withFlag = computeHistoricalTotals(
      transactions,
      categories,
      [{ id: 1, month: '2026-06', isComplete: true }],
      now,
    )
    expect(withFlag.monthsCount).toBe(1)
    expect(withFlag.totalCents).toBe(5000)
  })

  it('returns zeroed stats when there are no complete months', () => {
    const now = new Date('2026-06-15')
    const result = computeHistoricalTotals([], categories, [], now)
    expect(result.monthsCount).toBe(0)
    expect(result.totalCents).toBe(0)
    expect(result.firstMonth).toBeNull()
    expect(result.lastMonth).toBeNull()
    expect(result.dailyAverageCents).toBe(0)
    expect(result.monthlyAverageCents).toBe(0)
    expect(result.nonDailyMonthlyAverageCents).toBe(0)
  })
})

describe('computeNamedCategoryDailyAverages', () => {
  const foodCategories = [
    { id: 1, name: 'Іжа в закладі', isDaily: true },
    { id: 2, name: 'Іжа на виніс', isDaily: true },
    { id: 3, name: 'Продукти', isDaily: true },
  ]
  const treatCategories = [
    { id: 4, name: 'Солодке', isDaily: true },
    { id: 5, name: 'Алкоголь', isDaily: true },
    { id: 6, name: 'Снеки', isDaily: true },
  ]

  it('sums every category in a group, divided by days elapsed', () => {
    const now = new Date('2026-06-14')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-06-05', amountCents: 40000 }),
      tx({ categoryId: 2, date: '2026-06-06', amountCents: 20000 }),
      tx({ categoryId: 3, date: '2026-06-07', amountCents: 10000 }),
    ]
    const rows = computeNamedCategoryDailyAverages(transactions, foodCategories, '2026-06', now)
    const row = rows.find((r) => r.label === 'тільки їжа')
    expect(row?.dailyRateCents).toBe(5000)
  })

  it('yields a zero average for a group with no transactions this month', () => {
    const now = new Date('2026-06-14')
    const rows = computeNamedCategoryDailyAverages([], treatCategories, '2026-06', now)
    const row = rows.find((r) => r.label === 'солодке+алк+чіпси')
    expect(row?.dailyRateCents).toBe(0)
  })

  it('yields a zero average when none of a group categories exist in the database', () => {
    const now = new Date('2026-06-14')
    const rows = computeNamedCategoryDailyAverages([], [], '2026-06', now)
    expect(rows.find((r) => r.label === 'тільки їжа')?.dailyRateCents).toBe(0)
    expect(rows.find((r) => r.label === 'солодке+алк+чіпси')?.dailyRateCents).toBe(0)
  })

  it('uses a divisor of 1 on the first day of the month', () => {
    const now = new Date('2026-06-01')
    const transactions: Transaction[] = [tx({ categoryId: 3, date: '2026-06-01', amountCents: 4000 })]
    const rows = computeNamedCategoryDailyAverages(transactions, foodCategories, '2026-06', now)
    expect(rows.find((r) => r.label === 'тільки їжа')?.dailyRateCents).toBe(4000)
  })

  it('reflects a refund reducing a group daily average', () => {
    const now = new Date('2026-06-10')
    const transactions: Transaction[] = [
      tx({ categoryId: 4, date: '2026-06-05', amountCents: 50000 }),
      tx({ categoryId: 5, date: '2026-06-06', amountCents: -10000 }),
    ]
    const rows = computeNamedCategoryDailyAverages(transactions, treatCategories, '2026-06', now)
    expect(rows.find((r) => r.label === 'солодке+алк+чіпси')?.dailyRateCents).toBe(4000)
  })

  it('uses the full days-in-month divisor for a past month', () => {
    const now = new Date('2026-06-10')
    const transactions: Transaction[] = [tx({ categoryId: 3, date: '2026-04-15', amountCents: 12000 })]
    const rows = computeNamedCategoryDailyAverages(transactions, foodCategories, '2026-04', now)
    expect(rows.find((r) => r.label === 'тільки їжа')?.dailyRateCents).toBe(400)
  })
})

describe('computeMonthSummary', () => {
  const categories = [
    { id: 1, name: 'Продукти', isDaily: true },
    { id: 2, name: 'Квартира', isDaily: false },
  ]

  it('splits the month total into daily and non-daily, and carries the daily rate through the remaining days', () => {
    const now = new Date('2026-06-10')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-06-05', amountCents: 50000 }),
      tx({ categoryId: 2, date: '2026-06-02', amountCents: 30000 }),
    ]
    const summary = computeMonthSummary(transactions, categories, '2026-06', now)
    expect(summary.totalCents).toBe(80000)
    expect(summary.dailyCents).toBe(50000)
    expect(summary.nonDailyCents).toBe(30000)
    expect(summary.dailyRateCents).toBe(5000)
    // Already spent (80000) + daily rate (5000) * 20 remaining days, non-daily
    // so far (30000) already exceeds the (zero, no history) typical amount.
    expect(summary.totalProjectedCents).toBe(180000)
  })

  it('adds the typical non-daily spend when this month has not reached it yet', () => {
    const now = new Date('2026-06-10')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-06-05', amountCents: 50000 }),
      tx({ categoryId: 2, date: '2026-06-02', amountCents: 3000 }),
    ]
    // Rent is usually 50000/month but only 3000 has landed so far this month.
    const summary = computeMonthSummary(transactions, categories, '2026-06', now, 50000)
    // dailyCents (50000) + dailyRate (5000) * 20 remaining + typical non-daily (50000, since it beats the 3000 spent so far).
    expect(summary.totalProjectedCents).toBe(200000)
  })

  it('collapses the projection to the actual total once the month has ended', () => {
    const now = new Date('2026-06-10')
    const transactions: Transaction[] = [tx({ categoryId: 1, date: '2026-04-15', amountCents: 12000 })]
    const summary = computeMonthSummary(transactions, categories, '2026-04', now, 99999)
    expect(summary.dailyRateCents).toBe(400)
    expect(summary.totalProjectedCents).toBe(12000)
  })

  it('excludes transactions from other months', () => {
    const now = new Date('2026-06-10')
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-05-05', amountCents: 99999 }),
      tx({ categoryId: 1, date: '2026-06-05', amountCents: 1000 }),
    ]
    const summary = computeMonthSummary(transactions, categories, '2026-06', now)
    expect(summary.totalCents).toBe(1000)
  })
})
