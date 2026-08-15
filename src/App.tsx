import { useState } from 'react'
import { ToastProvider } from './app/ToastProvider'
import { AuthGate } from './features/auth/AuthGate'
import { MonthView } from './features/analytics/MonthView'
import { AveragesView } from './features/analytics/AveragesView'
import { ImportExportScreen } from './features/import/ImportExportScreen'
import { CategoriesScreen } from './features/categories/CategoriesScreen'
import { supabase } from './lib/supabase'

type Screen = 'month' | 'averages' | 'categories' | 'import'

const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'averages', label: 'Averages' },
  { id: 'categories', label: 'Categories' },
  { id: 'import', label: 'Import / Export' },
]

function App() {
  const [screen, setScreen] = useState<Screen>('month')

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
                  onClick={() => setScreen(item.id)}
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
              onClick={() => void supabase.auth.signOut()}
              className="t-meta ml-auto text-text-3 hover:text-text-2"
            >
              Sign out
            </button>
          </header>

          <main className="pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
            {screen === 'month' ? (
              <MonthView />
            ) : screen === 'averages' ? (
              <AveragesView />
            ) : screen === 'categories' ? (
              <CategoriesScreen />
            ) : (
              <ImportExportScreen />
            )}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScreen(item.id)}
                className={`t-micro flex h-11 min-w-11 flex-1 items-center justify-center normal-case ${
                  screen === item.id ? 'font-semibold text-accent' : 'text-text-3'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </AuthGate>
    </ToastProvider>
  )
}

export default App
