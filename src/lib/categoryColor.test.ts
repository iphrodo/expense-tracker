import { describe, expect, it } from 'vitest'
import { colorForIndex, getCategoryColorRoles, unusedColorFor } from './categoryColor'

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA))
  const lB = relativeLuminance(hexToRgb(hexB))
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('colorForIndex', () => {
  it('gives every index within the palette size a distinct color', () => {
    const colors = Array.from({ length: 17 }, (_, i) => colorForIndex(i))
    expect(new Set(colors).size).toBe(17)
  })

  it('wraps around without erroring once the index exceeds the palette size', () => {
    expect(() => colorForIndex(40)).not.toThrow()
    expect(colorForIndex(40)).toBe(colorForIndex(40 % 17))
  })

  it('is a pure function of the index, unaffected by unrelated categories', () => {
    expect(colorForIndex(3)).toBe(colorForIndex(3))
  })

  it('never assigns adjacent indices the same hue family', () => {
    const colors = Array.from({ length: 17 }, (_, i) => colorForIndex(i))
    const hueFamily = (cls: string) => cls.match(/bg-(\w+)-100/)?.[1]
    for (let i = 1; i < colors.length; i++) {
      expect(hueFamily(colors[i]!)).not.toBe(hueFamily(colors[i - 1]!))
    }
  })
})

describe('unusedColorFor', () => {
  it('picks a color unused among the given active colors', () => {
    const active = [colorForIndex(0), colorForIndex(1)]
    const picked = unusedColorFor(active, active.length)
    expect(active).not.toContain(picked)
  })

  it('picks the first palette entry when no colors are in use', () => {
    expect(unusedColorFor([], 0)).toBe(colorForIndex(0))
  })

  it('falls back to round-robin-by-count once every palette color is in use', () => {
    const allColors = Array.from({ length: 17 }, (_, i) => colorForIndex(i))
    expect(unusedColorFor(allColors, 17)).toBe(colorForIndex(17))
    expect(unusedColorFor(allColors, 20)).toBe(colorForIndex(20))
  })

  it('ignores undefined entries in the active-colors list', () => {
    expect(unusedColorFor([undefined, undefined], 0)).toBe(colorForIndex(0))
  })
})

describe('getCategoryColorRoles', () => {
  it('is a pure function of the category color: same category, same roles every call', () => {
    const category = { color: colorForIndex(3) }
    const first = getCategoryColorRoles(category)
    const second = getCategoryColorRoles({ color: category.color })
    expect(second).toEqual(first)
  })

  it('derives all three roles from the same hue for a fixed color', () => {
    const roles = getCategoryColorRoles({ color: colorForIndex(0) })
    expect(roles).toEqual({ dot: '#ef4444', tint: '#fee2e2', text: '#b91c1c' })
  })

  it('meets WCAG AA contrast for text on tint, for every palette entry', () => {
    for (let i = 0; i < 17; i++) {
      const roles = getCategoryColorRoles({ color: colorForIndex(i) })
      expect(contrastRatio(roles.text, roles.tint)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('gives adjacent palette indices visually distinct dot hues', () => {
    for (let i = 1; i < 17; i++) {
      const a = getCategoryColorRoles({ color: colorForIndex(i - 1) })
      const b = getCategoryColorRoles({ color: colorForIndex(i) })
      expect(a.dot).not.toBe(b.dot)
    }
  })

  it('falls back to a neutral role triple when the category has no stored color', () => {
    expect(getCategoryColorRoles(undefined)).toEqual({
      dot: '#8b9096',
      tint: '#f4f4f2',
      text: '#5c6166',
    })
    expect(getCategoryColorRoles({})).toEqual({ dot: '#8b9096', tint: '#f4f4f2', text: '#5c6166' })
  })
})
