import { describe, expect, it } from 'vitest'
import { colorForIndex } from './categoryColor'

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
