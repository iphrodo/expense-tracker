import { useEffect, useMemo, useState } from 'react'
import type { Transaction } from '../../db/schema'
import { computeMonthSummary, computeNamedCategoryDailyAverages, monthOf } from '../../lib/averages'
import { rankCategoriesByCount } from '../../lib/categoryRanking'
import { formatCents } from '../../lib/money'
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
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]


export function MonthView() {
  const categories = useCategories()
  const transactions = useTransactions()
  const exclusions = useExclusions()
  const monthFlags = useMonthFlags()
  const { showErrorToast } = useToast()

  const [month, setMonth] = useState(currentMonthIso())
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [exclusionDialog, setExclusionDialog] = useState<
    { categoryId: number; mode: 'exclude' | 'include' } | null
  >(null)

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const activeCategories = useMemo(() => categories.filter((c) => !c.isArchived), [categories])
  const rankedCategories = useMemo(
    () => rankCategoriesByCount(activeCategories, transactions),
    [activeCategories, transactions],
  )

  const monthTransactions = useMemo(
    () => transactions.filter((tx) => monthOf(tx.date) === month),
    [transactions, month],
  )

  const sortedTransactions = useMemo(() => {
    return [...monthTransactions].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return b.id - a.id
    })
  }, [monthTransactions])

  const dateGroups = useMemo(() => {
    const groups: { date: string; txs: Transaction[] }[] = []
    for (const tx of sortedTransactions) {
      const last = groups[groups.length - 1]
      if (last && last.date === tx.date) {
        last.txs.push(tx)
      } else {
        groups.push({ date: tx.date, txs: [tx] })
      }
    }
    return groups
  }, [sortedTransactions])

  const monthTotal = monthTransactions.reduce((sum, tx) => sum + tx.amountCents, 0)

  const categoryGroups = useMemo(() => {
    const map = new Map<number, Transaction[]>()
    for (const tx of monthTransactions) {
      const list = map.get(tx.categoryId) ?? []
      list.push(tx)
      map.set(tx.categoryId, list)
    }
    return [...map.entries()].sort((a, b) => {
      const nameA = categoryById.get(a[0])?.name ?? ''
      const nameB = categoryById.get(b[0])?.name ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [monthTransactions, categoryById])

  const categoryBreakdown = useMemo(() => {
    const daily: { categoryId: number; name: string; subtotalCents: number }[] = []
    const nonDaily: { categoryId: number; name: string; subtotalCents: number }[] = []
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

  const monthSummary = useMemo(
    () => computeMonthSummary(transactions, categories, month, new Date()),
    [transactions, categories, month],
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
  const monthIndexesForSelectedYear = monthIndexesByYear.get(selectedYear) ?? [selectedMonthIndex]

  useEffect(() => {
    if (monthsWithData.length > 0 && !monthsWithData.includes(month)) {
      setMonth(monthsWithData[monthsWithData.length - 1]!)
    }
  }, [monthsWithData, month])

  function updateMonth(year: number, monthIndex: number) {
    setMonth(`${year}-${String(monthIndex + 1).padStart(2, '0')}`)
  }

  function handleYearChange(newYear: number) {
    const indexes = monthIndexesByYear.get(newYear) ?? []
    const newIndex = indexes.includes(selectedMonthIndex) ? selectedMonthIndex : (indexes[0] ?? 0)
    updateMonth(newYear, newIndex)
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

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 p-4 [grid-template-areas:'form'_'sidebar'_'rest'] lg:grid-cols-[1fr_20rem] lg:items-start lg:[grid-template-areas:'form_sidebar'_'rest_sidebar']">
      <div className="[grid-area:form]">
        <ExpenseEntryForm />
      </div>

      <div className="flex flex-col gap-4 [grid-area:rest]">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMonthIndex}
            onChange={(e) => updateMonth(selectedYear, Number(e.target.value))}
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {monthIndexesForSelectedYear.map((index) => (
              <option key={index} value={index}>
                {MONTH_NAMES[index]}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void toggleMonthComplete()}
            className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700"
          >
            {monthFlag ? (monthFlag.isComplete ? 'Marked complete' : 'Marked incomplete') : 'Mark complete/incomplete'}
          </button>
          <span className="text-lg font-semibold sm:ml-auto">
            Total: {formatCents(monthTotal)}
          </span>
        </div>

        {dateGroups.length === 0 && <p className="text-neutral-500">No transactions this month.</p>}

        {dateGroups.map((group) => (
          <div key={group.date}>
            <h3 className="mb-1 text-sm font-semibold text-neutral-500">{group.date}</h3>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {group.txs.map((tx) => (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => setEditingTx(tx)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:opacity-80 ${categoryById.get(tx.categoryId)?.color ?? ''}`}
                  >
                    <span>
                      {categoryById.get(tx.categoryId)?.name ?? 'Unknown'}
                      {tx.note && <span className="ml-2 opacity-70">{tx.note}</span>}
                    </span>
                    <span className="font-mono">{formatCents(tx.amountCents)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex w-full flex-col gap-4 [grid-area:sidebar]">
        <div className="rounded border border-neutral-200 p-3 dark:border-neutral-700">
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <li className="flex items-center justify-between py-1 text-sm font-semibold">
              <span>Всього</span>
              <span className="font-mono">{formatCents(monthSummary.totalCents)}</span>
            </li>
            <li className="flex items-center justify-between py-1 text-sm">
              <span>Не щоденні витрати всього</span>
              <span className="font-mono">{formatCents(monthSummary.nonDailyCents)}</span>
            </li>
            <li className="flex items-center justify-between py-1 text-sm">
              <span>Щоденні витрати всього</span>
              <span className="font-mono">{formatCents(monthSummary.dailyCents)}</span>
            </li>
            <li className="flex items-center justify-between py-1 text-sm">
              <span>Щоденні витрати на 1 день</span>
              <span className="font-mono">{formatCents(monthSummary.dailyRateCents)}</span>
            </li>
            <li className="flex items-center justify-between py-1 text-sm">
              <span>Щоденні витрати (місяць)</span>
              <span className="font-mono">{formatCents(monthSummary.projectedCents)}</span>
            </li>
          </ul>
        </div>

        <div className="rounded border border-neutral-200 p-3 dark:border-neutral-700">
          <h2 className="mb-2 text-lg font-semibold">Детально</h2>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {namedCategoryAverages.map((row) => (
              <li key={row.label} className="flex items-center justify-between py-1 text-sm">
                <span>{row.label} за 1 день</span>
                <span className="font-mono">
                  {row.dailyRateCents === 0 ? '—' : formatCents(row.dailyRateCents)}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between py-1 text-sm font-semibold">
              <span>Разом</span>
              <span className="font-mono">
                {formatCents(namedCategoryAverages.reduce((sum, row) => sum + row.dailyRateCents, 0))}
              </span>
            </li>
          </ul>
        </div>
        <div className="rounded border border-neutral-200 p-3 dark:border-neutral-700">
          <h2 className="mb-2 text-lg font-semibold">По категоріях</h2>
          {([
            { label: 'Щоденні витрати', rows: categoryBreakdown.daily, totalCents: categoryBreakdown.dailyTotalCents },
            {
              label: 'Не щоденні витрати',
              rows: categoryBreakdown.nonDaily,
              totalCents: categoryBreakdown.nonDailyTotalCents,
            },
          ] as const).map((section) => (
            <div key={section.label} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between py-1 text-sm font-semibold">
                <span>{section.label}</span>
                <span className="font-mono">{formatCents(section.totalCents)}</span>
              </div>
              {section.rows.length === 0 && (
                <p className="py-1 text-xs text-neutral-500">Немає витрат</p>
              )}
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {section.rows.map((row) => {
                  const excluded = exclusionKeys.has(`${row.categoryId}|${month}`)
                  return (
                    <li
                      key={row.categoryId}
                      className={`flex items-center justify-between rounded px-2 py-1 text-sm ${categoryById.get(row.categoryId)?.color ?? ''}`}
                    >
                      <span>
                        {row.name}
                        {excluded && (
                          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                            excluded from averages
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono">{formatCents(row.subtotalCents)}</span>
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
                          className="rounded px-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                        >
                          {excluded ? '↩' : '⊘'}
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
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
