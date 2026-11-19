import React, { useState } from 'react';
import {
  Animated,
  Easing,
  TouchableOpacity,
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

function WalletIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7z" stroke={color} strokeWidth={1.5} />
      <Path d="M2 10h20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="17" cy="15" r="1" fill={color} />
    </Svg>
  );
}

function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  frontContent: React.ReactNode;
  accounts: DashboardAccount[];
  cardBg: string;
  cardBorder: string;
  balanceVisible?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 52;
const LIST_BOTTOM_PAD = 16;

export function BalanceExpandCard({ frontContent, accounts, cardBg, cardBorder, balanceVisible = true }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [expanded, setExpanded] = useState(false);
  const [animValue] = useState(() => new Animated.Value(0));

  const toggle = () => {
    setExpanded(e => !e);
    if (expanded) {
      // closing: timing to avoid spring overshoot below 0
      Animated.timing(animValue, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      // opening: spring feels natural
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: false,
        friction: 10,
        tension: 60,
      }).start();
    }
  };

  const listHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, accounts.length * ROW_HEIGHT + LIST_BOTTOM_PAD],
    extrapolate: 'clamp',
  });

  const chevronRotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
    extrapolate: 'clamp',
  });

  const stripOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
    extrapolate: 'clamp',
  });

  const cardText = '#fafafa';
  const cardTextSub = 'rgba(250,250,250,0.55)';
  const dividerColor = 'rgba(255,255,255,0.12)';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {/* Main balance content */}
      {frontContent}

      {/* Toggle strip — only when there are accounts */}
      {accounts.length > 0 && (
        <TouchableOpacity
          style={styles.toggleStrip}
          onPress={toggle}
          activeOpacity={0.7}
        >
          <View style={[styles.stripDivider, { backgroundColor: dividerColor }]} />
          <Animated.View style={[styles.stripRow, { opacity: stripOpacity }]}>
            <Text variant="caption1" color={cardTextSub}>
              {t('accounts.count', { count: accounts.length })}
            </Text>
            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
              <ChevronDownIcon color={cardTextSub} />
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Animated accounts list */}
      {accounts.length > 0 && (
        <View style={styles.listWrapper}>
          <Animated.View style={{ height: listHeight, overflow: 'hidden' }}>
            <View style={[styles.listDivider, { backgroundColor: dividerColor }]} />
            {accounts.map((acc, i) => (
              <View
                key={acc.id}
                style={[
                  styles.accountRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
                ]}
              >
                <View style={[styles.accountDot, { backgroundColor: acc.color ?? colors.tint }]}>
                  <WalletIcon color="#fff" />
                </View>
                <Text variant="subheadline" color={cardText} style={{ flex: 1 }} numberOfLines={1}>
                  {acc.name}
                </Text>
                <Text variant="subheadline" color={cardText} style={{ fontWeight: '600' }}>
                  {balanceVisible ? formatCurrency(acc.balance ?? 0) : '••••'}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  toggleStrip: {
    // touchable area includes divider + label row
  },
  stripDivider: {
    height: StyleSheet.hairlineWidth,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  listWrapper: {
    // clips the animated height
    overflow: 'hidden',
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 0,
    paddingHorizontal: 20,
    height: ROW_HEIGHT,
  },
  accountDot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
