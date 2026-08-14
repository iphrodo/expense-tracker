import { useEffect, useMemo, useState } from 'react'
import type { Transaction } from '../../db/schema'
import { computeMonthSummary, computeNamedCategoryDailyAverages, monthOf } from '../../lib/averages'
import { rankCategoriesByRecency } from '../../lib/categoryRanking'
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

  const [month, setMonth] = useState(currentMonthIso())
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const rankedCategories = useMemo(
    () => rankCategoriesByRecency(categories, transactions, new Date()),
    [categories, transactions],
  )

  const monthTransactions = useMemo(
    () => transactions.filter((tx) => monthOf(tx.date) === month),
    [transactions, month],
  )

  const grouped = useMemo(() => {
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

  const monthTotal = monthTransactions.reduce((sum, tx) => sum + tx.amountCents, 0)

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
      setMonth(monthsWithData[monthsWithData.length - 1])
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

  async function toggleExclusion(categoryId: number) {
    const key = `${categoryId}|${month}`
    if (exclusionKeys.has(key)) {
      await removeExclusion(categoryId, month)
    } else {
      const reason = window.prompt('Reason for excluding this category-month (optional)') ?? ''
      await setExclusion(categoryId, month, reason)
    }
  }

  async function toggleMonthComplete() {
    if (monthFlag) {
      if (monthFlag.isComplete) {
        await setMonthFlag(month, false)
      } else {
        await clearMonthFlag(month)
      }
    } else {
      await setMonthFlag(month, true)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-4">
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

        {grouped.length === 0 && <p className="text-neutral-500">No transactions this month.</p>}

        {grouped.map(([categoryId, txs]) => {
          const subtotal = txs.reduce((sum, tx) => sum + tx.amountCents, 0)
          const excluded = exclusionKeys.has(`${categoryId}|${month}`)
          return (
            <div key={categoryId} className="rounded border border-neutral-200 p-3 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {categoryById.get(categoryId)?.name ?? 'Unknown'}
                  {excluded && (
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      excluded from averages
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{formatCents(subtotal)}</span>
                  <button
                    type="button"
                    onClick={() => void toggleExclusion(categoryId)}
                    className="text-xs text-neutral-500 underline"
                  >
                    {excluded ? 'include' : 'exclude'}
                  </button>
                </div>
              </div>
              <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
                {txs.map((tx) => (
                  <li key={tx.id}>
                    <button
                      type="button"
                      onClick={() => setEditingTx(tx)}
                      className="flex w-full items-center justify-between py-1 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <span>
                        {tx.date}
                        {tx.note && <span className="ml-2 text-neutral-400">{tx.note}</span>}
                      </span>
                      <span className="font-mono">{formatCents(tx.amountCents)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
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
      </div>

      {editingTx && (
        <EditTransactionPanel
          transaction={editingTx}
          rankedCategories={rankedCategories}
          onCreateCategory={(name) => getOrCreateCategory(name, false)}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  )
}
