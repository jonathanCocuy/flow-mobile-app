/**
 * FlowX Typography System — Aeonik (matching FinTracker)
 * Aeonik-Bold for display/headings, Aeonik-Regular for body/UI
 */

export const FontFamily = {
  aeonikBold: 'Aeonik_700Bold',
  aeonikRegular: 'Aeonik_400Regular',
  aeonikLight: 'Aeonik_300Light',
} as const;

/**
 * Apple HIG iOS Text Styles with Aeonik
 */
export const TextStyles = {
  // Display
  displayLarge: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1.5,
  },
  displayMedium: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
  },

  // HIG Text Styles
  largeTitle: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  title1: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  headline: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  body: {
    fontFamily: FontFamily.aeonikRegular,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  callout: {
    fontFamily: FontFamily.aeonikRegular,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  subheadline: {
    fontFamily: FontFamily.aeonikRegular,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontFamily: FontFamily.aeonikRegular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption1: {
    fontFamily: FontFamily.aeonikRegular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontFamily: FontFamily.aeonikRegular,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.07,
  },

  // Numeric — Aeonik Bold for financial figures
  numericLarge: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  },
  numericMedium: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  numericSmall: {
    fontFamily: FontFamily.aeonikBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
} as const;
