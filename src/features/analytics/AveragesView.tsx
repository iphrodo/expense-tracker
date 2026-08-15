import { useMemo, useState } from 'react'
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
import { getCategoryColorRoles } from '../../lib/categoryColor'

export function AveragesView() {
  const categories = useCategories()
  const transactions = useTransactions()
  const exclusions = useExclusions()
  const monthFlags = useMonthFlags()
  const { showErrorToast } = useToast()
  const [sortMode, setSortMode] = useState<'amount' | 'az'>('amount')

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

  const sortedAverageRows = useMemo(() => {
    const rows = [...averageRows]
    if (sortMode === 'az') {
      rows.sort((a, b) =>
        (categoryById.get(a.categoryId)?.name ?? '').localeCompare(categoryById.get(b.categoryId)?.name ?? ''),
      )
    } else {
      rows.sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
    }
    return rows
  }, [averageRows, sortMode, categoryById])

  const runRate = useMemo(
    () => computeDailyRunRate(transactions, categories, now),
    [transactions, categories, now],
  )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-s5 p-s4">
      <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
        <div className="t-micro text-text-3">DAILY RUN-RATE</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="t-display tabular-amount text-text">{formatCents(runRate.dailyRateCents)}</span>
          <span className="t-body text-text-2">€/day</span>
        </div>
        <p className="t-meta mt-s2 text-text-2">
          over {runRate.daysElapsed} day{runRate.daysElapsed === 1 ? '' : 's'} elapsed
        </p>
        <div className="mt-s4 flex items-baseline justify-between border-t border-border pt-s4">
          <span className="t-meta text-text-2">Projected full month ({runRate.daysInMonth} days)</span>
          <span className="t-num-lg text-text">{formatCents(runRate.projectedCents)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
        <div className="mb-s3 flex items-center justify-between">
          <h2 className="t-h2 text-text">Category averages</h2>
          <button
            type="button"
            onClick={() => setSortMode((m) => (m === 'az' ? 'amount' : 'az'))}
            className={`t-micro h-6 rounded-full px-s2 ${
              sortMode === 'az' ? 'bg-accent-weak text-accent-text' : 'bg-surface-2 text-text-2'
            }`}
          >
            A–Z
          </button>
        </div>
        <div className="sticky top-0 flex border-b border-border bg-surface pb-s2">
          <span className="t-micro flex-1 text-text-3">CATEGORY</span>
          <span className="t-micro text-text-3">AVERAGE / MO</span>
        </div>
        {sortedAverageRows.map((row) => {
          const category = categoryById.get(row.categoryId)
          const roles = getCategoryColorRoles(category)
          return (
            <div
              key={row.categoryId}
              className="flex h-11 items-center gap-s2 border-b border-border last:border-b-0"
            >
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: roles.dot }} />
              <div className="min-w-0 flex-1">
                <div className="t-body truncate text-text">{category?.name ?? 'Unknown'}</div>
                <div className="t-micro text-text-3 sm:hidden">{row.monthsCounted} months</div>
              </div>
              <span className="t-micro hidden text-text-3 sm:inline">{row.monthsCounted} months</span>
              <span className="t-num tabular-amount w-20 shrink-0 text-right text-text">
                {row.average === null ? '—' : `${formatCents(row.average)} €`}
              </span>
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
        <h2 className="t-h2 mb-s3 text-text">Active exclusions</h2>
        {exclusions.length === 0 && <p className="t-body text-text-2">None.</p>}
        {exclusions.map((ex) => {
          const roles = getCategoryColorRoles(categoryById.get(ex.categoryId))
          return (
            <div key={ex.id} className="flex h-11 items-center gap-s2 border-b border-border last:border-b-0">
              <span
                className="t-meta rounded-full px-s2 py-0.5 font-medium"
                style={{ backgroundColor: roles.tint, color: roles.text }}
              >
                {categoryById.get(ex.categoryId)?.name ?? 'Unknown'}
              </span>
              <span className="t-meta text-text-2">{ex.month}</span>
              {ex.reason && <span className="t-meta text-text-3">({ex.reason})</span>}
              <button
                type="button"
                onClick={() => void handleRemoveExclusion(ex.categoryId, ex.month)}
                className="t-meta ml-auto text-text-2 underline decoration-1 underline-offset-[3px] hover:text-text"
              >
                Remove
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
