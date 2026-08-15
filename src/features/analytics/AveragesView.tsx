import { useMemo } from 'react'
import { computeAverages, computeDailyRunRate } from '../../lib/averages'
import { formatCents } from '../../lib/money'
import {
  removeExclusion,
  useCategories,
  useExclusions,
  useMonthFlags,
  useTransactions,
} from '../../db/repository'
import { useToast } from '../../app/ToastProvider'
import { FALLBACK_CATEGORY_COLOR } from '../../lib/categoryColor'

export function AveragesView() {
  const categories = useCategories()
  const transactions = useTransactions()
  const exclusions = useExclusions()
  const monthFlags = useMonthFlags()
  const { showErrorToast } = useToast()

  async function handleRemoveExclusion(categoryId: number, month: string) {
    try {
      await removeExclusion(categoryId, month)
    } catch {
      showErrorToast('Could not remove exclusion')
    }
  }

  const now = useMemo(() => new Date(), [])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const averageRows = useMemo(
    () => computeAverages(transactions, exclusions, monthFlags, now),
    [transactions, exclusions, monthFlags, now],
  )

  const runRate = useMemo(
    () => computeDailyRunRate(transactions, categories, now),
    [transactions, categories, now],
  )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <div className="rounded border border-neutral-200 p-3 dark:border-neutral-700">
        <h2 className="mb-2 text-lg font-semibold">Daily run-rate</h2>
        <p>
          {formatCents(runRate.dailyRateCents)} €/day over {runRate.daysElapsed} day
          {runRate.daysElapsed === 1 ? '' : 's'} elapsed
        </p>
        <p className="text-neutral-500">
          Projected full month ({runRate.daysInMonth} days): {formatCents(runRate.projectedCents)} €
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Category averages</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="pb-1">Category</th>
              <th className="pb-1">Average / mo</th>
              <th className="pb-1">Months counted</th>
            </tr>
          </thead>
          <tbody>
            {averageRows.map((row) => {
              const category = categoryById.get(row.categoryId)
              return (
                <tr key={row.categoryId} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-1">
                    <span
                      className={`rounded-full px-2 py-0.5 ${category?.color ?? FALLBACK_CATEGORY_COLOR}`}
                    >
                      {category?.name ?? 'Unknown'}
                    </span>
                  </td>
                  <td className="py-1 font-mono">
                    {row.average === null ? '—' : `${formatCents(row.average)} €`}
                  </td>
                  <td className="py-1">{row.monthsCounted}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Active exclusions</h2>
        {exclusions.length === 0 && <p className="text-neutral-500">None.</p>}
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {exclusions.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between py-1 text-sm">
              <span>
                <span
                  className={`rounded-full px-2 py-0.5 ${categoryById.get(ex.categoryId)?.color ?? FALLBACK_CATEGORY_COLOR}`}
                >
                  {categoryById.get(ex.categoryId)?.name ?? 'Unknown'}
                </span>{' '}
                — {ex.month}
                {ex.reason && <span className="ml-2 text-neutral-400">({ex.reason})</span>}
              </span>
              <button
                type="button"
                onClick={() => void handleRemoveExclusion(ex.categoryId, ex.month)}
                className="text-xs text-neutral-500 underline"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
