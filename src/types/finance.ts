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

export type InvestmentRecord = {
  id: string
  name: string
  type: 'etf' | 'stock' | 'crypto' | 'fund' | 'other'
  amount: number
  currency: 'COP' | 'USD'
  date: string
  notes: string | null
}

export type RecurringTemplate = {
  id: string
  description: string
  icon: string
  amount: number
  currency: string
  category: string
  type: 'income' | 'expense'
  interval: 'monthly' | 'weekly'
  day_of_month: number | null
  day_of_week: number | null
  is_active: boolean
  account_id: string
}

export type SharedMember = {
  id: string
  group_id: string
  name: string
  share_pct: number
  is_me: boolean
  color: string
  member_user_id: string | null
  invited_email: string | null
}

export type SharedExpense = {
  id: string
  group_id: string
  description: string
  amount: number
  category: string
  date: string
  paid_by_member_id: string | null
  account_id: string | null
  transaction_id: string | null
  is_recurring: boolean
  notes: string | null
}

export type SharedGroup = {
  id: string
  user_id: string
  name: string
  created_at: string
  shared_members?: SharedMember[]
  shared_expenses?: Pick<SharedExpense, 'amount' | 'paid_by_member_id'>[]
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
  hasGoals: boolean
  hasBudgets: boolean
}
