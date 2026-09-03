import { describe, expect, it } from 'vitest'
import type { Transaction } from '../db/schema'
import { groupTransactionsByDay } from './dateGroups'

let nextId = 1

function tx(partial: Partial<Transaction> & Pick<Transaction, 'categoryId' | 'date' | 'amountCents'>): Transaction {
  return { id: nextId++, note: '', ...partial }
}

describe('groupTransactionsByDay', () => {
  it('groups all transactions by day, newest first, when no category is selected', () => {
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-01', amountCents: 100 }),
      tx({ categoryId: 2, date: '2026-01-02', amountCents: 200 }),
      tx({ categoryId: 1, date: '2026-01-01', amountCents: 50 }),
    ]
    const groups = groupTransactionsByDay(transactions, null)
    expect(groups.map((g) => g.date)).toEqual(['2026-01-02', '2026-01-01'])
    expect(groups[1]?.totalCents).toBe(150)
    expect(groups[1]?.txs).toHaveLength(2)
  })

  it('restricts day groups to only those containing the selected category', () => {
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-01', amountCents: 350 }), // Coffee
      tx({ categoryId: 2, date: '2026-01-01', amountCents: 1200 }), // Groceries
      tx({ categoryId: 2, date: '2026-01-02', amountCents: 500 }), // Groceries only, no Coffee
    ]
    const groups = groupTransactionsByDay(transactions, 1)
    expect(groups.map((g) => g.date)).toEqual(['2026-01-01'])
  })

  it('restricts each rendered day group to only the selected category, with totals reflecting only it', () => {
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-01', amountCents: 350 }), // Coffee
      tx({ categoryId: 2, date: '2026-01-01', amountCents: 1200 }), // Groceries
    ]
    const groups = groupTransactionsByDay(transactions, 1)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.totalCents).toBe(350)
    expect(groups[0]?.txs.map((t) => t.categoryId)).toEqual([1])
  })

  it('returns no groups when the selected category has no transactions', () => {
    const transactions: Transaction[] = [tx({ categoryId: 2, date: '2026-01-01', amountCents: 500 })]
    const groups = groupTransactionsByDay(transactions, 1)
    expect(groups).toEqual([])
  })

  it('returns everything unchanged when explicitly unfiltered (selectedCategoryId is null)', () => {
    const transactions: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-01', amountCents: 350 }),
      tx({ categoryId: 2, date: '2026-01-01', amountCents: 1200 }),
    ]
    const groups = groupTransactionsByDay(transactions, null)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.totalCents).toBe(1550)
    expect(groups[0]?.txs).toHaveLength(2)
  })
})

describe('groupTransactionsByDay across a month switch', () => {
  it('keeps the same category filter applied to a different set of monthly transactions', () => {
    const januaryTx: Transaction[] = [
      tx({ categoryId: 1, date: '2026-01-05', amountCents: 300 }),
      tx({ categoryId: 2, date: '2026-01-06', amountCents: 700 }),
    ]
    const februaryTx: Transaction[] = [
      tx({ categoryId: 1, date: '2026-02-03', amountCents: 400 }),
      tx({ categoryId: 2, date: '2026-02-04', amountCents: 900 }),
    ]

    const januaryGroups = groupTransactionsByDay(januaryTx, 1)
    expect(januaryGroups.map((g) => g.date)).toEqual(['2026-01-05'])

    const februaryGroups = groupTransactionsByDay(februaryTx, 1)
    expect(februaryGroups.map((g) => g.date)).toEqual(['2026-02-03'])
  })

  it('produces an empty filtered state (no fallback to unfiltered) when the new month has no matches', () => {
    const marchTx: Transaction[] = [tx({ categoryId: 2, date: '2026-03-01', amountCents: 600 })]
    const groups = groupTransactionsByDay(marchTx, 1)
    expect(groups).toEqual([])
  })
})
