export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'GBP', 'EUR', 'MXN', 'BRL'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

type CurrencyInfo = {
  symbol: string;
  locale: string;
  countryCode: string;
  decimals: number;
};

export const CURRENCY_INFO: Record<SupportedCurrency, CurrencyInfo> = {
  COP: { symbol: '$',  locale: 'es-CO', countryCode: 'co', decimals: 0 },
  USD: { symbol: '$',  locale: 'en-US', countryCode: 'us', decimals: 2 },
  GBP: { symbol: '£',  locale: 'en-GB', countryCode: 'gb', decimals: 2 },
  EUR: { symbol: '€',  locale: 'de-DE', countryCode: 'eu', decimals: 2 },
  MXN: { symbol: '$',  locale: 'es-MX', countryCode: 'mx', decimals: 0 },
  BRL: { symbol: 'R$', locale: 'pt-BR', countryCode: 'br', decimals: 2 },
};

export function countryToFlagEmoji(countryCode: string): string {
  return countryCode.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

export function formatCurrency(amount: number, currency: string): string {
  const info = CURRENCY_INFO[currency as SupportedCurrency];
  const locale = info?.locale ?? 'en-US';
  const decimals = info?.decimals ?? 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(amount);
}
