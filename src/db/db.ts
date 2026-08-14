import Dexie, { type EntityTable } from 'dexie'
import type { AverageExclusion, Category, MonthFlag, Transaction } from './schema'

export class ExpenseDb extends Dexie {
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  monthFlags!: EntityTable<MonthFlag, 'id'>
  averageExclusions!: EntityTable<AverageExclusion, 'id'>

  constructor() {
    super('expense-tracker')
    this.version(1).stores({
      categories: '++id, &name',
      transactions: '++id, categoryId, date, importRowIndex',
      monthFlags: '++id, &month',
      averageExclusions: '++id, &[categoryId+month]',
    })
  }
}

export const db = new ExpenseDb()
