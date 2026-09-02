import { describe, expect, it } from 'vitest'
import { groupCategoryHistoryByMonth } from './categoryHistory'

describe('groupCategoryHistoryByMonth', () => {
  it('returns active months across years, filters by category, and sorts transaction ties by id', () => {
    const result = groupCategoryHistoryByMonth(
      [
        { id: 1, categoryId: 1, amountCents: 100, date: '2026-02-01', note: '' },
        { id: 2, categoryId: 1, amountCents: 200, date: '2026-02-03', note: '' },
        { id: 3, categoryId: 1, amountCents: 300, date: '2026-02-03', note: '' },
        { id: 4, categoryId: 2, amountCents: 400, date: '2026-02-04', note: '' },
        { id: 5, categoryId: 1, amountCents: 500, date: '2025-02-04', note: '' },
      ],
      1,
    )

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ month: '2026-02', totalCents: 600 })
    expect(result[0]?.transactions.map((tx) => tx.id)).toEqual([3, 2, 1])
    expect(result[1]).toMatchObject({ month: '2025-02', totalCents: 500 })
  })

  it('uses absolute totals for bars and preserves active zero-net months', () => {
    const result = groupCategoryHistoryByMonth(
      [
        { id: 1, categoryId: 1, amountCents: 100, date: '2026-01-01', note: '' },
        { id: 2, categoryId: 1, amountCents: -100, date: '2026-01-02', note: '' },
        { id: 3, categoryId: 1, amountCents: -400, date: '2026-02-01', note: '' },
      ],
      1,
    )

    expect(result[0]).toMatchObject({ month: '2026-02', totalCents: -400, barMagnitude: 1 })
    expect(result[1]).toMatchObject({ month: '2026-01', totalCents: 0, barMagnitude: 0 })
    expect(result[1]?.transactions).toHaveLength(2)
  })
})
