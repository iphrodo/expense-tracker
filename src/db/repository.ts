import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'
import { colorForIndex, unusedColorFor } from '../lib/categoryColor'
import type { AverageExclusion, Category, MonthFlag, Transaction } from './schema'

export type { AverageExclusion, Category, MonthFlag, Transaction } from './schema'

export interface NewTransactionInput {
  amountCents: number
  categoryId: number
  date: string
  note: string
  importRowIndex?: number
}

// --- row <-> domain type mapping (Postgres uses snake_case columns) ---

interface CategoryRow {
  id: number
  name: string
  is_daily: boolean
  is_archived: boolean
  sort_order: number
  color: string
}

interface TransactionRow {
  id: number
  date: string
  category_id: number
  amount_cents: number
  note: string
  import_row_index: number | null
}

interface MonthFlagRow {
  id: number
  month: string
  is_complete: boolean
}

interface AverageExclusionRow {
  id: number
  category_id: number
  month: string
  reason: string
}

function categoryFromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    isDaily: row.is_daily,
    isArchived: row.is_archived,
    sortOrder: row.sort_order,
    color: row.color,
  }
}

function transactionFromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    categoryId: row.category_id,
    amountCents: row.amount_cents,
    note: row.note,
    importRowIndex: row.import_row_index ?? undefined,
  }
}

// `month` columns are Postgres `date` (requires YYYY-MM-DD); the app works with bare YYYY-MM strings.
function toMonthDate(month: string): string {
  return month.length === 7 ? `${month}-01` : month
}

function fromMonthDate(monthDate: string): string {
  return monthDate.slice(0, 7)
}

function monthFlagFromRow(row: MonthFlagRow): MonthFlag {
  return { id: row.id, month: fromMonthDate(row.month), isComplete: row.is_complete }
}

function averageExclusionFromRow(row: AverageExclusionRow): AverageExclusion {
  return {
    id: row.id,
    categoryId: row.category_id,
    month: fromMonthDate(row.month),
    reason: row.reason,
  }
}

// --- small in-memory cache per table, invalidated after each successful write ---

class TableStore<T> {
  private data: T[] = []
  private listeners = new Set<() => void>()
  private loaded = false
  private readonly load: () => Promise<T[]>

  constructor(load: () => Promise<T[]>) {
    this.load = load
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }

  async refresh(): Promise<void> {
    this.data = await this.load()
    this.loaded = true
    this.notify()
  }

  getSnapshot = (): T[] => this.data

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    if (!this.loaded) {
      void this.refresh()
    }
    return () => {
      this.listeners.delete(listener)
    }
  }
}

// PostgREST caps an unpaginated select() at 1000 rows by default; page through
// with .range() so tables that grow past that (transactions, in practice) don't
// get silently truncated.
const PAGE_SIZE = 1000

