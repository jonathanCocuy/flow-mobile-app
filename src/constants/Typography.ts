/**
 * FlowX Typography System — Aeonik Bold (headings) + Inter (body/UI)
 * Matches FinTracker: Aeonik-Bold for h1-h6, Inter for everything else
 */

export const FontFamily = {
  // Aeonik — display & headings (matches FinTracker heading font)
  aeonikBold: 'Aeonik_700Bold',
  aeonikRegular: 'Aeonik_400Regular',
  aeonikLight: 'Aeonik_300Light',

  // Inter — body & UI (reliable, full glyph set)
  interBold: 'Inter_700Bold',
  interSemiBold: 'Inter_600SemiBold',
  interMedium: 'Inter_500Medium',
  interRegular: 'Inter_400Regular',
} as const;

/**
 * Apple HIG iOS Text Styles
 */
export const TextStyles = {
  // Display — Aeonik Bold
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

  // HIG Text Styles — Aeonik Bold for titles
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

  // HIG Text Styles — Inter for body/UI
  headline: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  body: {
    fontFamily: FontFamily.interRegular,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  callout: {
    fontFamily: FontFamily.interRegular,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  subheadline: {
    fontFamily: FontFamily.interRegular,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontFamily: FontFamily.interRegular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption1: {
    fontFamily: FontFamily.interRegular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontFamily: FontFamily.interRegular,
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
