export interface Category {
  id: number
  name: string
  isDaily: boolean
}

export interface Transaction {
  id: number
  amountCents: number
  categoryId: number
  date: string
  note: string
  importRowIndex?: number
}

export interface MonthFlag {
  id: number
  month: string
  isComplete: boolean
}

export interface AverageExclusion {
  id: number
  categoryId: number
  month: string
  reason: string
}
