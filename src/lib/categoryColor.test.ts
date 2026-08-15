import { describe, expect, it } from 'vitest'
import { assignCategoryColors } from './categoryColor'

describe('assignCategoryColors', () => {
  it('gives every id a distinct color when the count is within the palette size', () => {
    const ids = Array.from({ length: 17 }, (_, i) => i + 1)
    const colors = assignCategoryColors(ids)
    const uniqueColors = new Set(colors.values())
    expect(uniqueColors.size).toBe(ids.length)
  })

  it('is stable regardless of input order', () => {
    const ascending = assignCategoryColors([1, 2, 3, 4])
    const shuffled = assignCategoryColors([4, 1, 3, 2])
    expect([...shuffled.entries()]).toEqual([...ascending.entries()])
  })

  it('wraps around without erroring once ids exceed the palette size', () => {
    const ids = Array.from({ length: 40 }, (_, i) => i + 1)
    expect(() => assignCategoryColors(ids)).not.toThrow()
    expect(assignCategoryColors(ids).size).toBe(ids.length)
  })

  it('never assigns adjacent ids the same hue family', () => {
    const ids = Array.from({ length: 17 }, (_, i) => i + 1)
    const colors = [...assignCategoryColors(ids).values()]
    const hueFamily = (cls: string) => cls.match(/bg-(\w+)-100/)?.[1]
    for (let i = 1; i < colors.length; i++) {
      expect(hueFamily(colors[i]!)).not.toBe(hueFamily(colors[i - 1]!))
    }
  })
})
