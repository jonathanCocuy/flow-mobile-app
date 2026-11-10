import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DashboardData, DashboardTransaction, DashboardAccount, BudgetWithProgress, UserCategory } from '@/types/finance'

const DEFAULT_CATEGORIES: Omit<UserCategory, 'id'>[] = [
  { name: 'food',      label: 'Food',      color: '#f97316', icon: 'Utensils' },
  { name: 'home',      label: 'Home',      color: '#3b82f6', icon: 'Home' },
  { name: 'transport', label: 'Transport', color: '#8b5cf6', icon: 'Car' },
  { name: 'health',    label: 'Health',    color: '#ef4444', icon: 'Heart' },
  { name: 'leisure',   label: 'Leisure',   color: '#fbbf24', icon: 'Gamepad2' },
  { name: 'income',    label: 'Income',    color: '#22c55e', icon: 'TrendingUp' },
]

const empty: DashboardData = {
  accounts: [],
  totalBalance: 0,
  currentMonthIncome: 0,
  currentMonthExpenses: 0,
  recentTransactions: [],
  budgets: [],
  categories: [],
  hasTransactions: false,
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setData(empty); return }

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0]

      const [accountsRes, txRes, budgetsRes, categoriesRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('id, name, balance, initial_balance, color')
          .eq('user_id', user.id),
        supabase
          .from('transactions')
          .select('id, description, amount, currency, exchange_rate, category, type, date, account_id, destination_account_id, icon')
          .eq('user_id', user.id)
          .gte('date', startOfMonth)
          .order('date', { ascending: false })
          .limit(50),
        supabase
          .from('budgets')
          .select('id, category, monthly_limit, rollover_enabled')
          .eq('user_id', user.id),
        supabase
          .from('categories')
          .select('id, name, label, color, icon')
          .eq('user_id', user.id)
          .order('created_at'),
      ])

      const accounts: DashboardAccount[] = accountsRes.data ?? []
      const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0)

      const txData = txRes.data ?? []
      const currentMonthIncome = txData
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + t.amount * (t.exchange_rate ?? 1), 0)
      const currentMonthExpenses = txData
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + t.amount * (t.exchange_rate ?? 1), 0)

      const recentTransactions: DashboardTransaction[] = txData.slice(0, 10).map(tx => ({
        id: tx.id,
        date: tx.date ?? '',
        rawDate: tx.date ?? '',
        category: tx.category,
        description: tx.description,
        icon: tx.icon ?? '',
        amount: tx.amount,
        type: tx.type as 'income' | 'expense' | 'transfer',
        account_id: tx.account_id,
        destination_account_id: tx.destination_account_id ?? null,
        currency: tx.currency ?? 'USD',
        exchange_rate: tx.exchange_rate ?? 1,
      }))

      let categories: UserCategory[] = categoriesRes.data ?? []
      if (categories.length === 0) {
        await supabase.from('categories').upsert(
          DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id })),
          { onConflict: 'user_id,name' }
        )
        const { data: seeded } = await supabase
          .from('categories')
          .select('id, name, label, color, icon')
          .eq('user_id', user.id)
          .order('created_at')
        categories = seeded ?? []
      }

      const spentByCategory: Record<string, number> = {}
      txData
        .filter(t => t.type === 'expense')
        .forEach(t => {
          spentByCategory[t.category] = (spentByCategory[t.category] ?? 0) + t.amount * (t.exchange_rate ?? 1)
        })

      const budgets: BudgetWithProgress[] = (budgetsRes.data ?? [])
        .map(b => {
          const spent = spentByCategory[b.category] ?? 0
          const limit = b.monthly_limit
          const remaining = limit - spent
          const percentage = limit > 0 ? (spent / limit) * 100 : 0
          return {
            id: b.id,
            category: b.category,
            monthly_limit: b.monthly_limit,
            rollover_enabled: b.rollover_enabled ?? false,
            spent,
            remaining,
            percentage,
            isOverBudget: spent > limit,
          }
        })
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3)

      setData({
        accounts,
        totalBalance,
        currentMonthIncome,
        currentMonthExpenses,
        recentTransactions,
        budgets,
        categories,
        hasTransactions: txData.length > 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
