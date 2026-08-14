import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  createTransactions,
  deleteTransaction,
  getExistingImportedTransactions,
  getOrCreateCategory,
  restoreTransaction,
  updateTransaction,
} from './repository'

beforeEach(async () => {
  await db.transactions.clear()
  await db.categories.clear()
  await db.monthFlags.clear()
  await db.averageExclusions.clear()
})

describe('editing a transaction', () => {
  it('updates the record in place without creating a new transaction', async () => {
    const categoryId = await getOrCreateCategory('Food', false)
    const ids = await createTransactions([
      { amountCents: 1000, categoryId, date: '2026-01-01', note: '' },
    ])
    const id = ids[0]
    expect(id).toBeDefined()
    await updateTransaction(id as number, { amountCents: 2000, note: 'updated' })

    const all = await db.transactions.toArray()
    expect(all).toHaveLength(1)
    expect(all[0]?.amountCents).toBe(2000)
    expect(all[0]?.note).toBe('updated')
  })

  it('preserves importRowIndex after an edit', async () => {
    const categoryId = await getOrCreateCategory('Food', false)
    const id = await db.transactions.add({
      amountCents: 1000,
      categoryId,
      date: '2026-01-01',
      note: '',
      importRowIndex: 42,
    })
    await updateTransaction(id, { amountCents: 1500 })

    const updated = await db.transactions.get(id)
    expect(updated?.importRowIndex).toBe(42)
    expect(updated?.amountCents).toBe(1500)
  })
})

describe('getExistingImportedTransactions', () => {
  it('maps importRowIndex to the corresponding transaction, ignoring non-imported rows', async () => {
    const categoryId = await getOrCreateCategory('Food', false)
    await createTransactions([{ amountCents: 500, categoryId, date: '2026-01-01', note: '' }])
    const imported = await db.transactions.add({
      amountCents: 1000,
      categoryId,
      date: '2026-01-02',
      note: 'seeded',
      importRowIndex: 7,
    })

    const result = await getExistingImportedTransactions()

    expect(result.size).toBe(1)
    expect(result.get(7)?.id).toBe(imported)
  })
})

describe('deleting and undoing a transaction', () => {
  it('restores the transaction with its original fields after undo', async () => {
    const categoryId = await getOrCreateCategory('Food', false)
    const id = await db.transactions.add({
      amountCents: 1234,
      categoryId,
      date: '2026-01-05',
      note: 'original note',
      importRowIndex: 7,
    })

    const removed = await deleteTransaction(id)
    expect(await db.transactions.get(id)).toBeUndefined()
    if (!removed) {
      throw new Error('expected deleteTransaction to return the removed record')
    }
    await restoreTransaction(removed)

    const restored = await db.transactions.get(id)
    expect(restored).toEqual({
      id,
      amountCents: 1234,
      categoryId,
      date: '2026-01-05',
      note: 'original note',
      importRowIndex: 7,
    })
  })
})
