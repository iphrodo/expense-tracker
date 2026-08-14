import { parseSeedCsv, CsvParseError } from '../../lib/csv'
import {
  createTransactions,
  getAllData,
  getExistingImportedTransactions,
  getOrCreateCategory,
  updateTransaction,
} from '../../db/repository'

export interface ImportOptions {
  expectedRowCount?: number
  expectedAmountSum?: number
}

export interface ImportReport {
  categoriesCreated: number
  transactionsCreated: number
  transactionsUpdated: number
}

export class ImportAssertionError extends Error {}

/** The literal, currently-verified values for /seed/transactions.csv (see design.md). */
export const SEED_IMPORT_EXPECTATIONS: ImportOptions = {
  expectedRowCount: 1763,
  expectedAmountSum: 3644217,
}

export async function importSeedCsv(
  csvText: string,
  options: ImportOptions = {},
): Promise<ImportReport> {
  const parsed = parseSeedCsv(csvText)

  if (options.expectedRowCount !== undefined && parsed.rowCount !== options.expectedRowCount) {
    throw new ImportAssertionError(
      `Row count mismatch: expected ${options.expectedRowCount}, got ${parsed.rowCount}`,
    )
  }
  if (
    options.expectedAmountSum !== undefined &&
    parsed.amountSumCents !== options.expectedAmountSum
  ) {
    throw new ImportAssertionError(
      `Amount sum mismatch: expected ${options.expectedAmountSum} cents, got ${parsed.amountSumCents} cents`,
    )
  }

  const existingByRowIndex = await getExistingImportedTransactions()
  const existingCategoryNames = new Set((await getAllData()).categories.map((c) => c.name))

  const categoryIdByName = new Map<string, number>()
  let categoriesCreated = 0
  for (const row of parsed.rows) {
    if (!categoryIdByName.has(row.category)) {
      const wasExisting = existingCategoryNames.has(row.category)
      const id = await getOrCreateCategory(row.category, row.isDaily)
      categoryIdByName.set(row.category, id)
      if (!wasExisting) {
        categoriesCreated++
        existingCategoryNames.add(row.category)
      }
    }
  }

  const toCreate: (typeof parsed.rows)[number][] = []
  let transactionsUpdated = 0

  for (const row of parsed.rows) {
    const categoryId = categoryIdByName.get(row.category)
    if (categoryId === undefined) {
      throw new CsvParseError(`Line ${row.lineNumber}: category "${row.category}" not created`)
    }
    const existing = existingByRowIndex.get(row.rowIndex)
    if (existing) {
      await updateTransaction(existing.id, {
        amountCents: row.amountCents,
        categoryId,
        date: row.date,
        note: row.note,
      })
      transactionsUpdated++
    } else {
      toCreate.push(row)
    }
  }

  if (toCreate.length > 0) {
    await createTransactions(
      toCreate.map((row) => ({
        amountCents: row.amountCents,
        categoryId: categoryIdByName.get(row.category)!,
        date: row.date,
        note: row.note,
        importRowIndex: row.rowIndex,
      })),
    )
  }

  return {
    categoriesCreated,
    transactionsCreated: toCreate.length,
    transactionsUpdated,
  }
}
