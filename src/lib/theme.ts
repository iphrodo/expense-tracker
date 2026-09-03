export type Theme = 'dark' | 'light'

export const DARK_THEME_START_HOUR = 20
export const LIGHT_THEME_START_HOUR = 7

export function resolveThemeAtTime(date = new Date()): Theme {
  const hour = date.getHours()
  return hour >= DARK_THEME_START_HOUR || hour < LIGHT_THEME_START_HOUR ? 'dark' : 'light'
}

export function millisecondsUntilThemeChange(date = new Date()): number {
  const nextChange = new Date(date)

  if (resolveThemeAtTime(date) === 'dark') {
    nextChange.setHours(LIGHT_THEME_START_HOUR, 0, 0, 0)
    if (date.getHours() >= DARK_THEME_START_HOUR) nextChange.setDate(nextChange.getDate() + 1)
  } else {
    nextChange.setHours(DARK_THEME_START_HOUR, 0, 0, 0)
  }

  return nextChange.getTime() - date.getTime()
}

export function getInitialTheme(): Theme {
  const documentTheme = document.documentElement.dataset.theme
  return documentTheme === 'dark' || documentTheme === 'light'
    ? documentTheme
    : resolveThemeAtTime()
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  const themeColor = theme === 'dark' ? '#111315' : '#fbfbfa'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)
}
