import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../db/schema'
import { rankCategoriesByCount } from './categoryRanking'

let nextId = 1

function tx(partial: Partial<Transaction> & Pick<Transaction, 'categoryId'>): Transaction {
  return { id: nextId++, date: '2026-01-01', amountCents: 0, note: '', ...partial }
}

describe('rankCategoriesByCount', () => {
  it('sorts categories by transaction count, descending', () => {
    const categories: Category[] = [
      { id: 1, name: 'Продукти', isDaily: true },
      { id: 2, name: 'Таксі', isDaily: false },
      { id: 3, name: 'Спорт', isDaily: false },
    ]
    const transactions: Transaction[] = [
      tx({ categoryId: 1 }),
      tx({ categoryId: 1 }),
      tx({ categoryId: 1 }),
      tx({ categoryId: 2 }),
      tx({ categoryId: 2 }),
    ]
    const ranked = rankCategoriesByCount(categories, transactions)
    expect(ranked.map((c) => c.name)).toEqual(['Продукти', 'Таксі', 'Спорт'])
  })

  it('breaks ties alphabetically', () => {
    const categories: Category[] = [
      { id: 1, name: 'Спорт', isDaily: false },
      { id: 2, name: 'Аптека', isDaily: false },
    ]
    const transactions: Transaction[] = [tx({ categoryId: 1 }), tx({ categoryId: 2 })]
    const ranked = rankCategoriesByCount(categories, transactions)
    expect(ranked.map((c) => c.name)).toEqual(['Аптека', 'Спорт'])
  })

  it('places categories with no transactions last', () => {
    const categories: Category[] = [
      { id: 1, name: 'Без витрат', isDaily: false },
      { id: 2, name: 'Продукти', isDaily: true },
    ]
    const transactions: Transaction[] = [tx({ categoryId: 2 })]
    const ranked = rankCategoriesByCount(categories, transactions)
    expect(ranked.map((c) => c.name)).toEqual(['Продукти', 'Без витрат'])
  })
})
