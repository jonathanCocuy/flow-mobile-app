const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍽',
  home: '🏠',
  transport: '🚗',
  health: '❤️',
  leisure: '🎮',
  income: '💰',
  entertainment: '🎵',
  shopping: '🛒',
  education: '📚',
  travel: '✈️',
};

export function getCategoryEmoji(category: string, type: string): string {
  if (type === 'income') return '💰';
  if (type === 'transfer') return '↔️';
  return CATEGORY_EMOJIS[category?.toLowerCase()] ?? '💸';
}
