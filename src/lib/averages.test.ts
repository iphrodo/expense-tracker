import { describe, expect, it } from 'vitest'
import type { AverageExclusion, MonthFlag, Transaction } from '../db/schema'
import { computeAverages, computeDailyRunRate } from './averages'

let nextId = 1

function tx(partial: Partial<Transaction> & Pick<Transaction, 'categoryId' | 'date' | 'amountCents'>): Transaction {
  return { id: nextId++, note: '', ...partial }
}

describe('computeAverages', () => {
  it('uses a per-category divisor that differs by category', () => {
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
    expect(rowA?.monthsCounted).toBe(3)
    expect(rowA?.average).toBe(1000)
    expect(rowB?.monthsCounted).toBe(5)
    expect(rowB?.average).toBe(900)
  })

  it('removes an excluded category-month from both numerator and divisor', () => {
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
    expect(rowA?.monthsCounted).toBe(3)
    expect(rowA?.total).toBe(3000)
    expect(rowA?.average).toBe(1000)
  })

  it('guards division by zero when all months for a category are excluded', () => {
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
