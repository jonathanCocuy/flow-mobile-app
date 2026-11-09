/**
 * FlowX Spacing System — Apple HIG 8pt grid
 */

export const Spacing = {
  // Base unit: 4pt
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  xxxxl: 48,
  huge: 64,

  // iOS-specific layout values
  screenHorizontal: 20,   // Standard horizontal margin
  screenTop: 16,
  listItemVertical: 12,
  sectionSpacing: 28,
  groupedListInset: 16,

  // Corner radius (Apple HIG)
  radius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },

  // Icon sizes
  icon: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
    xxl: 32,
  },

  // Tab bar
  tabBarHeight: 83,       // 49pt bar + 34pt safe area on modern iPhones
  tabBarIconSize: 24,

  // Navigation bar
  navBarHeight: 44,
  largeNavBarHeight: 96,
} as const;
