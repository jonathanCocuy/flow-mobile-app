import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { AddBudgetSheet } from '@/components/AddBudgetSheet';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import { Skeleton } from '@/components/ui/Skeleton';
import type { UserCategory } from '@/types/finance';

type AppColors = typeof Colors[keyof typeof Colors];

type BudgetRow = {
  id: string;
  category: string;
  monthly_limit: number;
  rollover_enabled: boolean;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
};

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function BudgetsSkeleton({ colors }: { colors: AppColors }) {
  return (
    <View style={{ gap: Spacing.xl, marginTop: Spacing.sm }}>
      <View style={{ paddingHorizontal: Spacing.screenHorizontal }}>
        <Card radius={Spacing.radius.xl} padding={Spacing.lg}>
          <Skeleton width={80} height={12} radius={6} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs, marginTop: 6 }}>
            <Skeleton width={120} height={28} radius={6} />
            <Skeleton width={70} height={16} radius={6} />
          </View>
          <Skeleton width="100%" height={5} radius={3} style={{ marginTop: 12 }} />
          <Skeleton width={100} height={12} radius={6} style={{ marginTop: 8 }} />
        </Card>
      </View>

      <View style={{ paddingHorizontal: Spacing.screenHorizontal }}>
        <Skeleton width={110} height={16} radius={8} style={{ marginBottom: Spacing.sm }} />
        <Card radius={Spacing.radius.lg} padding={0}>
          {([1, 2, 3] as const).map((i) => (
            <View key={i}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, gap: Spacing.sm }}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Skeleton width="45%" height={14} radius={7} />
                    <Skeleton width="22%" height={14} radius={7} />
                  </View>
                  <Skeleton width="100%" height={5} radius={3} />
                  <Skeleton width="38%" height={12} radius={6} />
                </View>
              </View>
              {i < 3 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 72 }} />}
            </View>
          ))}
        </Card>
      </View>
    </View>
  );
}

function barColor(pct: number, colors: AppColors): string {
  if (pct >= 100) return colors.expense;
  if (pct >= 80) return colors.tintOrange;
  return colors.income;
}

