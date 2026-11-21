import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SUPPORTED_CURRENCIES, type SupportedCurrency, formatCurrency } from '@/constants/currencies';

type CurrencyContextType = {
  currency: SupportedCurrency;
  setCurrency: (code: SupportedCurrency) => Promise<void>;
  formatAmount: (amount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'COP',
  setCurrency: async () => {},
  formatAmount: (n) => String(n),
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>('COP');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('base_currency').eq('id', user.id).maybeSingle().then(({ data }) => {
        const c = data?.base_currency as SupportedCurrency | undefined;
        if (c && (SUPPORTED_CURRENCIES as readonly string[]).includes(c)) {
          setCurrencyState(c);
        }
      });
    });
  }, []);

  const setCurrency = useCallback(async (code: SupportedCurrency) => {
    setCurrencyState(code);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ base_currency: code }).eq('id', user.id);
  }, []);

  const formatAmount = useCallback((amount: number) => formatCurrency(amount, currency), [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
