import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ONBOARDING_KEY = (userId: string) => `flowx_onboarding_done_${userId}`;

// ── Slide icons ───────────────────────────────────────────────────────────────

function WelcomeIllustration({ tint }: { tint: string }) {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Sparkle top-right */}
      <Path d="M90 20L93 28L101 31L93 34L90 42L87 34L79 31L87 28Z" fill={tint} opacity={0.9} />
      {/* Coin stack */}
      <Rect x="30" y="68" width="60" height="12" rx="6" fill={tint} opacity={0.25} />
      <Rect x="34" y="56" width="52" height="12" rx="6" fill={tint} opacity={0.45} />
      <Rect x="38" y="44" width="44" height="12" rx="6" fill={tint} opacity={0.7} />
      <Rect x="42" y="32" width="36" height="12" rx="6" fill={tint} />
      {/* Dollar sign */}
      <Path d="M60 36V44M57 38.5C57 37.1 58.3 36 60 36C61.7 36 63 37.1 63 38.5C63 39.9 61.7 41 60 41C58.3 41 57 42.1 57 43.5C57 44.9 58.3 46 60 46C61.7 46 63 44.9 63 43.5" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
      {/* Dots */}
      <Circle cx="22" cy="40" r="4" fill={tint} opacity={0.3} />
      <Circle cx="98" cy="72" r="6" fill={tint} opacity={0.2} />
      <Circle cx="16" cy="80" r="3" fill={tint} opacity={0.2} />
    </Svg>
  );
}

function AccountsIllustration({ tint }: { tint: string }) {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Card back */}
      <Rect x="22" y="38" width="76" height="48" rx="12" fill={tint} opacity={0.2} />
      {/* Card front */}
      <Rect x="16" y="30" width="76" height="48" rx="12" fill={tint} />
      {/* Chip */}
      <Rect x="28" y="44" width="20" height="14" rx="4" fill="white" opacity={0.5} />
      {/* Lines */}
      <Rect x="28" y="64" width="30" height="4" rx="2" fill="white" opacity={0.6} />
      <Rect x="28" y="72" width="20" height="4" rx="2" fill="white" opacity={0.3} />
      {/* Logo circle */}
      <Circle cx="76" cy="50" r="8" fill="white" opacity={0.3} />
      <Circle cx="82" cy="50" r="8" fill="white" opacity={0.2} />
      {/* Plus badge */}
      <Circle cx="88" cy="88" r="14" fill="white" opacity={0.9} />
      <Path d="M88 82V94M82 88H94" stroke={tint} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function ExpensesIllustration({ tint }: { tint: string }) {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Chart bars */}
      <Rect x="20" y="72" width="16" height="20" rx="4" fill={tint} opacity={0.3} />
      <Rect x="42" y="52" width="16" height="40" rx="4" fill={tint} opacity={0.5} />
      <Rect x="64" y="36" width="16" height="56" rx="4" fill={tint} opacity={0.75} />
      <Rect x="86" y="48" width="16" height="44" rx="4" fill={tint} />
      {/* Trend line */}
      <Path d="M28 70L50 50L72 34L94 46" stroke={tint} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
      {/* Dot on trend */}
      <Circle cx="94" cy="46" r="5" fill={tint} />
      {/* X axis */}
      <Path d="M16 94H104" stroke={tint} strokeWidth={1.5} strokeLinecap="round" opacity={0.3} />
    </Svg>
  );
}

function SecurityIllustration({ tint }: { tint: string }) {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Shield */}
      <Path
        d="M60 18L92 32V58C92 76 78 90 60 96C42 90 28 76 28 58V32L60 18Z"
        fill={tint}
        opacity={0.15}
      />
      <Path
        d="M60 24L86 36V58C86 73 74 85 60 90C46 85 34 73 34 58V36L60 24Z"
        fill={tint}
        opacity={0.3}
      />
      <Path
        d="M60 30L80 40V58C80 70 71 80 60 84C49 80 40 70 40 58V40L60 30Z"
        fill={tint}
      />
      {/* Checkmark */}
      <Path d="M50 58L57 65L71 50" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Slide data ────────────────────────────────────────────────────────────────

type SlideKey = 'welcome' | 'accounts' | 'expenses' | 'security';

const SLIDES: { key: SlideKey; accentKey: 'tint' | 'income' | 'savings' | 'expense' }[] = [
  { key: 'welcome',  accentKey: 'tint' },
  { key: 'accounts', accentKey: 'savings' },
  { key: 'expenses', accentKey: 'expense' },
  { key: 'security', accentKey: 'income' },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const flatRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const tint = colors.tint;
  const accentMap: Record<string, string> = {
    tint: tint,
    income: colors.income,
    savings: colors.savings,
    expense: colors.expense,
  };

  const finish = useCallback(async () => {
    if (user) {
      try {
        await AsyncStorage.setItem(ONBOARDING_KEY(user.id), 'done');
      } catch {}
    }
    router.replace('/(tabs)');
  }, [user, router]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      finish();
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;

  const illustrations = {
    welcome: WelcomeIllustration,
    accounts: AccountsIllustration,
    expenses: ExpensesIllustration,
    security: SecurityIllustration,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        {!isLast && (
          <TouchableOpacity onPress={finish} hitSlop={12}>
            <Text style={[styles.skipText, { color: colors.labelSecondary }]}>
              {t('onboarding.skip')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const accent = accentMap[item.accentKey];
          const Illustration = illustrations[item.key as keyof typeof illustrations];
          return (
            <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
              {/* Illustration bubble */}
              <View style={[styles.illustrationBubble, { backgroundColor: `${accent}18` }]}>
                <Illustration tint={accent} />
              </View>

              <Text style={[styles.slideTitle, { color: colors.label }]}>
                {t(`onboarding.${item.key}.title`)}
              </Text>
              <Text style={[styles.slideDesc, { color: colors.labelSecondary }]}>
                {t(`onboarding.${item.key}.description`)}
              </Text>
            </View>
          );
        }}
      />

      {/* Dots + CTA */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === activeIndex ? 20 : 6,
                  backgroundColor: i === activeIndex ? tint : colors.fillPrimary,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: tint }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>
            {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipText: { fontSize: 15, fontWeight: '500' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 24,
  },
  illustrationBubble: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  slideDesc: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  ctaButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