export default function BudgetsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [editBudget, setEditBudget] = useState<{ id: string; category: string; monthly_limit: number } | null>(null);
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0];

      const [budgetsRes, txRes, catsRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('id, category, monthly_limit, rollover_enabled')
          .eq('user_id', user.id),
        supabase
          .from('transactions')
          .select('category, amount, exchange_rate')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gte('date', startOfMonth),
        supabase
          .from('categories')
          .select('id, name, label, color, icon')
          .eq('user_id', user.id),
      ]);

      const spentByCategory: Record<string, number> = {};
      (txRes.data ?? []).forEach(tx => {
        spentByCategory[tx.category] =
          (spentByCategory[tx.category] ?? 0) + tx.amount * (tx.exchange_rate ?? 1);
      });

      const rows: BudgetRow[] = (budgetsRes.data ?? [])
        .map(b => {
          const spent = spentByCategory[b.category] ?? 0;
          const remaining = b.monthly_limit - spent;
          const percentage = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0;
          return {
            ...b,
            rollover_enabled: b.rollover_enabled ?? false,
            spent,
            remaining,
            percentage,
            isOverBudget: spent > b.monthly_limit,
          };
        })
        .sort((a, b) => b.percentage - a.percentage);

      setBudgets(rows);
      setCategories(catsRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const getCategoryInfo = (catName: string) => {
    const cat = categories.find(c => c.name === catName);
    return { label: cat?.label ?? catName, color: cat?.color ?? '#8b5cf6' };
  };

  const handleEdit = (budget: BudgetRow) => {
    setEditBudget({ id: budget.id, category: budget.category, monthly_limit: budget.monthly_limit });
    setAddSheetVisible(true);
  };

  const handleAdd = () => {
    setEditBudget(null);
    setAddSheetVisible(true);
  };

  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalLimit = budgets.reduce((s, b) => s + b.monthly_limit, 0);
  const overallPct = totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Text variant="largeTitle">{t('tabs.budgets')}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.fillPrimary }]}
            onPress={handleAdd}
            activeOpacity={0.7}
          >
            <PlusIcon color={colors.tint} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <BudgetsSkeleton colors={colors} />
        ) : budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text variant="callout" align="center" color={colors.labelSecondary}>
              {t('budgets.empty')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
              onPress={handleAdd}
              activeOpacity={0.85}
            >
              <Text variant="callout" color={colors.tintForeground}>{t('budget.add')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary card */}
            <View style={[styles.section, { marginTop: Spacing.sm }]}>
              <Card radius={Spacing.radius.xl} padding={Spacing.lg}>
                <Text variant="footnote" color={colors.labelSecondary}>{t('budgets.thisMonth')}</Text>
                <View style={styles.summaryRow}>
                  <Text variant="title1">
                    ${totalSpent.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                  <Text variant="callout" color={colors.labelSecondary}>
                    {'/ $'}{totalLimit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.fillPrimary, marginTop: Spacing.sm }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${overallPct}%`, backgroundColor: barColor(overallPct, colors) },
                    ]}
                  />
                </View>
                <Text variant="caption1" color={colors.labelSecondary} style={{ marginTop: Spacing.xs }}>
                  {Math.round(overallPct)}% {t('budgets.usedLabel')}
                </Text>
              </Card>
            </View>

            {/* Budget list */}
            <View style={[styles.section, { marginTop: Spacing.xl }]}>
              <Text variant="title3" style={{ marginBottom: Spacing.sm }}>{t('budgets.allBudgets')}</Text>
              <Card radius={Spacing.radius.lg} padding={0}>
                {budgets.map((budget, index) => {
                  const { label, color } = getCategoryInfo(budget.category);
                  const pct = budget.percentage;
                  const fillColor = barColor(pct, colors);
                  return (
                    <View key={budget.id}>
                      <TouchableOpacity
                        style={[styles.budgetRow, { paddingHorizontal: Spacing.md }]}
                        onPress={() => handleEdit(budget)}
                        activeOpacity={0.6}
                      >
                        <View style={[styles.emoji, { backgroundColor: `${color}18` }]}>
                          <Text variant="body" align="center">
                            {getCategoryEmoji(budget.category, 'expense')}
                          </Text>
                        </View>
                        <View style={styles.budgetContent}>
                          <View style={styles.budgetTop}>
                            <Text variant="callout" style={{ fontWeight: '500' }}>{label}</Text>
                            <Text
                              variant="callout"
                              style={{ fontWeight: '600' }}
                              color={budget.isOverBudget ? colors.expense : colors.label}
                            >
                              ${budget.spent.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              <Text variant="caption1" color={colors.labelSecondary}>
                                {' / $'}{budget.monthly_limit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              </Text>
                            </Text>
                          </View>
                          <View style={[styles.progressTrack, { backgroundColor: colors.fillPrimary }]}>
                            <View
                              style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: fillColor }]}
                            />
                          </View>
                          <Text
                            variant="caption1"
                            color={budget.isOverBudget ? colors.expense : colors.labelSecondary}
                          >
                            {budget.isOverBudget
                              ? `$${Math.abs(budget.remaining).toLocaleString('en-US', { maximumFractionDigits: 0 })} ${t('budgets.overspent')}`
                              : `$${budget.remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${t('budgets.remaining')}`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {index < budgets.length - 1 && (
                        <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: 72 }]} />
                      )}
                    </View>
                  );
                })}
              </Card>
            </View>
          </>
        )}
      </ScrollView>

      <AddBudgetSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onSuccess={() => { setAddSheetVisible(false); fetchData(); }}
        onDelete={async (id) => {
          await supabase.from('budgets').delete().eq('id', id);
          setAddSheetVisible(false);
          fetchData();
        }}
        categories={categories}
        initialBudget={editBudget}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  centered: { padding: 40, alignItems: 'center' },
  emptyState: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: 60, alignItems: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyBtn: { marginTop: 16, paddingHorizontal: Spacing.lg, paddingVertical: 12, borderRadius: Spacing.radius.full },
  section: { paddingHorizontal: Spacing.screenHorizontal },
  summaryRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs, marginTop: 4,
  },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  budgetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm + 2, gap: Spacing.sm,
  },
  emoji: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  budgetContent: { flex: 1, gap: 4 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth },
});
