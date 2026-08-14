import { describe, expect, it } from 'vitest'
import { parseAmountExpression } from './expressionParser'

describe('parseAmountExpression', () => {
  it('splits top-level + into separate positive amounts', () => {
    const result = parseAmountExpression('5.96+4.22+4.96')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.centsPerTerm).toEqual([596, 422, 496])
    }
  })

  it('splits top-level - into separate transactions with correct signs', () => {
    const result = parseAmountExpression('17.03-10.50')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.centsPerTerm).toEqual([1703, -1050])
    }
  })

  it('produces a single negative transaction for a leading unary minus', () => {
    const result = parseAmountExpression('-50.78')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.centsPerTerm).toEqual([-5078])
    }
  })

  it('keeps * and / within a single transaction', () => {
    const mul = parseAmountExpression('9.83*2')
    expect(mul.ok).toBe(true)
    if (mul.ok) {
      expect(mul.centsPerTerm).toEqual([1966])
    }

    const div = parseAmountExpression('500/50.85')
    expect(div.ok).toBe(true)
    if (div.ok) {
      expect(div.centsPerTerm).toEqual([983])
    }
  })

  it('splits correctly with a parenthesized sub-expression combined with top-level +', () => {
    const result = parseAmountExpression('9.99+62.3+(4.8+4.8+7.13)*0.9')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.centsPerTerm).toHaveLength(3)
      expect(result.centsPerTerm[0]).toBe(999)
      expect(result.centsPerTerm[1]).toBe(6230)
      // (4.8+4.8+7.13) = 16.73, *0.9 = 15.057 -> rounds to 1506 cents
      expect(result.centsPerTerm[2]).toBe(1506)
    }
  })

  it('rejects a zero-valued term or whole expression', () => {
    expect(parseAmountExpression('5+0+3').ok).toBe(false)
    expect(parseAmountExpression('0').ok).toBe(false)
  })

  it('rejects invalid input instead of evaluating it', () => {
    const result = parseAmountExpression('12.50; DROP TABLE')
    expect(result.ok).toBe(false)
  })

  it('edit mode rejects a multi-term expression while accepting a single term (including negative)', () => {
    expect(parseAmountExpression('5.96+4.22', { editMode: true }).ok).toBe(false)

    const single = parseAmountExpression('12.50', { editMode: true })
    expect(single.ok).toBe(true)
    if (single.ok) {
      expect(single.centsPerTerm).toEqual([1250])
    }

    const negative = parseAmountExpression('-50.78', { editMode: true })
    expect(negative.ok).toBe(true)
    if (negative.ok) {
      expect(negative.centsPerTerm).toEqual([-5078])
    }
  })
})
