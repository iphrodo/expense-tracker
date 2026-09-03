import { useEffect, useMemo, useRef, useState } from 'react'
import type { Category, Transaction } from '../../db/schema'
import { computeHistoricalTotals, computeMonthSummary, computeNamedCategoryDailyAverages, monthOf } from '../../lib/averages'
import { rankCategoriesByCount } from '../../lib/categoryRanking'
import { groupTransactionsByDay } from '../../lib/dateGroups'
import { formatCents } from '../../lib/money'
import { getCategoryColorRoles } from '../../lib/categoryColor'
import {
  getOrCreateCategory,
  removeExclusion,
  setExclusion,
  setMonthFlag,
  clearMonthFlag,
  useCategories,
  useExclusions,
  useMonthFlags,
  useTransactions,
} from '../../db/repository'
import { EditTransactionPanel } from '../entry/EditTransactionPanel'
import { ExpenseEntryForm } from '../entry/ExpenseEntryForm'
import { useToast } from '../../app/ToastProvider'
import { ConfirmDialog } from './ConfirmDialog'

function currentMonthIso(): string {
  return new Date().toISOString().slice(0, 7)
}

const MONTH_NAMES = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
]

function formatDayHeader(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00')
  return d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' })
}

interface MonthPickerProps {
  selectedYear: number
  selectedMonthIndex: number
  years: number[]
  monthIndexesByYear: Map<number, number[]>
  onPick: (year: number, monthIndex: number) => void
}

