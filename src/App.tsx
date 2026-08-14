import { useState } from 'react'
import { ToastProvider } from './app/ToastProvider'
import { MonthView } from './features/analytics/MonthView'
import { AveragesView } from './features/analytics/AveragesView'
import { ImportExportScreen } from './features/import/ImportExportScreen'

type Screen = 'month' | 'averages' | 'import'

const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'averages', label: 'Averages' },
  { id: 'import', label: 'Import / Export' },
]

function App() {
  const [screen, setScreen] = useState<Screen>('month')

  return (
    <ToastProvider>
      <div className="min-h-svh bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {screen === 'month' ? (
          <MonthView />
        ) : screen === 'averages' ? (
          <AveragesView />
        ) : (
          <ImportExportScreen />
        )}

        <nav className="fixed bottom-0 left-0 right-0 flex justify-center gap-1 border-t border-neutral-200 bg-white/95 p-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              tabIndex={-1}
              onClick={() => setScreen(item.id)}
              className={`rounded px-3 py-1 text-sm ${
                screen === item.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="h-14" />
      </div>
    </ToastProvider>
  )
}

export default App
