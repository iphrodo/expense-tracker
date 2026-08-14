import type { AverageExclusion, Category, MonthFlag, Transaction } from '../db/schema'

/** Bump when the backup shape changes; import must reject anything else. */
export const BACKUP_VERSION = 1

export interface BackupCategory {
  id: number
  name: string
  isDaily: boolean
  isArchived: boolean
  sortOrder: number
}

export interface BackupTransaction {
  id: number
  date: string
  categoryId: number
  amountCents: number
  note: string
  importRowIndex?: number
}

export interface BackupMonthFlag {
  month: string
  isComplete: boolean
}

export interface BackupAverageExclusion {
  categoryId: number
  month: string
  reason: string
}

export interface BackupFile {
  version: number
  exportedAt: string
  categories: BackupCategory[]
  transactions: BackupTransaction[]
  monthFlags: BackupMonthFlag[]
  averageExclusions: BackupAverageExclusion[]
}

export class BackupParseError extends Error {}

/** Normalizes a "YYYY-MM" or "YYYY-MM-DD" string to the first of that month. */
function normalizeMonth(month: string, context: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(month)
  if (!match) {
    throw new BackupParseError(`${context}: invalid month "${month}"`)
  }
  return `${match[1]}-${match[2]}-01`
}

export function buildBackup(
  categories: Category[],
  transactions: Transaction[],
  monthFlags: MonthFlag[],
  averageExclusions: AverageExclusion[],
): BackupFile {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      isDaily: c.isDaily,
      isArchived: c.isArchived ?? false,
      sortOrder: c.sortOrder ?? 0,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.date,
      categoryId: t.categoryId,
      amountCents: t.amountCents,
      note: t.note,
      ...(t.importRowIndex !== undefined ? { importRowIndex: t.importRowIndex } : {}),
    })),
    monthFlags: monthFlags.map((m) => ({
      month: normalizeMonth(m.month, `monthFlags`),
      isComplete: m.isComplete,
    })),
    averageExclusions: averageExclusions.map((e) => ({
      categoryId: e.categoryId,
      month: normalizeMonth(e.month, `averageExclusions`),
      reason: e.reason,
    })),
  }
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

export interface ParsedBackup {
  categories: BackupCategory[]
  transactions: BackupTransaction[]
  monthFlags: BackupMonthFlag[]
  averageExclusions: BackupAverageExclusion[]
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new BackupParseError(`Missing or invalid "${field}" array`)
  }
  return value
}

/** Parses and validates a backup file's referential integrity. Throws BackupParseError on any violation. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupParseError('File is not valid JSON')
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new BackupParseError('File is not a backup object')
  }
  const obj = raw as Record<string, unknown>

  if (obj.version !== BACKUP_VERSION) {
    throw new BackupParseError(
      `Unrecognized backup version "${String(obj.version)}" (this app supports version ${BACKUP_VERSION})`,
    )
  }

  const categories = asArray(obj.categories, 'categories') as BackupCategory[]
  const transactions = asArray(obj.transactions, 'transactions') as BackupTransaction[]
  const monthFlags = asArray(obj.monthFlags, 'monthFlags') as BackupMonthFlag[]
  const averageExclusions = asArray(obj.averageExclusions, 'averageExclusions') as BackupAverageExclusion[]

  const categoryIds = new Set<number>()
  for (const c of categories) {
    if (categoryIds.has(c.id)) {
      throw new BackupParseError(`Duplicate category id ${c.id}`)
    }
    categoryIds.add(c.id)
  }

  const rowIndexes = new Set<number>()
  for (const t of transactions) {
    if (t.importRowIndex !== undefined) {
      if (rowIndexes.has(t.importRowIndex)) {
        throw new BackupParseError(`Duplicate importRowIndex ${t.importRowIndex}`)
      }
      rowIndexes.add(t.importRowIndex)
    }
    if (!categoryIds.has(t.categoryId)) {
      throw new BackupParseError(
        `Transaction ${t.id} references unknown categoryId ${t.categoryId}`,
      )
    }
  }

  const exclusionKeys = new Set<string>()
  for (const e of averageExclusions) {
    const key = `${e.categoryId}:${e.month}`
    if (exclusionKeys.has(key)) {
      throw new BackupParseError(
        `Duplicate averageExclusions entry for category ${e.categoryId}, month ${e.month}`,
      )
    }
    exclusionKeys.add(key)
    if (!categoryIds.has(e.categoryId)) {
      throw new BackupParseError(
        `averageExclusions entry references unknown categoryId ${e.categoryId}`,
      )
    }
  }

  return { categories, transactions, monthFlags, averageExclusions }
}