function MonthPicker({ selectedYear, selectedMonthIndex, years, monthIndexesByYear, onPick }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selectedYear)

  const yearIndex = years.indexOf(viewYear)
  const previousYear = yearIndex > 0 ? years[yearIndex - 1] : undefined
  const nextYear = yearIndex >= 0 ? years[yearIndex + 1] : undefined
  const availableMonths = new Set(monthIndexesByYear.get(viewYear) ?? [])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) setViewYear(selectedYear)
          setOpen((value) => !value)
        }}
        aria-expanded={open}
        className="t-meta h-9 rounded-full border border-border bg-surface px-s3 font-semibold text-text hover:bg-surface-2"
      >
        {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close month picker"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute z-20 mt-s2 w-64 rounded-lg border border-border bg-surface p-s3 shadow-2 transition-[opacity,transform] duration-[220ms] [transition-timing-function:cubic-bezier(.2,.8,.2,1)]">
            <div className="mb-s2 flex items-center justify-between">
              <button
                type="button"
                disabled={previousYear === undefined}
                onClick={() => previousYear !== undefined && setViewYear(previousYear)}
                className="t-body h-8 w-8 rounded-md text-text-2 hover:bg-surface-2 disabled:opacity-30"
                aria-label="Previous year"
              >
                ‹
              </button>
              <span className="t-body font-semibold text-text">{viewYear}</span>
              <button
                type="button"
                disabled={nextYear === undefined}
                onClick={() => nextYear !== undefined && setViewYear(nextYear)}
                className="t-body h-8 w-8 rounded-md text-text-2 hover:bg-surface-2 disabled:opacity-30"
                aria-label="Next year"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-3 gap-s1">
              {MONTH_NAMES.map((name, index) => {
                const available = availableMonths.has(index)
                const active = viewYear === selectedYear && index === selectedMonthIndex
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      onPick(viewYear, index)
                      setOpen(false)
                    }}
                    className={`t-meta h-9 rounded-md ${
                      active
                        ? 'bg-accent-weak font-semibold text-accent-text'
                        : available
                          ? 'text-text hover:bg-surface-2'
                          : 'text-text-3 opacity-40'
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface CategoryFilterProps {
  categories: Category[]
  selectedCategoryId: number | null
  onSelect: (categoryId: number | null) => void
}

function CategoryFilter({ categories, selectedCategoryId, onSelect }: CategoryFilterProps) {
  const [open, setOpen] = useState(false)
  const selected = categories.find((c) => c.id === selectedCategoryId)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="t-meta flex h-9 max-w-40 items-center gap-1 rounded-full border border-border bg-surface px-s3 font-semibold text-text hover:bg-surface-2"
      >
        <span className="min-w-0 truncate">{selected ? selected.name : 'All categories'}</span>
        <span aria-hidden className="shrink-0">
          ▾
        </span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close category filter"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute z-20 mt-s2 w-56 rounded-lg border border-border bg-surface p-s2 shadow-2">
            <button
              type="button"
              onClick={() => {
                onSelect(null)
                setOpen(false)
              }}
              className={`t-meta flex w-full items-center rounded-md px-s2 py-s2 text-left ${
                selectedCategoryId === null
                  ? 'bg-accent-weak font-semibold text-accent-text'
                  : 'text-text hover:bg-surface-2'
              }`}
            >
              All categories
            </button>
            <div className="mt-s1 max-h-64 overflow-auto">
              {categories.map((c) => {
                const roles = getCategoryColorRoles(c)
                const active = c.id === selectedCategoryId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (c.id !== undefined) {
                        onSelect(c.id)
                        setOpen(false)
                      }
                    }}
                    className={`t-meta flex w-full items-center gap-s2 rounded-md px-s2 py-s2 text-left ${
                      active ? 'bg-accent-weak font-semibold text-accent-text' : 'text-text hover:bg-surface-2'
                    }`}
                  >
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: roles.dot }} />
                    {c.name}
                  </button>
                )
              })}
              {categories.length === 0 && (
                <p className="px-s2 py-s2 text-xs text-text-3">No categories this month</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

type BreakdownRow = { categoryId: number; name: string; subtotalCents: number }

function sortRows(rows: BreakdownRow[]): BreakdownRow[] {
  return [...rows].sort((a, b) => b.subtotalCents - a.subtotalCents)
}

export function MonthView() {
  const categories = useCategories()
  const transactions = useTransactions()
  const exclusions = useExclusions()
  const monthFlags = useMonthFlags()
  const { showErrorToast } = useToast()

  const [month, setMonth] = useState(currentMonthIso())
  const [selectedCategoryIdState, setSelectedCategoryId] = useState<number | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [exclusionDialog, setExclusionDialog] = useState<
    { categoryId: number; mode: 'exclude' | 'include' } | null
  >(null)

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const selectedCategoryId =
    selectedCategoryIdState !== null && categoryById.has(selectedCategoryIdState)
      ? selectedCategoryIdState
      : null
  const activeCategories = useMemo(() => categories.filter((c) => !c.isArchived), [categories])
  const rankedCategories = useMemo(
    () => rankCategoriesByCount(activeCategories, transactions),
    [activeCategories, transactions],
  )

  const monthTransactions = useMemo(
    () => transactions.filter((tx) => monthOf(tx.date) === month),
    [transactions, month],
  )

  const dateGroups = useMemo(
    () => groupTransactionsByDay(monthTransactions, selectedCategoryId),
    [monthTransactions, selectedCategoryId],
  )

  const filterableCategories = useMemo(() => {
    const idsWithTx = new Set(monthTransactions.map((tx) => tx.categoryId))
    return rankedCategories.filter((c) => c.id !== undefined && idsWithTx.has(c.id))
  }, [rankedCategories, monthTransactions])

  const monthTotal = monthTransactions.reduce((sum, tx) => sum + tx.amountCents, 0)

  const seenTxIds = useRef<Set<number> | null>(null)
  const [freshTxIds, setFreshTxIds] = useState<Set<number>>(new Set())
  const [statsOpen, setStatsOpen] = useState(false)
  useEffect(() => {
    const currentIds = new Set(transactions.map((tx) => tx.id))
    if (seenTxIds.current === null) {
      seenTxIds.current = currentIds
      return
    }
    const previousIds = seenTxIds.current
    const added = [...currentIds].filter((id) => !previousIds.has(id))
    seenTxIds.current = currentIds
    if (added.length === 0) return
    setFreshTxIds((prev) => new Set([...prev, ...added]))
    const timer = setTimeout(() => {
      setFreshTxIds((prev) => {
        const next = new Set(prev)
        for (const id of added) next.delete(id)
        return next
      })
    }, 200)
    return () => clearTimeout(timer)
  }, [transactions])

  const categoryGroups = useMemo(() => {
    const map = new Map<number, Transaction[]>()
    for (const tx of monthTransactions) {
      const list = map.get(tx.categoryId) ?? []
      list.push(tx)
      map.set(tx.categoryId, list)
    }
    return [...map.entries()]
  }, [monthTransactions])

  const categoryBreakdown = useMemo(() => {
    const daily: BreakdownRow[] = []
    const nonDaily: BreakdownRow[] = []
    for (const [categoryId, txs] of categoryGroups) {
      const subtotalCents = txs.reduce((sum, tx) => sum + tx.amountCents, 0)
      const row = { categoryId, name: categoryById.get(categoryId)?.name ?? 'Unknown', subtotalCents }
      if (categoryById.get(categoryId)?.isDaily) {
        daily.push(row)
      } else {
        nonDaily.push(row)
      }
    }
    return {
      daily,
      nonDaily,
      dailyTotalCents: daily.reduce((sum, row) => sum + row.subtotalCents, 0),
      nonDailyTotalCents: nonDaily.reduce((sum, row) => sum + row.subtotalCents, 0),
    }
  }, [categoryGroups, categoryById])

  const namedCategoryAverages = useMemo(
    () => computeNamedCategoryDailyAverages(transactions, categories, month, new Date()),
    [transactions, categories, month],
  )

  const historicalTotals = useMemo(
    () => computeHistoricalTotals(transactions, categories, monthFlags, new Date()),
    [transactions, categories, monthFlags],
  )

  const monthSummary = useMemo(
    () =>
      computeMonthSummary(
        transactions,
        categories,
        month,
        new Date(),
        historicalTotals.nonDailyMonthlyAverageCents,
      ),
    [transactions, categories, month, historicalTotals],
  )

  const exclusionKeys = useMemo(
    () => new Set(exclusions.map((e) => `${e.categoryId}|${e.month}`)),
    [exclusions],
  )
  const monthFlag = monthFlags.find((f) => f.month === month)

  const [selectedYear, selectedMonthIndex] = useMemo(() => {
    const [y, m] = month.split('-')
    return [Number(y), Number(m) - 1]
  }, [month])

  const monthsWithData = useMemo(
    () => [...new Set(transactions.map((tx) => monthOf(tx.date)))].sort(),
    [transactions],
  )

  const monthIndexesByYear = useMemo(() => {
    const map = new Map<number, number[]>()
    for (const key of monthsWithData) {
      const [y, m] = key.split('-')
      const year = Number(y)
      const list = map.get(year) ?? []
      list.push(Number(m) - 1)
      map.set(year, list)
    }
    return map
  }, [monthsWithData])

  const availableYears = useMemo(
    () => [...monthIndexesByYear.keys()].sort((a, b) => a - b),
    [monthIndexesByYear],
  )

  const years = availableYears.length > 0 ? availableYears : [selectedYear]

  useEffect(() => {
    const latestMonth = monthsWithData.at(-1)
    if (!latestMonth || monthsWithData.includes(month)) return

    const timer = window.setTimeout(() => setMonth(latestMonth), 0)
    return () => window.clearTimeout(timer)
  }, [monthsWithData, month])

  function updateMonth(year: number, monthIndex: number) {
    setMonth(`${year}-${String(monthIndex + 1).padStart(2, '0')}`)
  }

  async function confirmExclusionDialog(reason: string) {
    if (!exclusionDialog) return
    const { categoryId, mode } = exclusionDialog
    try {
      if (mode === 'exclude') {
        await setExclusion(categoryId, month, reason)
      } else {
        await removeExclusion(categoryId, month)
      }
      setExclusionDialog(null)
    } catch {
      showErrorToast('Could not update exclusion')
    }
  }

  async function toggleMonthComplete() {
    try {
      if (monthFlag) {
        if (monthFlag.isComplete) {
          await setMonthFlag(month, false)
        } else {
          await clearMonthFlag(month)
        }
      } else {
        await setMonthFlag(month, true)
      }
    } catch {
      showErrorToast('Could not update month status')
    }
  }

  const dailyShare = monthSummary.totalCents === 0 ? 0 : (monthSummary.dailyCents / monthSummary.totalCents) * 100
  const nonDailyShare = 100 - dailyShare

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-s5 p-s4 [grid-template-areas:'form'_'sidebar'_'rest'] md:[grid-template-areas:'form_sidebar'_'rest_sidebar'] md:grid-cols-[1.4fr_360px] md:grid-rows-[auto_1fr] md:items-start">
      <div className="[grid-area:form]">
        <ExpenseEntryForm />
      </div>

      <div className="flex flex-col gap-s4 [grid-area:rest]">
        <div className="flex flex-wrap items-end justify-between gap-s3">
          <div className="flex flex-wrap items-center gap-s2">
            <MonthPicker
              selectedYear={selectedYear}
              selectedMonthIndex={selectedMonthIndex}
              years={years}
              monthIndexesByYear={monthIndexesByYear}
              onPick={updateMonth}
            />
            <button
              type="button"
              onClick={() => void toggleMonthComplete()}
              className={`t-meta h-9 rounded-full px-s3 font-semibold transition-colors duration-[120ms] ease-out ${
                monthFlag?.isComplete === false
                  ? 'bg-accent-weak text-accent-text'
                  : monthFlag?.isComplete
                    ? 'bg-surface-2 text-text-2'
                    : 'bg-surface-2 text-text-2 hover:text-text'
              }`}
            >
              {monthFlag ? (monthFlag.isComplete ? 'Marked complete' : 'Marked incomplete') : 'Mark complete/incomplete'}
            </button>
            <CategoryFilter
              categories={filterableCategories}
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </div>
          <div className="text-right">
            <div className="t-micro text-text-3">TOTAL</div>
            <div className="t-num-lg text-text">{formatCents(monthTotal)}</div>
          </div>
        </div>

        {dateGroups.length === 0 && (
          <p className="t-body py-s5 text-center text-text-2">
            {selectedCategoryId !== null
              ? `No ${categoryById.get(selectedCategoryId)?.name ?? ''} transactions this month.`
              : 'No transactions this month.'}
          </p>
        )}

        {dateGroups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center justify-between px-s1 pb-s2">
              <span className="t-meta font-semibold text-text-2">{formatDayHeader(group.date)}</span>
              <span className="t-meta tabular-amount text-text-2">{formatCents(group.totalCents)}</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-1">
              {group.txs.map((tx, i) => {
                const roles = getCategoryColorRoles(categoryById.get(tx.categoryId))
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => setEditingTx(tx)}
                    className={`flex h-12 w-full items-center gap-s3 px-s3 text-left transition-colors duration-[120ms] ease-out hover:bg-surface-2 ${
                      i > 0 ? 'border-t border-border' : ''
                    } ${freshTxIds.has(tx.id) ? 'animate-row-in' : ''}`}
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: roles.dot }}
                    />
                    <span className="t-body min-w-0 flex-1 truncate text-text">
                      {categoryById.get(tx.categoryId)?.name ?? 'Unknown'}
                      {tx.note && <span className="ml-s2 text-text-3">{tx.note}</span>}
                    </span>
                    <span className="t-num shrink-0 text-text">{formatCents(tx.amountCents)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex w-full flex-col gap-s5 [grid-area:sidebar]">
        <button
          type="button"
          onClick={() => setStatsOpen((v) => !v)}
          aria-expanded={statsOpen}
          className="flex items-center justify-between rounded-lg border border-border bg-surface px-s4 py-s3 text-left t-body font-semibold text-text md:hidden"
        >
          <span>Статистика місяця</span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className={`size-4 shrink-0 text-text-2 transition-transform duration-[120ms] ease-out ${statsOpen ? 'rotate-180' : ''}`}
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className={`flex-col gap-s5 md:flex ${statsOpen ? 'flex' : 'hidden'}`}>
        <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
          <div className="t-micro text-text-3">Всього</div>
          <div className="t-display mt-1 text-text">{formatCents(monthSummary.totalCents)}</div>
          <div className="mt-s4 flex h-2 overflow-hidden rounded-full">
            <div className="h-full bg-accent" style={{ width: `${dailyShare}%` }} />
            <div className="h-full bg-surface-2" style={{ width: `${nonDailyShare}%` }} />
          </div>
          <div className="mt-s3 flex flex-col gap-s2">
            <div className="flex items-center gap-s2">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
              <span className="t-meta text-text-2">Щоденні витрати всього</span>
              <span className="t-num ml-auto text-text">{formatCents(monthSummary.dailyCents)}</span>
            </div>
            <div className="flex items-center gap-s2">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-surface-2" />
              <span className="t-meta text-text-2">Не щоденні витрати всього</span>
              <span className="t-num ml-auto text-text">{formatCents(monthSummary.nonDailyCents)}</span>
            </div>
          </div>
          <div className="mt-s4 flex items-baseline justify-between border-t border-border pt-s3">
            <span className="t-meta text-text-2">Щоденні витрати на 1 день</span>
            <span className="t-num text-text">{formatCents(monthSummary.dailyRateCents)}</span>
          </div>
          <div className="mt-s3 flex items-baseline justify-between border-t border-border pt-s3">
            <span className="t-meta text-text-2">Прогноз до кінця місяця (всього)</span>
            <span className="t-num-lg text-text">{formatCents(monthSummary.totalProjectedCents)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
          <h2 className="t-h2 mb-s3 text-text">Детально</h2>
          {namedCategoryAverages.map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b border-border py-s2">
              <span className="t-meta text-text-2">{row.label} за 1 день</span>
              <span className="t-num text-text">
                {row.dailyRateCents === 0 ? '—' : formatCents(row.dailyRateCents)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-s3">
            <span className="t-body font-semibold text-text">Разом</span>
            <span className="t-body font-semibold text-text">
              {formatCents(namedCategoryAverages.reduce((sum, row) => sum + row.dailyRateCents, 0))}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
          <h2 className="t-h2 mb-s3 text-text">По категоріях</h2>
          {(
            [
              {
                key: 'daily' as const,
                label: 'Щоденні витрати',
                rows: categoryBreakdown.daily,
                totalCents: categoryBreakdown.dailyTotalCents,
              },
              {
                key: 'nonDaily' as const,
                label: 'Не щоденні витрати',
                rows: categoryBreakdown.nonDaily,
                totalCents: categoryBreakdown.nonDailyTotalCents,
              },
            ] as const
          ).map((section) => {
            const rows = sortRows(section.rows)
            const sectionMax = section.totalCents === 0 ? 0 : section.totalCents
            return (
              <div key={section.label} className="mb-s3 last:mb-0">
                <div className="flex items-center justify-between pb-s2">
                  <span className="t-micro text-text-3">{section.label}</span>
                  <span className="t-meta tabular-amount text-text-2">{formatCents(section.totalCents)}</span>
                </div>
                {rows.length === 0 && <p className="py-s2 text-xs text-text-3">Немає витрат</p>}
                {rows.map((row) => {
                  const excluded = exclusionKeys.has(`${row.categoryId}|${month}`)
                  const roles = getCategoryColorRoles(categoryById.get(row.categoryId))
                  const share = sectionMax === 0 ? 0 : (row.subtotalCents / sectionMax) * 100
                  return (
                    <div key={row.categoryId} className="group py-s2">
                      <div className="flex items-center gap-s2">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: roles.dot }}
                        />
                        <span className="t-body min-w-0 flex-1 truncate text-text">
                          {row.name}
                          {excluded && (
                            <span className="ml-s2 rounded-sm bg-surface-2 px-s1 py-0.5 text-xs text-text-2">
                              excluded from averages
                            </span>
                          )}
                        </span>
                        <span className="t-num text-text">{formatCents(row.subtotalCents)}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setExclusionDialog({
                              categoryId: row.categoryId,
                              mode: excluded ? 'include' : 'exclude',
                            })
                          }
                          aria-label={excluded ? 'Include in averages' : 'Exclude from averages'}
                          title={excluded ? 'Include in averages' : 'Exclude from averages'}
                          className="rounded-sm px-1 text-xs text-text-3 opacity-0 transition-opacity duration-[120ms] ease-out group-hover:opacity-100 hover:text-text focus-visible:opacity-100"
                        >
                          {excluded ? '↩' : '⊘'}
                        </button>
                      </div>
                      <div className="mt-s2 h-[3px] rounded-full bg-surface-2">
                        <div
                          className="h-[3px] rounded-full"
                          style={{ width: `${share}%`, backgroundColor: roles.dot }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        </div>
      </div>

      {editingTx && (
        <EditTransactionPanel
          transaction={editingTx}
          rankedCategories={rankedCategories}
          onCreateCategory={(name) => getOrCreateCategory(name, false)}
          onClose={() => setEditingTx(null)}
        />
      )}

      {exclusionDialog && (
        <ConfirmDialog
          title={exclusionDialog.mode === 'exclude' ? 'Exclude category from averages' : 'Include category in averages'}
          initialReason={
            exclusionDialog.mode === 'include'
              ? (exclusions.find(
                  (e) => e.categoryId === exclusionDialog.categoryId && e.month === month,
                )?.reason ?? '')
              : ''
          }
          onConfirm={(reason) => void confirmExclusionDialog(reason)}
          onClose={() => setExclusionDialog(null)}
        />
      )}
    </div>
  )
}
