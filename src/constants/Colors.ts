/**
 * FlowX Color System — FinTracker palette
 * Monochromatic primary (black/white) + emerald/rose/blue finance accents
 */

export const Colors = {
  light: {
    // Backgrounds
    background: '#ffffff',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#ffffff',
    backgroundGrouped: '#f5f5f5',
    backgroundGroupedSecondary: '#ffffff',

    // Labels
    label: '#0a0a0a',
    labelSecondary: '#737373',
    labelTertiary: '#a1a1a1',
    labelQuaternary: 'rgba(0, 0, 0, 0.12)',

    // Separators
    separator: '#e5e5e5',
    separatorOpaque: '#e5e5e5',

    // Fills
    fillPrimary: 'rgba(0, 0, 0, 0.12)',
    fillSecondary: 'rgba(0, 0, 0, 0.08)',
    fillTertiary: 'rgba(0, 0, 0, 0.06)',
    fillQuaternary: 'rgba(0, 0, 0, 0.04)',

    // Tints — monochromatic primary
    tint: '#171717',
    tintForeground: '#fafafa',
    tintGreen: '#10b981',
    tintRed: '#f43f5e',
    tintOrange: '#f59e0b',

    // Finance-specific
    income: '#10b981',
    expense: '#f43f5e',
    savings: '#3b82f6',
    investment: '#8b5cf6',

    // Tab bar
    tabBarBackground: 'rgba(255, 255, 255, 0.94)',
    tabBarBorder: '#e5e5e5',
    tabBarActive: '#171717',
    tabBarInactive: '#a1a1a1',

    // Card
    card: '#ffffff',
    cardBorder: '#e5e5e5',
  },

  dark: {
    // Backgrounds
    background: '#0a0a0a',
    backgroundSecondary: '#262626',
    backgroundTertiary: '#262626',
    backgroundGrouped: '#0a0a0a',
    backgroundGroupedSecondary: '#171717',

    // Labels
    label: '#fafafa',
    labelSecondary: '#a1a1a1',
    labelTertiary: '#737373',
    labelQuaternary: 'rgba(255, 255, 255, 0.12)',

    // Separators
    separator: 'rgba(255, 255, 255, 0.10)',
    separatorOpaque: '#262626',

    // Fills
    fillPrimary: 'rgba(255, 255, 255, 0.16)',
    fillSecondary: 'rgba(255, 255, 255, 0.12)',
    fillTertiary: 'rgba(255, 255, 255, 0.08)',
    fillQuaternary: 'rgba(255, 255, 255, 0.04)',

    // Tints — monochromatic primary
    tint: '#e5e5e5',
    tintForeground: '#171717',
    tintGreen: '#10b981',
    tintRed: '#f43f5e',
    tintOrange: '#f59e0b',

    // Finance-specific
    income: '#10b981',
    expense: '#f43f5e',
    savings: '#3b82f6',
    investment: '#8b5cf6',

    // Tab bar
    tabBarBackground: 'rgba(10, 10, 10, 0.94)',
    tabBarBorder: 'rgba(255, 255, 255, 0.10)',
    tabBarActive: '#e5e5e5',
    tabBarInactive: '#737373',

    // Card
    card: '#171717',
    cardBorder: 'rgba(255, 255, 255, 0.10)',
  },
} as const;

export type ColorScheme = 'light' | 'dark';
