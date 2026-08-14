import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { AverageExclusion, Category, MonthFlag, Transaction } from './schema'

export type { AverageExclusion, Category, MonthFlag, Transaction } from './schema'

export interface NewTransactionInput {
  amountCents: number
  categoryId: number
  date: string
  note: string
  importRowIndex?: number
}

export async function createTransactions(entries: NewTransactionInput[]): Promise<number[]> {
  return db.transaction('rw', db.transactions, async () => {
    const ids: number[] = []
    for (const entry of entries) {
      ids.push(await db.transactions.add(entry))
    }
    return ids
  })
}

export async function updateTransaction(
  id: number,
  patch: Partial<Omit<Transaction, 'id' | 'importRowIndex'>>,
): Promise<void> {
  await db.transactions.update(id, patch)
}

export async function getTransaction(id: number): Promise<Transaction | undefined> {
  return db.transactions.get(id)
}

export async function deleteTransaction(id: number): Promise<Transaction | undefined> {
  const existing = await db.transactions.get(id)
  if (existing) {
    await db.transactions.delete(id)
  }
  return existing
}

/** Restores a previously-deleted transaction, preserving its original id and fields (for Undo). */
export async function restoreTransaction(tx: Transaction): Promise<void> {
  await db.transactions.put(tx)
}

export async function deleteTransactions(ids: number[]): Promise<void> {
  await db.transactions.bulkDelete(ids)
}

export async function getOrCreateCategory(name: string, isDaily: boolean): Promise<number> {
  const existing = await db.categories.where('name').equals(name).first()
  if (existing?.id !== undefined) {
    return existing.id
  }
  return db.categories.add({ name, isDaily })
}

export async function setMonthFlag(month: string, isComplete: boolean): Promise<void> {
  const existing = await db.monthFlags.where('month').equals(month).first()
  if (existing?.id !== undefined) {
    await db.monthFlags.update(existing.id, { isComplete })
  } else {
    await db.monthFlags.add({ month, isComplete })
  }
}

export async function clearMonthFlag(month: string): Promise<void> {
  await db.monthFlags.where('month').equals(month).delete()
}

export async function setExclusion(
  categoryId: number,
  month: string,
  reason: string,
): Promise<void> {
  const existing = await db.averageExclusions.where({ categoryId, month }).first()
  if (existing?.id !== undefined) {
    await db.averageExclusions.update(existing.id, { reason })
  } else {
    await db.averageExclusions.add({ categoryId, month, reason })
  }
}

export async function removeExclusion(categoryId: number, month: string): Promise<void> {
  await db.averageExclusions.where({ categoryId, month }).delete()
}

export async function getExistingImportedTransactions(): Promise<Map<number, Transaction>> {
  const rows = await db.transactions.where('importRowIndex').aboveOrEqual(0).toArray()
  return new Map(
    rows
      .filter((r): r is Transaction & { importRowIndex: number } => r.importRowIndex !== undefined)
      .map((r) => [r.importRowIndex, r]),
  )
}

export async function bulkCreateTransactions(entries: NewTransactionInput[]): Promise<void> {
  await db.transactions.bulkAdd(entries)
}

export async function getMaxImportRowIndex(): Promise<number> {
  const rows = await db.transactions.where('importRowIndex').aboveOrEqual(0).toArray()
  return rows.reduce((max, r) => Math.max(max, r.importRowIndex ?? -1), -1)
}

export function useCategories(): Category[] {
  return useLiveQuery(() => db.categories.toArray(), [], []) ?? []
}

export function useTransactions(): Transaction[] {
  return useLiveQuery(() => db.transactions.toArray(), [], []) ?? []
}

export function useMonthFlags(): MonthFlag[] {
  return useLiveQuery(() => db.monthFlags.toArray(), [], []) ?? []
}

export function useExclusions(): AverageExclusion[] {
  return useLiveQuery(() => db.averageExclusions.toArray(), [], []) ?? []
}