async function fetchAllRows<T>(table: string, orderColumn?: string): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  for (;;) {
    let query = supabase.from(table).select('*').range(from, from + PAGE_SIZE - 1)
    if (orderColumn) query = query.order(orderColumn)
    const { data, error } = await query
    if (error) throw error
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

async function loadCategories(): Promise<Category[]> {
  const rows = await fetchAllRows<CategoryRow>('categories', 'sort_order')
  return rows.map(categoryFromRow)
}

async function loadTransactions(): Promise<Transaction[]> {
  const rows = await fetchAllRows<TransactionRow>('transactions', 'date')
  return rows.map(transactionFromRow)
}

async function loadMonthFlags(): Promise<MonthFlag[]> {
  const rows = await fetchAllRows<MonthFlagRow>('month_flags')
  return rows.map(monthFlagFromRow)
}

async function loadAverageExclusions(): Promise<AverageExclusion[]> {
  const rows = await fetchAllRows<AverageExclusionRow>('average_exclusions')
  return rows.map(averageExclusionFromRow)
}

const categoriesStore = new TableStore(loadCategories)
const transactionsStore = new TableStore(loadTransactions)
const monthFlagsStore = new TableStore(loadMonthFlags)
const averageExclusionsStore = new TableStore(loadAverageExclusions)

export function useCategories(): Category[] {
  return useSyncExternalStore(categoriesStore.subscribe, categoriesStore.getSnapshot)
}

export function useTransactions(): Transaction[] {
  return useSyncExternalStore(transactionsStore.subscribe, transactionsStore.getSnapshot)
}

export function useMonthFlags(): MonthFlag[] {
  return useSyncExternalStore(monthFlagsStore.subscribe, monthFlagsStore.getSnapshot)
}

export function useExclusions(): AverageExclusion[] {
  return useSyncExternalStore(averageExclusionsStore.subscribe, averageExclusionsStore.getSnapshot)
}

// --- mutations ---

export async function createTransactions(entries: NewTransactionInput[]): Promise<number[]> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(
      entries.map((entry) => ({
        amount_cents: entry.amountCents,
        category_id: entry.categoryId,
        date: entry.date,
        note: entry.note,
        import_row_index: entry.importRowIndex ?? null,
      })),
    )
    .select('id')
  if (error) throw error
  await transactionsStore.refresh()
  return (data as { id: number }[]).map((row) => row.id)
}

export async function updateTransaction(
  id: number,
  patch: Partial<Omit<Transaction, 'id' | 'importRowIndex'>>,
): Promise<void> {
  const update: Partial<TransactionRow> = {}
  if (patch.amountCents !== undefined) update.amount_cents = patch.amountCents
  if (patch.categoryId !== undefined) update.category_id = patch.categoryId
  if (patch.date !== undefined) update.date = patch.date
  if (patch.note !== undefined) update.note = patch.note

  const { error } = await supabase.from('transactions').update(update).eq('id', id)
  if (error) throw error
  await transactionsStore.refresh()
}

export async function getTransaction(id: number): Promise<Transaction | undefined> {
  const { data, error } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? transactionFromRow(data as TransactionRow) : undefined
}

export async function deleteTransaction(id: number): Promise<Transaction | undefined> {
  const existing = await getTransaction(id)
  if (existing) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    await transactionsStore.refresh()
  }
  return existing
}

/** Restores a previously-deleted transaction (for Undo). The row gets a newly assigned id. */
export async function restoreTransaction(tx: Transaction): Promise<void> {
  const { error } = await supabase.from('transactions').insert({
    amount_cents: tx.amountCents,
    category_id: tx.categoryId,
    date: tx.date,
    note: tx.note,
    import_row_index: tx.importRowIndex ?? null,
  })
  if (error) throw error
  await transactionsStore.refresh()
}

export async function deleteTransactions(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('transactions').delete().in('id', ids)
  if (error) throw error
  await transactionsStore.refresh()
}

export async function getOrCreateCategory(name: string, isDaily: boolean): Promise<number> {
  const { data: existing, error: selectError } = await supabase
    .from('categories')
    .select('id')
    .eq('name', name)
    .eq('is_archived', false)
    .maybeSingle()
  if (selectError) throw selectError
  if (existing) {
    return (existing as { id: number }).id
  }

  // Round-robin by current category count (including archived, so the sequence is monotonic
  // and each new color slot is never reused out of order within a session).
  const { count, error: countError } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
  if (countError) throw countError

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, is_daily: isDaily, color: colorForIndex(count ?? 0) })
    .select('id')
    .single()
  if (error) throw error
  await categoriesStore.refresh()
  return (data as { id: number }).id
}

/** Explicitly creates a category (distinct from `getOrCreateCategory`'s implicit lookup-or-create). */
export async function createCategory(name: string, isDaily: boolean): Promise<number> {
  const { data: active, error: selectError } = await supabase
    .from('categories')
    .select('id, name, color')
    .eq('is_archived', false)
  if (selectError) throw selectError
  const activeRows = (active ?? []) as { id: number; name: string; color: string }[]
  if (activeRows.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A category with this name already exists')
  }

  // Round-robin count (including archived), used only as the color helper's fallback once every
  // palette color is already in use by an active category.
  const { count, error: countError } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
  if (countError) throw countError

  const color = unusedColorFor(
    activeRows.map((c) => c.color),
    count ?? 0,
  )

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, is_daily: isDaily, color })
    .select('id')
    .single()
  if (error) throw error
  await categoriesStore.refresh()
  return (data as { id: number }).id
}

