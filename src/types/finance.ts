export type DashboardTransaction = {
  id: string
  date: string
  rawDate: string
  category: string
  description: string
  icon: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  account_id: string
  destination_account_id: string | null
  currency: string
  exchange_rate: number
}

export type DashboardAccount = {
  id: string
  name: string
  balance: number
  initial_balance: number
  color: string
}

export type UserCategory = {
  id: string
  name: string
  label: string
  color: string
  icon: string
}

export type BudgetWithProgress = {
  id: string
  category: string
  monthly_limit: number
  rollover_enabled: boolean
  spent: number
  remaining: number
  percentage: number
  isOverBudget: boolean
}

export type DashboardData = {
  accounts: DashboardAccount[]
  totalBalance: number
  currentMonthIncome: number
  currentMonthExpenses: number
  recentTransactions: DashboardTransaction[]
  budgets: BudgetWithProgress[]
  categories: UserCategory[]
  hasTransactions: boolean
}
