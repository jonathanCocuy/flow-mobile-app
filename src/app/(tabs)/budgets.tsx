import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

const BUDGETS = [
  { id: '1', name: 'Groceries', emoji: '🛒', spent: 320, total: 500, color: '#FF9500' },
  { id: '2', name: 'Entertainment', emoji: '🎬', spent: 60, total: 100, color: '#007AFF' },
  { id: '3', name: 'Transport', emoji: '🚗', spent: 85, total: 150, color: '#34C759' },
  { id: '4', name: 'Dining', emoji: '🍽️', spent: 180, total: 200, color: '#FF2D55' },
  { id: '5', name: 'Shopping', emoji: '🛍️', spent: 44, total: 300, color: '#AF52DE' },
  { id: '6', name: 'Health', emoji: '💊', spent: 55, total: 100, color: '#5AC8FA' },
];

const TOTAL_SPENT = BUDGETS.reduce((s, b) => s + b.spent, 0);
const TOTAL_BUDGET = BUDGETS.reduce((s, b) => s + b.total, 0);

export default function BudgetsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Text variant="largeTitle">Budgets</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.fillPrimary }]}>
            <Text variant="headline" color={colors.tint}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={[styles.section, { marginTop: Spacing.sm }]}>
          <Card radius={Spacing.radius.xl} padding={Spacing.lg}>
            <Text variant="footnote" color={colors.labelSecondary}>This month</Text>
            <View style={styles.summaryRow}>
              <Text variant="title1">${TOTAL_SPENT.toLocaleString()}</Text>
              <Text variant="callout" color={colors.labelSecondary}>/ ${TOTAL_BUDGET.toLocaleString()}</Text>
            </View>
            {/* Overall progress */}
            <View style={[styles.progressTrack, { backgroundColor: colors.fillPrimary, marginTop: Spacing.sm }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: TOTAL_SPENT / TOTAL_BUDGET > 0.85 ? colors.expense : colors.tint,
                    width: `${Math.min((TOTAL_SPENT / TOTAL_BUDGET) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
            <Text variant="caption1" color={colors.labelSecondary} style={{ marginTop: Spacing.xs }}>
              {Math.round((TOTAL_SPENT / TOTAL_BUDGET) * 100)}% of monthly budget used
            </Text>
          </Card>
        </View>

        {/* Budget list */}
        <View style={[styles.section, { marginTop: Spacing.xl }]}>
          <Text variant="title3" style={styles.listHeader}>All Budgets</Text>
          <Card radius={Spacing.radius.lg} padding={0}>
            {BUDGETS.map((budget, index) => {
              const pct = (budget.spent / budget.total) * 100;
              const isOver = pct > 90;
              return (
                <View key={budget.id}>
                  <TouchableOpacity
                    style={[styles.budgetRow, { paddingHorizontal: Spacing.md }]}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.emoji, { backgroundColor: `${budget.color}18` }]}>
                      <Text variant="body" align="center">{budget.emoji}</Text>
                    </View>
                    <View style={styles.budgetContent}>
                      <View style={styles.budgetTop}>
                        <Text variant="callout" style={{ fontWeight: '500' }}>{budget.name}</Text>
                        <Text
                          variant="callout"
                          style={{ fontWeight: '600' }}
                          color={isOver ? colors.expense : colors.label}
                        >
                          ${budget.spent}
                          <Text variant="caption1" color={colors.labelSecondary}> / ${budget.total}</Text>
                        </Text>
                      </View>
                      <View style={[styles.progressTrack, { backgroundColor: colors.fillPrimary }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: isOver ? colors.expense : budget.color,
                              width: `${Math.min(pct, 100)}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                  {index < BUDGETS.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: 72 }]} />
                  )}
                </View>
              );
            })}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  addBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Spacing.radius.full,
  },
  section: { paddingHorizontal: Spacing.screenHorizontal },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginTop: 4,
  },
  listHeader: { marginBottom: Spacing.sm },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  emoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetContent: { flex: 1, gap: Spacing.xs },
  budgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth },
});
