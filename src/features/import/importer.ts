import { parseSeedCsv, CsvParseError } from '../../lib/csv'
import { db } from '../../db/db'
import { getExistingImportRowIndexes, getOrCreateCategory } from '../../db/repository'

export interface ImportOptions {
  expectedRowCount: number
  expectedAmountSum: number
}

export interface ImportReport {
  categoriesCreated: number
  transactionsImported: number
  skippedAlreadyImported: number
}

export class ImportAssertionError extends Error {}

/** The literal, currently-verified values for /seed/transactions.csv (see design.md). */
export const SEED_IMPORT_EXPECTATIONS: ImportOptions = {
  expectedRowCount: 1763,
  expectedAmountSum: 3644217,
}

export async function importSeedCsv(
  csvText: string,
  options: ImportOptions,
): Promise<ImportReport> {
  const parsed = parseSeedCsv(csvText)

  if (parsed.rowCount !== options.expectedRowCount) {
    throw new ImportAssertionError(
      `Row count mismatch: expected ${options.expectedRowCount}, got ${parsed.rowCount}`,
    )
  }
  if (parsed.amountSumCents !== options.expectedAmountSum) {
    throw new ImportAssertionError(
      `Amount sum mismatch: expected ${options.expectedAmountSum} cents, got ${parsed.amountSumCents} cents`,
    )
  }

  const existingRowIndexes = await getExistingImportRowIndexes()
  const existingCategoryNames = new Set((await db.categories.toArray()).map((c) => c.name))

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

  const toInsert = parsed.rows.filter((row) => !existingRowIndexes.has(row.rowIndex))

  await db.transaction('rw', db.transactions, async () => {
    for (const row of toInsert) {
      const categoryId = categoryIdByName.get(row.category)
      if (categoryId === undefined) {
        throw new CsvParseError(`Line ${row.lineNumber}: category "${row.category}" not created`)
      }
      await db.transactions.add({
        amountCents: row.amountCents,
        categoryId,
        date: row.date,
        note: row.note,
        importRowIndex: row.rowIndex,
      })
    }
  })

  return {
    categoriesCreated,
    transactionsImported: toInsert.length,
    skippedAlreadyImported: parsed.rows.length - toInsert.length,
  }
}
