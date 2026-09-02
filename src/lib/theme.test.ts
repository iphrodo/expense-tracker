import { afterEach, describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY, applyTheme, getInitialTheme, resolveTheme } from './theme'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  window.localStorage.clear()
})

describe('resolveTheme', () => {
  it('defaults to dark when no valid explicit preference exists', () => {
    expect(resolveTheme(null)).toBe('dark')
    expect(resolveTheme('system')).toBe('dark')
  })

  it('accepts each explicit theme', () => {
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
  })
})

describe('theme application', () => {
  it('uses the theme already resolved on the document before consulting storage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    document.documentElement.dataset.theme = 'dark'
    expect(getInitialTheme()).toBe('dark')
  })

  it('restores a valid stored preference when the document is not initialized', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(getInitialTheme()).toBe('light')
  })

  it('persists an explicit selection and updates document state', () => {
    applyTheme('light', true)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })
})
