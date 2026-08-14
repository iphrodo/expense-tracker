import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastState {
  id: number
  message: string
  onUndo: () => void
}

interface ToastContextValue {
  showUndoToast: (message: string, onUndo: () => void) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextId = useRef(0)

  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    const id = nextId.current++
    setToast({ id, message, onUndo })
    timeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, TOAST_DURATION_MS)
  }, [])

  const handleUndo = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    toast?.onUndo()
    setToast(null)
  }

  return (
    <ToastContext.Provider value={{ showUndoToast }}>
      {children}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="font-semibold text-emerald-400 hover:underline dark:text-emerald-600"
          >
            Undo
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
