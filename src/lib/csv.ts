import type { Category, Transaction } from '../db/schema'
import { formatCents, parseDecimalEurToCents } from './money'

export const CSV_COLUMNS = [
  'row_index',
  'date',
  'category',
  'amount_eur',
  'note',
  'is_daily',
  'source_sheet',
] as const

export interface CsvRow {
  rowIndex: number
  date: string
  category: string
  amountCents: number
  note: string
  isDaily: boolean
  lineNumber: number
}

export class CsvParseError extends Error {}

/** Splits raw CSV text into rows of raw string fields, handling quoted fields with embedded commas. */
function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
      continue
    }
    if (char === '"') {
      inQuotes = true
      i++
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (char === '\r') {
      i++
      continue
    }
    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += char
    i++
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

function parseBool(value: string, lineNumber: number): boolean {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  throw new CsvParseError(`Line ${lineNumber}: invalid is_daily value "${value}"`)
}

function parseDate(value: string, lineNumber: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new CsvParseError(`Line ${lineNumber}: invalid date "${value}"`)
  }
  return value.trim()
}

export interface ParsedCsv {
  rows: CsvRow[]
  rowCount: number
  amountSumCents: number
}

export function parseSeedCsv(text: string): ParsedCsv {
  const rawRows = splitCsv(text)
  if (rawRows.length === 0) {
    throw new CsvParseError('Empty file')
  }
  const header = rawRows[0]
  if (!header || header.join(',') !== CSV_COLUMNS.join(',')) {
    throw new CsvParseError(`Unexpected header: "${header?.join(',') ?? ''}"`)
  }

  const rows: CsvRow[] = []
  const seenRowIndexes = new Map<number, number>()

  for (let i = 1; i < rawRows.length; i++) {
    const lineNumber = i + 1
    const raw = rawRows[i]
    if (!raw || raw.length !== CSV_COLUMNS.length) {
      throw new CsvParseError(`Line ${lineNumber}: expected ${CSV_COLUMNS.length} columns, got ${raw?.length ?? 0}`)
    }
    const [rowIndexRaw, dateRaw, categoryRaw, amountRaw, noteRaw, isDailyRaw] = raw

    if (rowIndexRaw === undefined || !/^\d+$/.test(rowIndexRaw.trim())) {
      throw new CsvParseError(`Line ${lineNumber}: invalid row_index "${rowIndexRaw ?? ''}"`)
    }
    const rowIndex = Number(rowIndexRaw.trim())
    if (seenRowIndexes.has(rowIndex)) {
      throw new CsvParseError(
        `Duplicate row_index ${rowIndex} at lines ${seenRowIndexes.get(rowIndex)} and ${lineNumber}`,
      )
    }
    seenRowIndexes.set(rowIndex, lineNumber)

    const category = (categoryRaw ?? '').trim()
    if (category === '') {
      throw new CsvParseError(`Line ${lineNumber}: missing category`)
    }

    if (amountRaw === undefined || amountRaw.trim() === '') {
      throw new CsvParseError(`Line ${lineNumber}: missing amount_eur`)
    }
    let amountCents: number
    try {
      amountCents = parseDecimalEurToCents(amountRaw)
    } catch {
      throw new CsvParseError(`Line ${lineNumber}: invalid amount_eur "${amountRaw}"`)
    }

    const date = parseDate(dateRaw ?? '', lineNumber)
    const isDaily = parseBool(isDailyRaw ?? '', lineNumber)

    rows.push({
      rowIndex,
      date,
      category,
      amountCents,
      note: (noteRaw ?? '').trim(),
      isDaily,
      lineNumber,
    })
  }

  const amountSumCents = rows.reduce((sum, r) => sum + r.amountCents, 0)
  return { rows, rowCount: rows.length, amountSumCents }
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  categories: Category[],
): string {
  const categoryById = new Map(categories.map((c) => [c.id, c]))
  let nextMintedIndex =
    Math.max(-1, ...transactions.map((t) => t.importRowIndex ?? -1)) + 1

  const lines = [CSV_COLUMNS.join(',')]
  for (const tx of transactions) {
    const rowIndex = tx.importRowIndex ?? nextMintedIndex++
    const category = categoryById.get(tx.categoryId)
    const fields = [
      String(rowIndex),
      tx.date,
      category?.name ?? '',
      formatCents(tx.amountCents),
      tx.note,
      category?.isDaily ? 'True' : 'False',
      '',
    ]
    lines.push(fields.map(csvEscape).join(','))
  }
  return lines.join('\n') + '\n'
}
