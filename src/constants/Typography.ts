/**
 * FlowX Typography System — Apple HIG iOS Text Styles
 * Using Plus Jakarta Sans for display/headings + Inter for body
 */

export const FontFamily = {
  // Plus Jakarta Sans — display & headings
  jakartaBold: 'PlusJakartaSans_700Bold',
  jakartaSemiBold: 'PlusJakartaSans_600SemiBold',
  jakartaMedium: 'PlusJakartaSans_500Medium',
  jakartaRegular: 'PlusJakartaSans_400Regular',

  // Inter — body & UI
  interBold: 'Inter_700Bold',
  interSemiBold: 'Inter_600SemiBold',
  interMedium: 'Inter_500Medium',
  interRegular: 'Inter_400Regular',
} as const;

/**
 * Apple HIG iOS Text Styles
 * https://developer.apple.com/design/human-interface-guidelines/typography
 */
export const TextStyles = {
  // Display — Jakarta Bold (not in HIG but used for hero numbers)
  displayLarge: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1.5,
  },
  displayMedium: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
  },

  // HIG Text Styles
  largeTitle: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  title1: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontFamily: FontFamily.jakartaSemiBold,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
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

  // Numeric — Jakarta for financial figures
  numericLarge: {
    fontFamily: FontFamily.jakartaBold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  },
  numericMedium: {
    fontFamily: FontFamily.jakartaSemiBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  numericSmall: {
    fontFamily: FontFamily.jakartaMedium,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
} as const;