/** Renames and/or retypes a category in place; its id and color are unchanged. */
export async function updateCategory(
  id: number,
  patch: { name?: string; isDaily?: boolean },
): Promise<void> {
  if (patch.name !== undefined) {
    const newName = patch.name
    const { data: active, error: selectError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_archived', false)
    if (selectError) throw selectError
    const activeRows = (active ?? []) as { id: number; name: string }[]
    if (activeRows.some((c) => c.id !== id && c.name.toLowerCase() === newName.toLowerCase())) {
      throw new Error('A category with this name already exists')
    }
  }

  const update: Partial<CategoryRow> = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.isDaily !== undefined) update.is_daily = patch.isDaily

  const { error } = await supabase.from('categories').update(update).eq('id', id)
  if (error) throw error
  await categoriesStore.refresh()
}

/** Soft-deletes a category: it's archived, keeping its history intact, but never offered again for selection. */
export async function archiveCategory(id: number): Promise<void> {
  const { error } = await supabase.from('categories').update({ is_archived: true }).eq('id', id)
  if (error) throw error
  await categoriesStore.refresh()
}

export async function setMonthFlag(month: string, isComplete: boolean): Promise<void> {
  const monthDate = toMonthDate(month)
  const { data: existing, error: selectError } = await supabase
    .from('month_flags')
    .select('id')
    .eq('month', monthDate)
    .maybeSingle()
  if (selectError) throw selectError

  if (existing) {
    const { error } = await supabase
      .from('month_flags')
      .update({ is_complete: isComplete })
      .eq('id', (existing as { id: number }).id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('month_flags')
      .insert({ month: monthDate, is_complete: isComplete })
    if (error) throw error
  }
  await monthFlagsStore.refresh()
}

export async function clearMonthFlag(month: string): Promise<void> {
  const { error } = await supabase.from('month_flags').delete().eq('month', toMonthDate(month))
  if (error) throw error
  await monthFlagsStore.refresh()
}

export async function setExclusion(
  categoryId: number,
  month: string,
  reason: string,
): Promise<void> {
  const monthDate = toMonthDate(month)
  const { data: existing, error: selectError } = await supabase
    .from('average_exclusions')
    .select('id')
    .eq('category_id', categoryId)
    .eq('month', monthDate)
    .maybeSingle()
  if (selectError) throw selectError

  if (existing) {
    const { error } = await supabase
      .from('average_exclusions')
      .update({ reason })
      .eq('id', (existing as { id: number }).id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('average_exclusions')
      .insert({ category_id: categoryId, month: monthDate, reason })
    if (error) throw error
  }
  await averageExclusionsStore.refresh()
}

export async function removeExclusion(categoryId: number, month: string): Promise<void> {
  const { error } = await supabase
    .from('average_exclusions')
    .delete()
    .eq('category_id', categoryId)
    .eq('month', toMonthDate(month))
  if (error) throw error
  await averageExclusionsStore.refresh()
}

export async function getExistingImportedTransactions(): Promise<Map<number, Transaction>> {
  const rawRows: TransactionRow[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .not('import_row_index', 'is', null)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = (data ?? []) as TransactionRow[]
    rawRows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  const rows = rawRows.map(transactionFromRow)
  return new Map(
    rows
      .filter((r): r is Transaction & { importRowIndex: number } => r.importRowIndex !== undefined)
      .map((r) => [r.importRowIndex, r]),
  )
}

export async function bulkCreateTransactions(entries: NewTransactionInput[]): Promise<void> {
  if (entries.length === 0) return
  const { error } = await supabase.from('transactions').insert(
    entries.map((entry) => ({
      amount_cents: entry.amountCents,
      category_id: entry.categoryId,
      date: entry.date,
      note: entry.note,
      import_row_index: entry.importRowIndex ?? null,
    })),
  )
  if (error) throw error
  await transactionsStore.refresh()
}

export async function getMaxImportRowIndex(): Promise<number> {
  const { data, error } = await supabase
    .from('transactions')
    .select('import_row_index')
    .not('import_row_index', 'is', null)
    .order('import_row_index', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as { import_row_index: number } | null)?.import_row_index ?? -1
}

export interface FullData {
  categories: Category[]
  transactions: Transaction[]
  monthFlags: MonthFlag[]
  averageExclusions: AverageExclusion[]
}

export async function getAllData(): Promise<FullData> {
  const [categories, transactions, monthFlags, averageExclusions] = await Promise.all([
    loadCategories(),
    loadTransactions(),
    loadMonthFlags(),
    loadAverageExclusions(),
  ])
  return { categories, transactions, monthFlags, averageExclusions }
}

export interface ReplaceAllReport {
  categories: number
  transactions: number
  monthFlags: number
  averageExclusions: number
}

/**
 * Replaces the entire contents of all four tables with the given backup data.
 * Category/transaction ids are Postgres-assigned on insert (identity columns), so
 * transaction/exclusion `categoryId` references are remapped from the backup's
 * original category ids to the newly assigned ones.
 */
export async function replaceAllData(data: {
  categories: Category[]
  transactions: Transaction[]
  monthFlags: Omit<MonthFlag, 'id'>[]
  averageExclusions: Omit<AverageExclusion, 'id'>[]
}): Promise<ReplaceAllReport> {
  const del = async (table: string) => {
    const { error } = await supabase.from(table).delete().gte('id', 0)
    if (error) throw error
  }
  // Children before parents, per the FK "on delete restrict" constraints.
  await del('average_exclusions')
  await del('transactions')
  await del('month_flags')
  await del('categories')

  const categoryIdMap = new Map<number, number>()
  for (const [index, category] of data.categories.entries()) {
    const { data: inserted, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        is_daily: category.isDaily,
        is_archived: category.isArchived ?? false,
        sort_order: category.sortOrder ?? 0,
        // Falls back to a round-robin assignment for backups predating stored colors.
        color: category.color ?? colorForIndex(index),
      })
      .select('id')
      .single()
    if (error) throw error
    categoryIdMap.set(category.id, (inserted as { id: number }).id)
  }

  if (data.transactions.length > 0) {
    const { error } = await supabase.from('transactions').insert(
      data.transactions.map((tx) => ({
        amount_cents: tx.amountCents,
        category_id: categoryIdMap.get(tx.categoryId) ?? tx.categoryId,
        date: tx.date,
        note: tx.note,
        import_row_index: tx.importRowIndex ?? null,
      })),
    )
    if (error) throw error
  }

  if (data.monthFlags.length > 0) {
    const { error } = await supabase.from('month_flags').insert(
      data.monthFlags.map((flag) => ({ month: flag.month, is_complete: flag.isComplete })),
    )
    if (error) throw error
  }

  if (data.averageExclusions.length > 0) {
    const { error } = await supabase.from('average_exclusions').insert(
      data.averageExclusions.map((exclusion) => ({
        category_id: categoryIdMap.get(exclusion.categoryId) ?? exclusion.categoryId,
        month: exclusion.month,
        reason: exclusion.reason,
      })),
    )
    if (error) throw error
  }

  await Promise.all([
    categoriesStore.refresh(),
    transactionsStore.refresh(),
    monthFlagsStore.refresh(),
    averageExclusionsStore.refresh(),
  ])

  return {
    categories: data.categories.length,
    transactions: data.transactions.length,
    monthFlags: data.monthFlags.length,
    averageExclusions: data.averageExclusions.length,
  }
}
