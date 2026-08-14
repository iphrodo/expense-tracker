import { describe, expect, it } from 'vitest'
import { parseSeedCsv, CsvParseError, CSV_COLUMNS } from './csv'

const header = CSV_COLUMNS.join(',')

describe('parseSeedCsv', () => {
  it('parses well-formed rows, including negative amounts', () => {
    const csv = [
      header,
      '0,2026-01-01,Food,12.50,,False,',
      '1,2026-01-02,Travel,-50.78,refund,True,',
    ].join('\n')
    const result = parseSeedCsv(csv)
    expect(result.rowCount).toBe(2)
    expect(result.rows[0]?.amountCents).toBe(1250)
    expect(result.rows[1]?.amountCents).toBe(-5078)
    expect(result.amountSumCents).toBe(1250 - 5078)
  })

  it('allows rows that share date, category, and amount when row_index differs', () => {
    const csv = [
      header,
      '0,2026-01-01,Food,5.96,,False,',
      '1,2026-01-01,Food,5.96,,False,',
      '2,2026-01-01,Food,5.96,,False,',
    ].join('\n')
    const result = parseSeedCsv(csv)
    expect(result.rowCount).toBe(3)
  })

  it('rejects a duplicate row_index', () => {
    const csv = [header, '0,2026-01-01,Food,1.00,,False,', '0,2026-01-02,Food,2.00,,False,'].join(
      '\n',
    )
    expect(() => parseSeedCsv(csv)).toThrow(CsvParseError)
  })

  it('rejects a non-numeric amount_eur', () => {
    const csv = [header, '0,2026-01-01,Food,abc,,False,'].join('\n')
    expect(() => parseSeedCsv(csv)).toThrow(CsvParseError)
  })
})
