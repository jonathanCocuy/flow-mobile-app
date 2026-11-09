import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

const TRANSACTIONS = [
  { id: '1', name: 'Spotify', category: 'Entertainment', amount: -9.99, date: '2026-11-09', icon: '🎵' },
  { id: '2', name: 'Salary', category: 'Income', amount: 4200.00, date: '2026-11-08', icon: '💼' },
  { id: '3', name: 'Whole Foods', category: 'Groceries', amount: -84.20, date: '2026-11-08', icon: '🛒' },
  { id: '4', name: 'Netflix', category: 'Entertainment', amount: -15.99, date: '2026-11-07', icon: '📺' },
  { id: '5', name: 'Uber', category: 'Transport', amount: -12.40, date: '2026-11-06', icon: '🚗' },
  { id: '6', name: 'Electric Bill', category: 'Utilities', amount: -98.00, date: '2026-11-05', icon: '⚡' },
  { id: '7', name: 'Amazon', category: 'Shopping', amount: -44.50, date: '2026-11-04', icon: '📦' },
  { id: '8', name: 'Freelance', category: 'Income', amount: 350.00, date: '2026-11-03', icon: '💻' },
];

const FILTERS = ['All', 'Income', 'Expense'];

function formatCurrency(value: number): string {
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2 });
  return value < 0 ? `-$${formatted}` : `+$${formatted}`;
}

function groupByDate(transactions: typeof TRANSACTIONS) {
  const groups: Record<string, typeof TRANSACTIONS> = {};
  transactions.forEach((tx) => {
    if (!groups[tx.date]) groups[tx.date] = [];
    groups[tx.date].push(tx);
  });
  return groups;
}

function formatGroupDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) return 'Today';
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function TransactionsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = TRANSACTIONS.filter((tx) => {
    if (activeFilter === 'Income') return tx.amount > 0;
    if (activeFilter === 'Expense') return tx.amount < 0;
    return true;
  });

  const groups = groupByDate(filtered);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="largeTitle">Activity</Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[
                styles.chip,
                {
                  backgroundColor: activeFilter === f ? colors.tint : colors.fillPrimary,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                variant="subheadline"
                color={activeFilter === f ? '#fff' : colors.labelSecondary}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Groups */}
        {Object.entries(groups).map(([date, txs]) => (
          <View key={date} style={styles.group}>
            <Text
              variant="footnote"
              color={colors.labelSecondary}
              style={styles.groupLabel}
            >
              {formatGroupDate(date).toUpperCase()}
            </Text>
            <Card radius={Spacing.radius.lg} padding={0}>
              {txs.map((tx, index) => (
                <View key={tx.id}>
                  <TouchableOpacity
                    style={[styles.txRow, { paddingHorizontal: Spacing.md }]}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.txIcon, { backgroundColor: colors.fillTertiary }]}>
                      <Text variant="body" align="center">{tx.icon}</Text>
                    </View>
                    <View style={styles.txMiddle}>
                      <Text variant="callout" style={{ fontWeight: '500' }}>{tx.name}</Text>
                      <Text variant="caption1" color={colors.labelSecondary}>{tx.category}</Text>
                    </View>
                    <Text
                      variant="callout"
                      style={{ fontWeight: '600' }}
                      color={tx.amount > 0 ? colors.income : colors.label}
                    >
                      {formatCurrency(tx.amount)}
                    </Text>
                  </TouchableOpacity>
                  {index < txs.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: 72 }]} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Spacing.radius.full,
  },
  group: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.lg,
  },
  groupLabel: {
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMiddle: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth },
});
