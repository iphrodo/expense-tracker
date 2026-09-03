import { afterEach, describe, expect, it } from 'vitest'
import { applyTheme, getInitialTheme, millisecondsUntilThemeChange, resolveThemeAtTime } from './theme'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  document.querySelector('meta[name="theme-color"]')?.remove()
})

describe('resolveThemeAtTime', () => {
  it('uses dark theme from 20:00 through 06:59', () => {
    expect(resolveThemeAtTime(new Date(2026, 0, 1, 20))).toBe('dark')
    expect(resolveThemeAtTime(new Date(2026, 0, 2, 6, 59))).toBe('dark')
  })

  it('uses light theme from 07:00 through 19:59', () => {
    expect(resolveThemeAtTime(new Date(2026, 0, 1, 7))).toBe('light')
    expect(resolveThemeAtTime(new Date(2026, 0, 1, 19, 59))).toBe('light')
  })
})

describe('theme application', () => {
  it('uses the theme already resolved on the document', () => {
    document.documentElement.dataset.theme = 'dark'
    expect(getInitialTheme()).toBe('dark')
  })

  it('updates document state and browser theme metadata', () => {
    document.head.insertAdjacentHTML('beforeend', '<meta name="theme-color" content="#111315">')
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#fbfbfa')
  })

  it('calculates the next automatic change boundary', () => {
    expect(millisecondsUntilThemeChange(new Date(2026, 0, 1, 6, 30))).toBe(30 * 60 * 1000)
    expect(millisecondsUntilThemeChange(new Date(2026, 0, 1, 12))).toBe(8 * 60 * 60 * 1000)
    expect(millisecondsUntilThemeChange(new Date(2026, 0, 1, 21))).toBe(10 * 60 * 60 * 1000)
  })
})
