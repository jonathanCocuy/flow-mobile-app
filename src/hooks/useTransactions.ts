import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DashboardTransaction, DashboardAccount, UserCategory } from '@/types/finance'

export type TransactionsData = {
  transactions: DashboardTransaction[]
  accounts: DashboardAccount[]
  categories: UserCategory[]
}

const empty: TransactionsData = { transactions: [], accounts: [], categories: [] }

export function useTransactions() {
  const [data, setData] = useState<TransactionsData>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setData(empty); return }

      const [txRes, accountsRes, categoriesRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, description, amount, currency, exchange_rate, category, type, date, account_id, destination_account_id, icon')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(300),
        supabase
          .from('accounts')
          .select('id, name, balance, initial_balance, color')
          .eq('user_id', user.id),
        supabase
          .from('categories')
          .select('id, name, label, color, icon')
          .eq('user_id', user.id)
          .order('created_at'),
      ])

      const transactions: DashboardTransaction[] = (txRes.data ?? []).map(tx => ({
        id: tx.id,
        date: (tx.date ?? '').substring(0, 10),
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

      setData({
        transactions,
        accounts: accountsRes.data ?? [],
        categories: categoriesRes.data ?? [],
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
