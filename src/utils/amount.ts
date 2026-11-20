/**
 * Amount inputs across the app share one convention: comma groups thousands,
 * dot separates decimals (1,234.56).  Formatting and parsing must stay in sync
 * — parsing a comma as a decimal separator would turn "1,500" into 1.5.
 */

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/** Formats what the user is typing, keeping at most two decimals. */
export function formatAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return '';

  const [intPart = '', ...rest] = cleaned.split('.');
  const grouped = intPart.replace(THOUSANDS, ',');

  // No dot typed yet — nothing to append.
  if (!cleaned.includes('.')) return grouped;

  // Keep the trailing dot while the user is mid-entry ("12." stays "12.").
  return `${grouped}.${rest.join('').slice(0, 2)}`;
}

/** Turns a formatted field back into a number.  NaN when empty or invalid. */
export function parseAmountInput(value: string): number {
  return parseFloat(value.replace(/,/g, ''));
}

/** Formats a stored value for display inside an input when editing. */
export function toAmountInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return '';
  // Trim the trailing .00 that numeric columns bring back.
  return formatAmountInput(Number.isInteger(n) ? String(n) : n.toFixed(2));
}
