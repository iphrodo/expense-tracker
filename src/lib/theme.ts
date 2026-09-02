export const THEME_STORAGE_KEY = 'expense-tracker.theme'

export type Theme = 'dark' | 'light'

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'dark' || value === 'light'
}

export function resolveTheme(storedValue: string | null | undefined): Theme {
  return isTheme(storedValue) ? storedValue : 'dark'
}

function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

export function getInitialTheme(): Theme {
  const documentTheme = document.documentElement.dataset.theme
  return isTheme(documentTheme) ? documentTheme : resolveTheme(readStoredTheme())
}

export function applyTheme(theme: Theme, persist = false) {
  document.documentElement.dataset.theme = theme
  const themeColor = theme === 'dark' ? '#111315' : '#fbfbfa'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)

  if (!persist) return

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // A private/restricted browser context can still use the selected theme for this session.
  }
}
