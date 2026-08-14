import { describe, expect, it } from 'vitest'
import type { AverageExclusion, MonthFlag, Transaction } from '../db/schema'
import {
  computeAverages,
  computeDailyRunRate,
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
    expect(rowA?.average).toBe(1000)
  })

  it('guards division by zero when every tracked month is excluded for a category', () => {
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
    expect(rows).toHaveLength(0)
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
    expect(rowA?.average).toBe(8000)
  })
})

describe('computeDailyRunRate', () => {
  it('divides by days elapsed, including today, and projects to a full month', () => {
    const now = new Date('2026-06-10')
    const categories = [{ id: 1, name: 'Food', isDaily: true }]
    const transactions: Transaction[] = [tx({ categoryId: 1, date: '2026-06-05', amountCents: 15000 })]
    const result = computeDailyRunRate(transactions, categories, now)
    expect(result.daysElapsed).toBe(10)
    expect(result.dailyRateCents).toBe(1500)
    expect(result.daysInMonth).toBe(30)
    expect(result.projectedCents).toBe(45000)
  })

  it('reflects a refund that reduces the current month total in the run-rate', () => {
    const now = new Date('2026-06-10')
    const categories = [{ id: 1, name: 'Food', isDaily: true }]
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-06-05', amountCents: 15000 }),
      tx({ categoryId: 1, date: '2026-06-06', amountCents: -2000 }),
    ]
    const result = computeDailyRunRate(transactions, categories, now)
    expect(result.dailyRateCents).toBe(1300)
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

  it('splits the month total into daily and non-daily, and projects the daily rate', () => {
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
    expect(summary.projectedCents).toBe(150000)
  })

  it('uses the full days-in-month divisor and projection for a past month', () => {
    const now = new Date('2026-06-10')
    const transactions: Transaction[] = [tx({ categoryId: 1, date: '2026-04-15', amountCents: 12000 })]
    const summary = computeMonthSummary(transactions, categories, '2026-04', now)
    expect(summary.dailyRateCents).toBe(400)
    expect(summary.projectedCents).toBe(12000)
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
