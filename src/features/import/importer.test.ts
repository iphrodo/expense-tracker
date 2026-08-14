import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { CSV_COLUMNS } from '../../lib/csv'
import { importSeedCsv, ImportAssertionError, SEED_IMPORT_EXPECTATIONS } from './importer'

const header = CSV_COLUMNS.join(',')

beforeEach(async () => {
  await db.transactions.clear()
  await db.categories.clear()
})

describe('importSeedCsv', () => {
  it('re-running the same file leaves records equivalent', async () => {
    const csv = [header, '0,2026-01-01,Food,12.50,,False,'].join('\n')
    await importSeedCsv(csv)
    const first = await db.transactions.toArray()

    const report = await importSeedCsv(csv)

    const second = await db.transactions.toArray()
    expect(second).toHaveLength(1)
    expect(second[0]?.amountCents).toBe(first[0]?.amountCents)
    expect(report.transactionsCreated).toBe(0)
    expect(report.transactionsUpdated).toBe(1)
  })

  it('updates the matching transaction when a re-imported row has a corrected amount', async () => {
    const original = [header, '0,2025-12-01,Groceries,50.00,,False,'].join('\n')
    await importSeedCsv(original)

    const corrected = [header, '0,2025-12-01,Groceries,75.25,fixed,False,'].join('\n')
    const report = await importSeedCsv(corrected)

    const all = await db.transactions.toArray()
    expect(all).toHaveLength(1)
    expect(all[0]?.amountCents).toBe(7525)
    expect(all[0]?.note).toBe('fixed')
    expect(report.transactionsCreated).toBe(0)
    expect(report.transactionsUpdated).toBe(1)
  })

  it('inserts rows with a row_index not yet seen alongside existing ones', async () => {
    await importSeedCsv([header, '0,2026-01-01,Food,10.00,,False,'].join('\n'))
    const report = await importSeedCsv(
      [header, '0,2026-01-01,Food,10.00,,False,', '1,2026-01-02,Food,5.00,,False,'].join('\n'),
    )

    expect(report.transactionsCreated).toBe(1)
    expect(report.transactionsUpdated).toBe(1)
    expect(await db.transactions.count()).toBe(2)
  })

  it('imports without expectations when none are supplied', async () => {
    const csv = [header, '0,2026-01-01,Food,10.00,,False,'].join('\n')
    const report = await importSeedCsv(csv)
    expect(report.transactionsCreated).toBe(1)
  })

  it('still asserts row count and amount sum when expectations are supplied', async () => {
    const csv = [header, '0,2026-01-01,Food,10.00,,False,'].join('\n')
    await expect(
      importSeedCsv(csv, { expectedRowCount: 2, expectedAmountSum: 1000 }),
    ).rejects.toThrow(ImportAssertionError)
  })

  it('matches the seed expectations shape', () => {
    expect(SEED_IMPORT_EXPECTATIONS.expectedRowCount).toBe(1763)
    expect(SEED_IMPORT_EXPECTATIONS.expectedAmountSum).toBe(3644217)
  })

  it('fails loudly on a malformed row without committing a partial import', async () => {
    const csv = [
      header,
      '0,2026-01-01,Food,10.00,,False,',
      '1,2026-01-02,Food,not-a-number,,False,',
    ].join('\n')

    await expect(importSeedCsv(csv)).rejects.toThrow()
    expect(await db.transactions.count()).toBe(0)
  })
})
