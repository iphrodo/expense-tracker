import { useEffect, useRef, useState } from 'react'
import { ToastProvider } from './app/ToastProvider'
import { AuthGate } from './features/auth/AuthGate'
import { MonthView } from './features/analytics/MonthView'
import { AveragesView } from './features/analytics/AveragesView'
import { CategoryHistoryView } from './features/analytics/CategoryHistoryView'
import { ImportExportScreen } from './features/import/ImportExportScreen'
import { CategoriesScreen } from './features/categories/CategoriesScreen'
import { supabase } from './lib/supabase'
import { applyTheme, getInitialTheme, millisecondsUntilThemeChange, resolveThemeAtTime, type Theme } from './lib/theme'

type Screen = 'month' | 'history' | 'averages' | 'categories' | 'import'

const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'history', label: 'History' },
  { id: 'averages', label: 'Averages' },
  { id: 'categories', label: 'Categories' },
  { id: 'import', label: 'Import / Export' },
]

const MOBILE_ITEMS: { id: Extract<Screen, 'month' | 'history' | 'averages'>; label: string; icon: string }[] = [
  { id: 'month', label: 'Місяць', icon: '□' },
  { id: 'history', label: 'Історія', icon: '◷' },
  { id: 'averages', label: 'Середні', icon: '⌁' },
]

function App() {
  const [screen, setScreen] = useState<Screen>('month')
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreTriggerRef = useRef<HTMLButtonElement>(null)
  const moreFirstActionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    moreFirstActionRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreOpen(false)
        requestAnimationFrame(() => moreTriggerRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [moreOpen])

  useEffect(() => {
    let timeoutId: number | undefined

    const scheduleThemeChange = () => {
      const nextTheme = resolveThemeAtTime()
      applyTheme(nextTheme)
      setTheme(nextTheme)
      timeoutId = window.setTimeout(scheduleThemeChange, millisecondsUntilThemeChange())
    }

    const syncThemeWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timeoutId)
        scheduleThemeChange()
      }
    }

    scheduleThemeChange()
    document.addEventListener('visibilitychange', syncThemeWhenVisible)
    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', syncThemeWhenVisible)
    }
  }, [])

  function closeMore(returnFocus = false) {
    setMoreOpen(false)
    if (returnFocus) requestAnimationFrame(() => moreTriggerRef.current?.focus())
  }

  function navigate(nextScreen: Screen) {
    closeMore()
    setScreen(nextScreen)
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(nextTheme)
    setTheme(nextTheme)
  }

  const moreActive = screen === 'categories' || screen === 'import'
  const isLightTheme = theme === 'light'
  const themeActionLabel = isLightTheme ? 'Увімкнути темну тему' : 'Увімкнути світлу тему'
  const themeButtonLabel = isLightTheme ? 'Темна тема' : 'Світла тема'

  return (
    <ToastProvider>
      <AuthGate>
        <div className="min-h-svh bg-bg text-text">
          <header className="sticky top-0 z-30 hidden h-14 items-center gap-s5 border-b border-border bg-surface px-s6 md:flex">
            <span className="t-body font-bold text-text">Витрати</span>
            <div className="inline-flex gap-0.5 rounded-full bg-surface-2 p-[3px]">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`t-body h-9 rounded-full px-s3 font-semibold transition-colors duration-[120ms] ease-out ${
                    screen === item.id ? 'bg-surface text-text shadow-1' : 'text-text-2 hover:text-text'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={isLightTheme}
              aria-label={themeActionLabel}
              title={themeActionLabel}
              className="t-meta ml-auto inline-flex h-9 items-center gap-s2 rounded-md px-s2 text-text-2 hover:bg-surface-2 hover:text-text"
            >
              <span aria-hidden>{isLightTheme ? '◐' : '☀'}</span>
              {themeButtonLabel}
            </button>
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="t-meta text-text-3 hover:text-text-2"
            >
              Sign out
            </button>
          </header>

          <main className="pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
            {screen === 'month' ? <MonthView /> : screen === 'history' ? <CategoryHistoryView /> : screen === 'averages' ? <AveragesView /> : screen === 'categories' ? <CategoriesScreen /> : <ImportExportScreen />}
          </main>

          {moreOpen && <button type="button" aria-label="Закрити меню Ще" className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => closeMore(true)} />}
          {moreOpen && <section id="more-menu" aria-label="Ще" className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-s3 right-s3 z-40 rounded-lg border border-border bg-surface p-s2 shadow-2 md:hidden">
            <button ref={moreFirstActionRef} type="button" onClick={() => navigate('categories')} className="t-body flex min-h-11 w-full items-center rounded-md px-s3 text-left text-text hover:bg-surface-2">Категорії</button>
            <button type="button" onClick={() => navigate('import')} className="t-body flex min-h-11 w-full items-center rounded-md px-s3 text-left text-text hover:bg-surface-2">Імпорт / експорт</button>
            <button type="button" onClick={toggleTheme} aria-pressed={isLightTheme} aria-label={themeActionLabel} className="t-body flex min-h-11 w-full items-center gap-s2 rounded-md px-s3 text-left text-text hover:bg-surface-2"><span aria-hidden>{isLightTheme ? '◐' : '☀'}</span>{themeButtonLabel}</button>
            <button type="button" onClick={() => { closeMore(); void supabase.auth.signOut() }} className="t-body flex min-h-11 w-full items-center rounded-md px-s3 text-left text-text hover:bg-surface-2">Вийти</button>
          </section>}
          <nav aria-label="Основна навігація" className="fixed bottom-0 left-0 right-0 z-40 flex h-[calc(64px+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-surface pt-s1 md:hidden">
            {MOBILE_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={screen === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
                className={`t-micro flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 normal-case ${
                  screen === item.id ? 'font-semibold text-accent' : 'text-text-3'
                }`}
              >
                <span aria-hidden className="text-base leading-none">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <button ref={moreTriggerRef} type="button" aria-current={moreActive ? 'page' : undefined} aria-expanded={moreOpen} aria-controls="more-menu" onClick={() => setMoreOpen((open) => !open)} className={`t-micro flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 normal-case ${moreActive || moreOpen ? 'font-semibold text-accent' : 'text-text-3'}`}><span aria-hidden className="text-base leading-none">•••</span>Ще</button>
          </nav>
        </div>
      </AuthGate>
    </ToastProvider>
  )
}

export default App
