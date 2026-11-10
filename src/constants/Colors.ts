/**
 * FlowX Color System — Apple HIG compliant
 * iOS system colors + dark/light semantic tokens
 */

export const SystemColors = {
  // iOS System Colors
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  purple: '#AF52DE',
  indigo: '#5856D6',
  teal: '#5AC8FA',
  pink: '#FF2D55',

  // Grays (iOS)
  gray1: '#8E8E93',
  gray2: '#AEAEB2',
  gray3: '#C7C7CC',
  gray4: '#D1D1D6',
  gray5: '#E5E5EA',
  gray6: '#F2F2F7',
} as const;

export const Colors = {
  light: {
    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F2F2F7',
    backgroundTertiary: '#FFFFFF',
    backgroundGrouped: '#F2F2F7',
    backgroundGroupedSecondary: '#FFFFFF',

    // Labels
    label: '#000000',
    labelSecondary: 'rgba(60, 60, 67, 0.60)',
    labelTertiary: 'rgba(60, 60, 67, 0.30)',
    labelQuaternary: 'rgba(60, 60, 67, 0.18)',

    // Separators
    separator: 'rgba(60, 60, 67, 0.29)',
    separatorOpaque: '#C6C6C8',

    // Fills
    fillPrimary: 'rgba(120, 120, 128, 0.20)',
    fillSecondary: 'rgba(120, 120, 128, 0.16)',
    fillTertiary: 'rgba(118, 118, 128, 0.12)',
    fillQuaternary: 'rgba(116, 116, 128, 0.08)',

    // Tints
    tint: SystemColors.blue,
    tintGreen: SystemColors.green,
    tintRed: SystemColors.red,
    tintOrange: SystemColors.orange,

    // Finance-specific
    income: SystemColors.green,
    expense: SystemColors.red,
    savings: SystemColors.blue,
    investment: SystemColors.indigo,

    // Tab bar
    tabBarBackground: 'rgba(249, 249, 249, 0.94)',
    tabBarBorder: 'rgba(0, 0, 0, 0.12)',
    tabBarActive: SystemColors.blue,
    tabBarInactive: SystemColors.gray1,

    // Card
    card: '#FFFFFF',
    cardBorder: 'rgba(0, 0, 0, 0.06)',
  },

  dark: {
    // Backgrounds
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',
    backgroundGrouped: '#000000',
    backgroundGroupedSecondary: '#1C1C1E',

    // Labels
    label: '#FFFFFF',
    labelSecondary: 'rgba(235, 235, 245, 0.60)',
    labelTertiary: 'rgba(235, 235, 245, 0.30)',
    labelQuaternary: 'rgba(235, 235, 245, 0.18)',

    // Separators
    separator: 'rgba(84, 84, 88, 0.60)',
    separatorOpaque: '#38383A',

    // Fills
    fillPrimary: 'rgba(120, 120, 128, 0.36)',
    fillSecondary: 'rgba(120, 120, 128, 0.32)',
    fillTertiary: 'rgba(118, 118, 128, 0.24)',
    fillQuaternary: 'rgba(116, 116, 128, 0.18)',

    // Tints
    tint: '#0A84FF',
    tintGreen: '#30D158',
    tintRed: '#FF453A',
    tintOrange: '#FF9F0A',

    // Finance-specific
    income: '#30D158',
    expense: '#FF453A',
    savings: '#0A84FF',
    investment: '#5E5CE6',

    // Tab bar
    tabBarBackground: 'rgba(28, 28, 30, 0.94)',
    tabBarBorder: 'rgba(255, 255, 255, 0.10)',
    tabBarActive: '#0A84FF',
    tabBarInactive: '#8E8E93',

    // Card
    card: '#1C1C1E',
    cardBorder: 'rgba(255, 255, 255, 0.06)',
  },
} as const;

export type ColorScheme = 'light' | 'dark';
