import { describe, expect, it } from 'vitest'
import { BACKUP_VERSION, BackupParseError, buildBackup, parseBackup, serializeBackup } from './backup'
import type { AverageExclusion, Category, MonthFlag, Transaction } from '../db/schema'

const categories: Category[] = [
  { id: 1, name: 'Іжа в закладі', isDaily: true, isArchived: false, sortOrder: 0 },
  { id: 2, name: 'Таксі', isDaily: false, isArchived: false, sortOrder: 1 },
  { id: 3, name: 'Солодке', isDaily: true, isArchived: true, sortOrder: 2 },
]

const transactions: Transaction[] = [
  { id: 1, amountCents: 460, categoryId: 1, date: '2026-07-01', note: '' },
  { id: 2, amountCents: 4600, categoryId: 2, date: '2026-07-15', note: 'airport', importRowIndex: 7 },
]

const monthFlags: MonthFlag[] = [{ id: 1, month: '2026-07-01', isComplete: true }]

const averageExclusions: AverageExclusion[] = [
  { id: 1, categoryId: 1, month: '2026-07-01', reason: 'one-off catering event' },
  { id: 2, categoryId: 2, month: '2026-07-01', reason: 'flight transfer, not routine' },
  { id: 3, categoryId: 3, month: '2026-07-01', reason: 'holiday splurge' },
]

describe('backup round-trip', () => {
  it('preserves all four tables exactly, including amountCents, importRowIndex, and exclusion reasons', () => {
    const backup = buildBackup(categories, transactions, monthFlags, averageExclusions)
    expect(backup.version).toBe(BACKUP_VERSION)

    const json = serializeBackup(backup)
    const parsed = parseBackup(json)

    expect(parsed.categories).toEqual(
      categories.map((c) => ({ ...c, isArchived: c.isArchived ?? false, sortOrder: c.sortOrder ?? 0 })),
    )
    expect(parsed.transactions).toEqual(
      transactions.map(({ id, date, categoryId, amountCents, note, importRowIndex }) => ({
        id,
        date,
        categoryId,
        amountCents,
        note,
        ...(importRowIndex !== undefined ? { importRowIndex } : {}),
      })),
    )
    expect(parsed.monthFlags).toEqual([{ month: '2026-07-01', isComplete: true }])
    expect(parsed.averageExclusions).toEqual(
      averageExclusions.map(({ categoryId, month, reason }) => ({ categoryId, month, reason })),
    )
  })

  it('rounds amountCents as integers with no float drift for values like 4.60 vs 4.6', () => {
    const backup = buildBackup(
      categories,
      [
        { id: 1, amountCents: 460, categoryId: 1, date: '2026-07-01', note: '' },
        { id: 2, amountCents: 400, categoryId: 1, date: '2026-07-02', note: '' },
      ],
      [],
      [],
    )
    const parsed = parseBackup(serializeBackup(backup))
    expect(parsed.transactions.map((t) => t.amountCents)).toEqual([460, 400])
  })
})

describe('parseBackup validation', () => {
  function baseFile() {
    return buildBackup(categories, transactions, monthFlags, averageExclusions)
  }

  it('rejects an unrecognized version', () => {
    const file = { ...baseFile(), version: 2 }
    expect(() => parseBackup(JSON.stringify(file))).toThrow(BackupParseError)
  })

  it('rejects duplicate category ids', () => {
    const file = baseFile()
    file.categories.push({ id: 1, name: 'Duplicate', isDaily: false, isArchived: false, sortOrder: 9 })
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/Duplicate category id/)
  })

  it('rejects duplicate importRowIndex values', () => {
    const file = baseFile()
    file.transactions.push({
      id: 99,
      date: '2026-07-20',
      categoryId: 1,
      amountCents: 100,
      note: '',
      importRowIndex: 7,
    })
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/Duplicate importRowIndex/)
  })

  it('rejects a duplicate (categoryId, month) averageExclusions entry', () => {
    const file = baseFile()
    file.averageExclusions.push({ categoryId: 1, month: '2026-07-01', reason: 'dup' })
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/Duplicate averageExclusions/)
  })

  it('rejects a transaction referencing an unknown categoryId', () => {
    const file = baseFile()
    file.transactions.push({
      id: 100,
      date: '2026-07-21',
      categoryId: 999,
      amountCents: 100,
      note: '',
    })
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/unknown categoryId/)
  })

  it('rejects an averageExclusions entry referencing an unknown categoryId', () => {
    const file = baseFile()
    file.averageExclusions.push({ categoryId: 999, month: '2026-08-01', reason: 'x' })
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/unknown categoryId/)
  })

  it('rejects invalid JSON', () => {
    expect(() => parseBackup('not json')).toThrow(BackupParseError)
  })
})
