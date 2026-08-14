// Integration tests against a real Postgres + PostgREST instance (see
// scripts/test-db/setup.sh and openspec/changes/add-shared-backend/tasks.md section 6).
// Run `scripts/test-db/setup.sh` once before running this file.
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { supabase } from '../lib/supabase'
import {
  createTransactions,
  deleteTransaction,
  getAllData,
  getExistingImportedTransactions,
  getOrCreateCategory,
  replaceAllData,
  restoreTransaction,
  updateTransaction,
} from './repository'
import { buildBackup, parseBackup, serializeBackup } from '../lib/backup'

beforeEach(async () => {
  await supabase.from('average_exclusions').delete().gte('id', 0)
  await supabase.from('transactions').delete().gte('id', 0)
  await supabase.from('month_flags').delete().gte('id', 0)
  await supabase.from('categories').delete().gte('id', 0)
})

afterAll(async () => {
  await supabase.from('average_exclusions').delete().gte('id', 0)
  await supabase.from('transactions').delete().gte('id', 0)
  await supabase.from('month_flags').delete().gte('id', 0)
  await supabase.from('categories').delete().gte('id', 0)
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

    const all = (await getAllData()).transactions
    expect(all).toHaveLength(1)
    expect(all[0]?.amountCents).toBe(2000)
    expect(all[0]?.note).toBe('updated')
  })

  it('preserves importRowIndex after an edit', async () => {
    const categoryId = await getOrCreateCategory('Food', false)
    const ids = await createTransactions([
      { amountCents: 1000, categoryId, date: '2026-01-01', note: '', importRowIndex: 42 },
    ])
    const id = ids[0] as number
    await updateTransaction(id, { amountCents: 1500 })

    const updated = (await getAllData()).transactions.find((t) => t.id === id)
    expect(updated?.importRowIndex).toBe(42)
    expect(updated?.amountCents).toBe(1500)
  })
})

describe('getExistingImportedTransactions', () => {
  it('maps importRowIndex to the corresponding transaction, ignoring non-imported rows', async () => {
    const categoryId = await getOrCreateCategory('Food', false)
    await createTransactions([{ amountCents: 500, categoryId, date: '2026-01-01', note: '' }])
    const importedIds = await createTransactions([
      { amountCents: 1000, categoryId, date: '2026-01-02', note: 'seeded', importRowIndex: 7 },
    ])

    const result = await getExistingImportedTransactions()

    expect(result.size).toBe(1)
    expect(result.get(7)?.id).toBe(importedIds[0])
  })
})

describe('deleting and undoing a transaction', () => {
  it('restores the transaction with its original fields after undo', async () => {
    const categoryId = await getOrCreateCategory('Food', false)
    const ids = await createTransactions([
      {
        amountCents: 1234,
        categoryId,
        date: '2026-01-05',
        note: 'original note',
        importRowIndex: 7,
      },
    ])
    const id = ids[0] as number

    const removed = await deleteTransaction(id)
    expect((await getAllData()).transactions.find((t) => t.id === id)).toBeUndefined()
    if (!removed) {
      throw new Error('expected deleteTransaction to return the removed record')
    }
    await restoreTransaction(removed)

    const restored = (await getAllData()).transactions.find(
      (t) => t.amountCents === 1234 && t.importRowIndex === 7,
    )
    expect(restored).toMatchObject({
      amountCents: 1234,
      categoryId,
      date: '2026-01-05',
      note: 'original note',
      importRowIndex: 7,
    })
  })
})

describe('full backup export/import round-trip', () => {
  it('restores categories, transactions, month flags, and average exclusions exactly after export then import into an empty database', async () => {
    const foodId = await getOrCreateCategory('Food', false)
    const taxiId = await getOrCreateCategory('Taxi', false)
    await createTransactions([
      { amountCents: 460, categoryId: foodId, date: '2026-07-01', note: '' },
      { amountCents: 4600, categoryId: taxiId, date: '2026-07-15', note: 'airport', importRowIndex: 7 },
    ])
    await supabase.from('month_flags').insert({ month: '2026-07-01', is_complete: true })
    await supabase
      .from('average_exclusions')
      .insert([
        { category_id: foodId, month: '2026-07-01', reason: 'one-off event' },
        { category_id: taxiId, month: '2026-07-01', reason: 'airport transfer' },
      ])

    const before = await getAllData()
    const backup = buildBackup(
      before.categories,
      before.transactions,
      before.monthFlags,
      before.averageExclusions,
    )
    const json = serializeBackup(backup)

    const parsed = parseBackup(json)
    const report = await replaceAllData(parsed)

    expect(report).toEqual({ categories: 2, transactions: 2, monthFlags: 1, averageExclusions: 2 })

    const after = await getAllData()
    expect(after.categories.map((c) => ({ name: c.name, isDaily: c.isDaily }))).toEqual(
      before.categories.map((c) => ({ name: c.name, isDaily: c.isDaily })),
    )
    expect(after.transactions.map((t) => ({ amountCents: t.amountCents, date: t.date, note: t.note, importRowIndex: t.importRowIndex }))).toEqual(
      expect.arrayContaining(
        before.transactions.map((t) => ({
          amountCents: t.amountCents,
          date: t.date,
          note: t.note,
          importRowIndex: t.importRowIndex,
        })),
      ),
    )
    expect(after.averageExclusions.map((e) => ({ month: e.month, reason: e.reason }))).toEqual(
      expect.arrayContaining(
        before.averageExclusions.map((e) => ({ month: e.month, reason: e.reason })),
      ),
    )
    expect(after.monthFlags.map((m) => ({ month: m.month, isComplete: m.isComplete }))).toEqual(
      before.monthFlags.map((m) => ({ month: m.month, isComplete: m.isComplete })),
    )
  })
})

describe('Postgres schema behavior', () => {
  it('round-trips a negative amount_cents transaction unchanged', async () => {
    const categoryId = await getOrCreateCategory('Refund', false)
    const ids = await createTransactions([
      { amountCents: -1234, categoryId, date: '2026-02-01', note: 'refund' },
    ])
    const stored = (await getAllData()).transactions.find((t) => t.id === ids[0])
    expect(stored?.amountCents).toBe(-1234)
  })

  it('does not shift a date value across a UTC/local timezone boundary on write and read-back', async () => {
    const categoryId = await getOrCreateCategory('Late night', false)
    const ids = await createTransactions([
      { amountCents: 500, categoryId, date: '2026-01-01', note: '' },
    ])
    const stored = (await getAllData()).transactions.find((t) => t.id === ids[0])
    expect(stored?.date).toBe('2026-01-01')
  })

  it('enforces the unique constraint on average_exclusions(category_id, month)', async () => {
    const categoryId = await getOrCreateCategory('Taxi', false)
    const { error: first } = await supabase
      .from('average_exclusions')
      .insert({ category_id: categoryId, month: '2026-07-01', reason: 'one-off' })
    expect(first).toBeNull()

    const { error: second } = await supabase
      .from('average_exclusions')
      .insert({ category_id: categoryId, month: '2026-07-01', reason: 'duplicate' })
    expect(second).not.toBeNull()
    expect(second?.code).toBe('23505')
  })
})
