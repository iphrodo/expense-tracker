import { useMemo, useState } from 'react'
import type { Transaction } from '../../db/schema'
import { getOrCreateCategory, useCategories, useTransactions } from '../../db/repository'
import { getCategoryColorRoles } from '../../lib/categoryColor'
import { groupCategoryHistoryByMonth } from '../../lib/categoryHistory'
import { formatCents } from '../../lib/money'
import { CategoryAllPicker } from '../entry/CategorySelector'
import { EditTransactionPanel } from '../entry/EditTransactionPanel'

const MONTH_NAMES = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень']

export function CategoryHistoryView() {
  const categories = useCategories()
  const transactions = useTransactions()
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const selectableCategories = useMemo(() => {
    const idsWithTransactions = new Set(transactions.map((tx) => tx.categoryId))
    return categories
      .filter((category) => !category.isArchived || (category.id !== undefined && idsWithTransactions.has(category.id)))
      .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'))
  }, [categories, transactions])
  const selectedCategory = selectableCategories.find((category) => category.id === categoryId)
  const selectedCategoryId = selectedCategory?.id ?? null
  const months = selectedCategoryId === null ? [] : groupCategoryHistoryByMonth(transactions, selectedCategoryId)
  const visibleExpandedMonth = expandedMonth !== null && months.find((month) => month.month === expandedMonth)?.transactions.length ? expandedMonth : null
  const categoryTotalCents = months.reduce((total, month) => total + month.totalCents, 0)

  const roles = getCategoryColorRoles(selectedCategory)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-s5 p-s4">
      <div>
        <h1 className="t-h1 text-text">Історія категорії</h1>
        <p className="t-body mt-s1 text-text-2">Оберіть категорію, щоб переглянути витрати за місяцями.</p>
      </div>
      {selectableCategories.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-s5 text-center text-text-2">Немає категорій з історією витрат.</div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-s3 rounded-lg border border-border bg-surface p-s4 shadow-1">
            <div className="t-meta flex min-w-52 flex-1 flex-col gap-s1 text-text-2">
              <span>Категорія</span>
              <CategoryAllPicker
                rankedCategories={selectableCategories}
                selectedCategoryId={selectedCategoryId}
                onSelect={(id) => { setCategoryId(id); setExpandedMonth(null); setEditingTx(null) }}
                onCreateCategory={() => Promise.reject(new Error('Category creation is unavailable here'))}
                onSubmit={() => undefined}
                panelAlign="left"
                allowCreate={false}
                label={<span className="flex items-center gap-s2"><span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: selectedCategory ? roles.dot : 'currentColor' }} />{selectedCategory ? `${selectedCategory.name}${selectedCategory.isArchived ? ' (архів)' : ''}` : 'Оберіть категорію'}</span>}
                className="w-fit"
              />
            </div>
          </div>
          {selectedCategoryId === null ? <div className="rounded-lg border border-dashed border-border-strong p-s5 text-center text-text-2">Оберіть категорію для перегляду її історії.</div> : (
            <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-1">
              <div className="flex items-baseline justify-between border-b border-border px-s4 py-s3">
                <span className="t-meta text-text-3">ВСЬОГО В КАТЕГОРІЇ</span>
                <span className="t-num-lg text-text">{formatCents(categoryTotalCents)}</span>
              </div>
              {months.map((month) => {
                const active = month.transactions.length > 0
                const expanded = visibleExpandedMonth === month.month
                const monthName = MONTH_NAMES[month.monthIndex] ?? month.month
                return <div key={month.month} className="border-b border-border last:border-b-0">
                  <button type="button" disabled={!active} aria-expanded={active ? expanded : undefined} onClick={() => setExpandedMonth(expanded ? null : month.month)} className={`flex min-h-14 w-full items-center gap-s3 px-s4 text-left ${active ? 'hover:bg-surface-2' : 'cursor-default opacity-65'}`}>
                    <span className="t-body flex w-36 shrink-0 items-baseline gap-s2 whitespace-nowrap text-text">
                      <span>{monthName}</span>
                      <span className="text-text-3">{month.year}</span>
                    </span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full" style={{ width: `${month.barMagnitude * 100}%`, backgroundColor: roles.dot }} /></span>
                    <span className="t-num w-20 shrink-0 text-right text-text">{formatCents(month.totalCents)}</span>
                    {active && <span aria-hidden className={`text-text-3 transition-transform ${expanded ? 'rotate-180' : ''}`}>⌄</span>}
                  </button>
                  {expanded && <div className="border-t border-border bg-surface-2/50 px-s4 py-s2">
                    {month.transactions.map((tx) => <button key={tx.id} type="button" onClick={() => setEditingTx(tx)} className="flex min-h-11 w-full items-center gap-s3 border-b border-border py-s2 text-left last:border-b-0 hover:bg-surface-2">
                      <span className="t-meta w-20 shrink-0 text-text-2">{new Date(`${tx.date}T00:00:00`).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}</span>
                      <span className="t-body min-w-0 flex-1 truncate text-text">{tx.note || 'Без нотатки'}</span>
                      <span className="t-num shrink-0 text-text">{formatCents(tx.amountCents)}</span>
                    </button>)}
                  </div>}
                </div>
              })}
            </div>
          )}
        </>
      )}
      {editingTx && <EditTransactionPanel transaction={editingTx} rankedCategories={selectableCategories} onCreateCategory={(name) => getOrCreateCategory(name, false)} onClose={() => setEditingTx(null)} />}
    </div>
  )
}
