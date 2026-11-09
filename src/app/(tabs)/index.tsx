import React from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import Svg, { Path, Circle } from 'react-native-svg';

// Mock data
const BALANCE = 12_480.50;
const INCOME = 4_200.00;
const EXPENSES = 1_847.30;

const RECENT_TRANSACTIONS = [
  { id: '1', name: 'Spotify', category: 'Entertainment', amount: -9.99, date: 'Today' },
  { id: '2', name: 'Salary', category: 'Income', amount: 4200.00, date: 'Yesterday' },
  { id: '3', name: 'Whole Foods', category: 'Groceries', amount: -84.20, date: 'Yesterday' },
  { id: '4', name: 'Netflix', category: 'Entertainment', amount: -15.99, date: 'Nov 7' },
  { id: '5', name: 'Uber', category: 'Transport', amount: -12.40, date: 'Nov 6' },
];

function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return `$${(Math.abs(value) / 1000).toFixed(1)}k`;
  }
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path d="M10 4V16M4 10H16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M6 12L10 8L6 4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="footnote" color={colors.labelSecondary}>
              Good morning
            </Text>
            <Text variant="title2">FlowX</Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            activeOpacity={0.8}
          >
            <PlusIcon color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.section}>
          <Card style={[styles.balanceCard, { backgroundColor: colors.label }]} padding={0} radius={Spacing.radius.xl}>
            <View style={styles.balancePadding}>
              <Text variant="footnote" color={colorScheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}>
                Total Balance
              </Text>
              <Text
                variant="displayMedium"
                color={colorScheme === 'dark' ? '#000' : '#fff'}
                style={styles.balanceAmount}
              >
                {formatCurrency(BALANCE)}
              </Text>
              <View style={styles.balanceStats}>
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: colorScheme === 'dark' ? '#30D158' : '#34C759' }]} />
                  <View>
                    <Text variant="caption2" color={colorScheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)'}>
                      Income
                    </Text>
                    <Text
                      variant="footnote"
                      color={colorScheme === 'dark' ? '#000' : '#fff'}
                      style={{ fontWeight: '600' }}
                    >
                      {formatCurrency(INCOME, true)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)' }]} />
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: colorScheme === 'dark' ? '#FF453A' : '#FF3B30' }]} />
                  <View>
                    <Text variant="caption2" color={colorScheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)'}>
                      Expenses
                    </Text>
                    <Text
                      variant="footnote"
                      color={colorScheme === 'dark' ? '#000' : '#fff'}
                      style={{ fontWeight: '600' }}
                    >
                      {formatCurrency(EXPENSES, true)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            {[
              { label: 'Send', icon: '↑' },
              { label: 'Receive', icon: '↓' },
              { label: 'Pay', icon: '⊕' },
              { label: 'More', icon: '···' },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickAction}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.fillPrimary }]}>
                  <Text variant="title3" color={colors.tint}>{action.icon}</Text>
                </View>
                <Text variant="caption1" color={colors.labelSecondary} style={styles.quickActionLabel}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Budget Overview */}
        <View style={styles.sectionWithHeader}>
          <View style={styles.sectionHeader}>
            <Text variant="title3">Budgets</Text>
            <TouchableOpacity>
              <Text variant="subheadline" color={colors.tint}>See all</Text>
            </TouchableOpacity>
          </View>
          <Card radius={Spacing.radius.lg} padding={0}>
            {[
              { name: 'Groceries', spent: 320, total: 500, color: colors.tintOrange },
              { name: 'Entertainment', spent: 60, total: 100, color: colors.tint },
              { name: 'Transport', spent: 85, total: 150, color: colors.tintGreen },
            ].map((budget, index) => (
              <View key={budget.name}>
                <View style={[styles.budgetItem, { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 }]}>
                  <View style={styles.budgetLeft}>
                    <Text variant="callout">{budget.name}</Text>
                    <View style={[styles.progressTrack, { backgroundColor: colors.fillPrimary }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: budget.color,
                            width: `${(budget.spent / budget.total) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.budgetRight}>
                    <Text variant="callout" style={{ fontWeight: '600' }}>
                      ${budget.spent}
                    </Text>
                    <Text variant="caption1" color={colors.labelSecondary}>
                      of ${budget.total}
                    </Text>
                  </View>
                </View>
                {index < 2 && (
                  <View style={[styles.insetDivider, { backgroundColor: colors.separator, marginLeft: Spacing.md }]} />
                )}
              </View>
            ))}
          </Card>
        </View>

        {/* Recent Transactions */}
        <View style={[styles.sectionWithHeader, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text variant="title3">Recent</Text>
            <TouchableOpacity>
              <Text variant="subheadline" color={colors.tint}>See all</Text>
            </TouchableOpacity>
          </View>
          <Card radius={Spacing.radius.lg} padding={0}>
            {RECENT_TRANSACTIONS.map((tx, index) => (
              <View key={tx.id}>
                <TouchableOpacity
                  style={[styles.txItem, { paddingHorizontal: Spacing.md }]}
                  activeOpacity={0.6}
                >
                  <View style={[styles.txIcon, { backgroundColor: tx.amount > 0 ? `${colors.income}18` : colors.fillTertiary }]}>
                    <Text variant="footnote" align="center">
                      {tx.amount > 0 ? '↑' : tx.category === 'Groceries' ? '🛒' : tx.category === 'Entertainment' ? '🎵' : '🚗'}
                    </Text>
                  </View>
                  <View style={styles.txMiddle}>
                    <Text variant="callout" style={{ fontWeight: '500' }}>{tx.name}</Text>
                    <Text variant="caption1" color={colors.labelSecondary}>{tx.category}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      variant="callout"
                      style={{ fontWeight: '600' }}
                      color={tx.amount > 0 ? colors.income : colors.label}
                    >
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </Text>
                    <Text variant="caption2" color={colors.labelTertiary}>{tx.date}</Text>
                  </View>
                </TouchableOpacity>
                {index < RECENT_TRANSACTIONS.length - 1 && (
                  <View style={[styles.insetDivider, { backgroundColor: colors.separator, marginLeft: 72 }]} />
                )}
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sm,
  },
  sectionWithHeader: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
  },
  lastSection: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  balanceCard: {
    overflow: 'hidden',
  },
  balancePadding: {
    padding: Spacing.lg,
  },
  balanceAmount: {
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    marginTop: 2,
  },
  budgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  budgetLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  budgetRight: {
    alignItems: 'flex-end',
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMiddle: {
    flex: 1,
    gap: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
