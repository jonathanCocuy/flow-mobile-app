import { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

const DISMISS_KEY = '@flowx_checklist_dismissed';

// ── Icons ─────────────────────────────────────────────────────────────────────

function WalletIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="20" height="14" rx="3" stroke={color} strokeWidth={1.6} />
      <Path d="M2 10h20" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M16 15h2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PiggyIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12C19 16.4 16.5 19 12 19C7.5 19 4 16.4 4 12C4 7.6 7 5 12 5C14.8 5 19 7.4 19 12Z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 10C20.3 9.1 23 9 23.5 12C24 15 21 15.8 19 14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M9 5L15 5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx="10" cy="12" r="1" fill={color} />
      <Path d="M8.5 19L8 22M14.5 19L14.5 22" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function TargetIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.6} />
      <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth={1.6} />
      <Circle cx="12" cy="12" r="2" fill={color} />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} opacity={0.15} />
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} />
      <Path d="M8 12l3 3 5-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CircleEmptyIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} opacity={0.3} />
    </Svg>
  );
}

function XIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  hasAccounts: boolean;
  hasTransactions: boolean;
  hasBudgets: boolean;
  hasGoals: boolean;
  onAddAccount?: () => void;
  onAddTransaction?: () => void;
  onAddBudget?: () => void;
  onAddGoal?: () => void;
}

export function GettingStartedChecklist({
  hasAccounts,
  hasTransactions,
  hasBudgets,
  hasGoals,
  onAddAccount,
  onAddTransaction,
  onAddBudget,
  onAddGoal,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY)
      .then(val => setDismissed(val === 'true'))
      .catch(() => setDismissed(false));
  }, []);

  const accent = colors.income;

  const steps = [
    {
      key: 'account',
      done: hasAccounts,
      label: t('checklist.stepAccount'),
      Icon: WalletIcon,
      onPress: onAddAccount,
    },
    {
      key: 'transaction',
      done: hasTransactions,
      label: t('checklist.stepTransaction'),
      Icon: ArrowIcon,
      onPress: onAddTransaction,
    },
    {
      key: 'budget',
      done: hasBudgets,
      label: t('checklist.stepBudget'),
      Icon: PiggyIcon,
      onPress: onAddBudget,
    },
    {
      key: 'goal',
      done: hasGoals,
      label: t('checklist.stepGoal'),
      Icon: TargetIcon,
      onPress: onAddGoal,
    },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;

  if (dismissed || allDone) return null;

  const dismiss = () => {
    AsyncStorage.setItem(DISMISS_KEY, 'true').catch(() => {});
    setDismissed(true);
  };

  const progressPct = doneCount / steps.length;

  return (
    <View style={[styles.container, { backgroundColor: `${accent}0F`, borderColor: `${accent}30` }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="callout" style={{ fontWeight: '700' }}>{t('checklist.title')}</Text>
          <Text variant="caption1" color={colors.labelSecondary} style={styles.progressText}>
            {t('checklist.progress', { done: doneCount, total: steps.length })}
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={12}>
          <XIcon color={colors.labelSecondary} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.fillPrimary }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: accent, width: `${progressPct * 100}%` },
          ]}
        />
      </View>

      {/* Steps */}
      <View style={styles.steps}>
        {steps.map(({ key, done, label, Icon, onPress }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.step,
              {
                backgroundColor: done ? `${colors.income}0D` : colors.background,
                borderColor: done ? `${colors.income}30` : colors.separator,
              },
            ]}
            activeOpacity={done ? 1 : 0.7}
            onPress={done ? undefined : onPress}
          >
            {done
              ? <CheckIcon color={colors.income} />
              : <CircleEmptyIcon color={colors.labelTertiary} />
            }
            <Text
              variant="subheadline"
              color={done ? colors.labelSecondary : colors.label}
              style={[styles.stepLabel, done && styles.stepDone]}
              numberOfLines={2}
            >
              {label}
            </Text>
            {!done && (
              <View style={{ marginLeft: 'auto' }}>
                <Icon color={colors.labelTertiary} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Dismiss link */}
      <TouchableOpacity onPress={dismiss} style={styles.dismissRow}>
        <Text variant="caption1" color={colors.labelTertiary}>{t('checklist.dismiss')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.radius.xl,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  progressText: {
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  steps: {
    gap: 8,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
  },
  stepLabel: {
    flex: 1,
  },
  stepDone: {
    textDecorationLine: 'line-through',
  },
  dismissRow: {
    alignSelf: 'flex-end',
  },
});
