import { useEffect, useMemo, useRef, useState } from 'react'
import { parseAmountExpression } from '../../lib/expressionParser'
import { formatCents } from '../../lib/money'
import { rankCategoriesByCount } from '../../lib/categoryRanking'
import {
  createTransactions,
  deleteTransactions,
  getOrCreateCategory,
  useCategories,
  useTransactions,
} from '../../db/repository'
import { useToast } from '../../app/ToastProvider'
import {
  CategoryAllPicker,
  CategoryChipsRow,
  useCategoryChips,
  type CategorySelectorHandle,
} from './CategorySelector'

function toLocalIso(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayIso(): string {
  return toLocalIso(new Date())
}

function yesterdayOf(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return toLocalIso(d)
}

function formatShortDate(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00')
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

const segmentClass = (active: boolean) =>
  `t-meta h-fit rounded-full px-[11px] py-1.5 font-semibold transition-colors duration-[120ms] ease-out ${
    active ? 'bg-surface text-text shadow-1' : 'text-text-2 hover:text-text'
  }`

export function ExpenseEntryForm() {
  const categories = useCategories()
  const transactions = useTransactions()
  const { showUndoToast, showErrorToast } = useToast()

  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [date, setDate] = useState(todayIso())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')

  const amountRef = useRef<HTMLInputElement>(null)
  const allPickerRef = useRef<CategorySelectorHandle>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const noteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  const activeCategories = useMemo(() => categories.filter((c) => !c.isArchived), [categories])
  const rankedCategories = useMemo(
    () => rankCategoriesByCount(activeCategories, transactions),
    [activeCategories, transactions],
  )
  const chips = useCategoryChips(rankedCategories, selectedCategoryId)

  const today = todayIso()
  const yesterdayOfToday = yesterdayOf(today)
  const isTodayActive = !showDatePicker && date === today
  const isYesterdayActive = !showDatePicker && date === yesterdayOfToday
  const isPickActive = showDatePicker || (!isTodayActive && !isYesterdayActive)

  const preview = useMemo(() => {
    if (!/[+\-*/()]/.test(amount)) return null
    const parsed = parseAmountExpression(amount)
    if (!parsed.ok) return null
    return formatCents(parsed.centsPerTerm.reduce((sum, cents) => sum + cents, 0))
  }, [amount])

  function openDatePicker() {
    setShowDatePicker(true)
    requestAnimationFrame(() => {
      const input = dateInputRef.current
      if (!input) return
      if ('showPicker' in input) {
        try {
          ;(input as HTMLInputElement & { showPicker: () => void }).showPicker()
          return
        } catch {
          // fall through to focus
        }
      }
      input.focus()
    })
  }

  async function handleSave(categoryOverride?: number) {
    const categoryId = categoryOverride ?? selectedCategoryId
    const parsed = parseAmountExpression(amount)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    if (categoryId === null || categoryId === undefined) {
      setError('Select a category')
      return
    }
    setError(null)

    const entries = parsed.centsPerTerm.map((amountCents) => ({
      amountCents,
      categoryId,
      date,
      note,
    }))

    const savedCount = entries.length
    const savedAmount = amount
    const savedCategoryId = categoryId
    const savedDate = date
    const savedNote = note
    const idsPromise = createTransactions(entries)

    setAmount('')
    setSelectedCategoryId(null)
    setNote('')
    setNoteOpen(false)
    amountRef.current?.focus()

    try {
      const ids = await idsPromise
      showUndoToast(
        savedCount === 1 ? 'Transaction saved' : `${savedCount} transactions saved`,
        () => {
          void deleteTransactions(ids)
        },
      )
    } catch {
      setAmount(savedAmount)
      setSelectedCategoryId(savedCategoryId)
      setDate(savedDate)
      setNote(savedNote)
      if (savedNote) setNoteOpen(true)
      showErrorToast(
        savedCount === 1 ? 'Could not save transaction' : 'Could not save transactions',
      )
    }
  }

  async function handleCreateCategory(name: string): Promise<number> {
    return getOrCreateCategory(name, false)
  }

  return (
    <div className="flex flex-col gap-[10px] rounded-lg border border-border bg-surface p-3 shadow-1 min-[900px]:p-3.5">
      <div
        className="grid min-w-0 grid-cols-[1fr_84px] items-center gap-[10px] [grid-template-areas:'amount_save'_'chips_chips'_'meta_meta'] min-[900px]:grid-cols-[260px_auto_auto_1fr_120px] min-[900px]:[grid-template-areas:'amount_date_note_._save'_'chips_chips_chips_chips_all']"
      >
        <div className="min-w-0 [grid-area:amount]">
          <div className="flex h-12 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 transition-colors duration-[120ms] ease-out focus-within:border-accent">
            <span aria-hidden className="text-[18px] text-text-3">
              €
            </span>
            <input
              ref={amountRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (selectedCategoryId !== null) {
                    void handleSave()
                  } else {
                    allPickerRef.current?.focus()
                  }
                }
              }}
              placeholder="0.00"
              aria-label="Amount"
              autoFocus
              className="tabular-amount min-w-0 flex-1 border-none bg-transparent text-[24px] font-[650] tracking-[-0.02em] text-text outline-none placeholder:text-text-3"
            />
            {preview && (
              <span className="tabular-amount ml-auto shrink-0 text-[12px] font-medium text-text-2">
                ={preview}
              </span>
            )}
          </div>
          {error && <p className="mt-1 text-sm text-error">{error}</p>}
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          className="t-body h-12 w-[84px] flex-none rounded-md bg-accent font-semibold text-white transition-colors duration-[120ms] ease-out hover:bg-accent-hover active:bg-accent-press [grid-area:save] min-[900px]:w-[120px]"
        >
          Save
        </button>

        <CategoryChipsRow
          chips={chips}
          selectedCategoryId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          className="min-w-0 [grid-area:chips]"
        />

        <div className="flex min-w-0 items-center gap-1.5 [grid-area:meta] min-[900px]:contents">
          <div className="relative min-[900px]:[grid-area:date]">
            <div className="inline-flex w-fit gap-0.5 rounded-full bg-surface-2 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setDate(today)
                  setShowDatePicker(false)
                }}
                className={segmentClass(isTodayActive)}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setDate((d) => yesterdayOf(d))
                  setShowDatePicker(false)
                }}
                className={segmentClass(isYesterdayActive)}
              >
                <span className="min-[900px]:hidden">Yest.</span>
                <span className="hidden min-[900px]:inline">Yesterday</span>
              </button>
              <button type="button" onClick={openDatePicker} className={segmentClass(isPickActive)}>
                {formatShortDate(date)}
              </button>
            </div>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              tabIndex={-1}
              aria-hidden
              className="absolute h-px w-px overflow-hidden opacity-0"
              style={{ clip: 'rect(0,0,0,0)' }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setNoteOpen(true)
              requestAnimationFrame(() => noteInputRef.current?.focus())
            }}
            className="t-meta ml-auto flex h-[30px] flex-none items-center whitespace-nowrap rounded-full border border-border px-[11px] font-medium text-text-2 hover:text-text min-[900px]:ml-0 min-[900px]:[grid-area:note]"
          >
            + note
          </button>

          <CategoryAllPicker
            ref={allPickerRef}
            rankedCategories={rankedCategories}
            selectedCategoryId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onCreateCategory={handleCreateCategory}
            onSubmit={(categoryId) => void handleSave(categoryId)}
            className="min-[900px]:[grid-area:all] min-[900px]:ml-auto"
            label={
              <>
                <span className="min-[900px]:hidden">All</span>
                <span className="hidden min-[900px]:inline">All categories</span>
              </>
            }
          />
        </div>
      </div>

      {noteOpen && (
        <input
          ref={noteInputRef}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          className="t-body h-11 w-full rounded-sm border-none bg-transparent px-0 text-text outline-none focus:border-b focus:border-accent placeholder:text-text-3"
        />
      )}
    </div>
  )
}
