import React, { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  ScrollView,
  View,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import type { DashboardAccount } from '@/types/finance';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FlipHintIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12C4 8.69 6.69 6 10 6h4M14 6l-2-2m2 2l-2 2" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 12c0 3.31-2.69 6-6 6h-4m0 0l2 2m-2-2l2-2" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function WalletIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7z" stroke={color} strokeWidth={1.5} />
      <Path d="M2 10h20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="17" cy="15" r="1" fill={color} />
    </Svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  // Front face props
  frontContent: React.ReactNode;
  // Back face data
  accounts: DashboardAccount[];
  // Card dimensions / styles forwarded
  cardBg: string;
  cardBorder: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BalanceFlipCard({ frontContent, accounts, cardBg, cardBorder }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnim] = useState(() => new Animated.Value(0));
  const isAnimating = useRef(false);
  const flippedRef = useRef(false);

  const flip = (toBack: boolean) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Animated.spring(flipAnim, {
      toValue: toBack ? 1 : 0,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
      flippedRef.current = toBack;
      setIsFlipped(toBack);
    });
  };

  // PanResponder — horizontal swipe toggles the flip
  // eslint-disable-next-line react-hooks/refs -- callbacks only run during gesture events, not render
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 40) {
          flip(!flippedRef.current);
        }
      },
    })
  );

  // Front face: rotateY 0 → 90 (disappears mid-flip)
  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Back face: starts at 180, rotates to 360 (=0 when visible)
  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const hintOpacity = flipAnim.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cardText = '#fafafa';
  const cardTextSub = 'rgba(250,250,250,0.55)';

  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* ── FRONT ── */}
      <Animated.View
        style={[
          styles.face,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            transform: [{ perspective: 1200 }, { rotateY: frontRotateY }],
          },
        ]}
        pointerEvents={isFlipped ? 'none' : 'box-none'}
      >
        {frontContent}

        {/* Flip hint */}
        <Animated.View style={[styles.flipHint, { opacity: hintOpacity }]}>
          <FlipHintIcon color={cardTextSub} />
        </Animated.View>
      </Animated.View>

      {/* ── BACK ── */}
      <Animated.View
        style={[
          styles.face,
          styles.faceback,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            transform: [{ perspective: 1200 }, { rotateY: backRotateY }],
          },
        ]}
        pointerEvents={isFlipped ? 'box-none' : 'none'}
      >
        <View style={styles.backPadding}>
          {/* Header */}
          <View style={styles.backHeader}>
            <Text variant="footnote" color={cardTextSub}>
              {t('dashboard.totalBalance')}
            </Text>
            <FlipHintIcon color={cardTextSub} />
          </View>

          <Text variant="title2" color={cardText} style={styles.backTotal}>
            {formatCurrency(totalBalance)}
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />

          {/* Accounts list */}
          <ScrollView
            style={styles.accountsList}
            contentContainerStyle={styles.accountsContent}
            showsVerticalScrollIndicator={false}
            bounces={accounts.length > 3}
          >
            {accounts.length === 0 ? (
              <Text variant="caption1" color={cardTextSub} align="center">
                {t('dashboard.noAccounts')}
              </Text>
            ) : (
              accounts.map((acc, i) => (
                <View key={acc.id} style={[styles.accountRow, i > 0 && styles.accountRowBorder]}>
                  <View style={[styles.accountDot, { backgroundColor: acc.color ?? colors.tint }]}>
                    <WalletIcon color="#fff" />
                  </View>
                  <Text variant="subheadline" color={cardText} style={{ flex: 1 }} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text variant="subheadline" color={cardText} style={{ fontWeight: '600' }}>
                    {formatCurrency(acc.balance ?? 0)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    // Height must be fixed so both faces overlay exactly
  },
  face: {
    borderRadius: Spacing.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
  },
  faceback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
  },
  flipHint: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  backPadding: {
    padding: 20,
    flex: 1,
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backTotal: {
    marginTop: 6,
    marginBottom: 16,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  accountsList: {
    flex: 1,
  },
  accountsContent: {
    gap: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  accountRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  accountDot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
