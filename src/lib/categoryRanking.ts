import type { Category, Transaction } from '../db/schema'

const HALF_LIFE_DAYS = 21

export function rankCategoriesByRecency(
  categories: Category[],
  transactions: Transaction[],
  now: Date,
): Category[] {
  const scores = new Map<number, number>()
  const decay = Math.log(2) / HALF_LIFE_DAYS
  for (const tx of transactions) {
    const daysAgo = Math.max(0, (now.getTime() - new Date(tx.date).getTime()) / 86_400_000)
    const weight = Math.exp(-decay * daysAgo)
    scores.set(tx.categoryId, (scores.get(tx.categoryId) ?? 0) + weight)
  }
  return [...categories].sort((a, b) => {
    const scoreA = a.id !== undefined ? (scores.get(a.id) ?? 0) : 0
    const scoreB = b.id !== undefined ? (scores.get(b.id) ?? 0) : 0
    return scoreB - scoreA
  })
}
