import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';

// ── Icons ─────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronLeft({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthData {
  month: number;
  income: number;
  expenses: number;
}

interface CategoryStat {
  name: string;
  icon: string;
  color: string;
  total: number;
  percentage: number;
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

const MONTH_ABBREVS = ['J','F','M','A','M','J','J','A','S','O','N','D'];
const CHART_H = 160;
const CHART_W = 320;
const BAR_GROUP = CHART_W / 12;
const BAR_W = (BAR_GROUP - 8) / 2;

function BarChart({ data, incomeColor, expenseColor }: {
  data: MonthData[];
  incomeColor: string;
  expenseColor: string;
}) {
  const max = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);

  return (
    <Svg width="100%" height={CHART_H + 24} viewBox={`0 0 ${CHART_W} ${CHART_H + 24}`}>
      {data.map((d, i) => {
        const x = i * BAR_GROUP + 4;
        const incH = Math.max(2, (d.income / max) * CHART_H);
        const expH = Math.max(2, (d.expenses / max) * CHART_H);
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={CHART_H - incH}
              width={BAR_W}
              height={incH}
              fill={incomeColor + 'CC'}
              rx={2}
            />
            <Rect
              x={x + BAR_W + 2}
              y={CHART_H - expH}
              width={BAR_W}
              height={expH}
              fill={expenseColor + 'CC'}
              rx={2}
            />
            <SvgText
              x={x + BAR_GROUP / 2 - 4}
              y={CHART_H + 16}
              fontSize={9}
              fill={expenseColor}
              textAnchor="middle"
              opacity={0.7}
            >
              {MONTH_ABBREVS[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card style={styles.kpiCard} radius={Spacing.radius.lg} padding={Spacing.md}>
      <Text variant="caption1" color={color}>{label}</Text>
      <Text variant="subheadline" style={{ fontWeight: '700', marginTop: 4 }} numberOfLines={1}>{value}</Text>
    </Card>
  );
}

// ── Format ────────────────────────────────────────────────────────────────────

function fmtCOP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function fmtRate(r: number): string {
  return `${r >= 0 ? '' : ''}${r.toFixed(1)}%`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ReportsSkeleton() {
  return (
    <View style={{ gap: Spacing.xl, marginTop: Spacing.md }}>
      <View style={styles.kpiRow}>
        {[1, 2].map(i => (
          <Card key={i} style={styles.kpiCard} radius={Spacing.radius.lg} padding={Spacing.md}>
            <Skeleton width={60} height={12} radius={6} />
            <Skeleton width={80} height={18} radius={6} style={{ marginTop: 6 }} />
          </Card>
        ))}
      </View>
      <View style={styles.kpiRow}>
        {[1, 2].map(i => (
          <Card key={i} style={styles.kpiCard} radius={Spacing.radius.lg} padding={Spacing.md}>
            <Skeleton width={60} height={12} radius={6} />
            <Skeleton width={80} height={18} radius={6} style={{ marginTop: 6 }} />
          </Card>
        ))}
      </View>
      <View style={{ paddingHorizontal: Spacing.screenHorizontal }}>
        <Skeleton width="100%" height={184} radius={Spacing.radius.lg} />
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryStat[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const [txRes, catRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('type, amount, date, category')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .neq('type', 'transfer'),
        supabase
          .from('categories')
          .select('id, label, icon, color')
          .eq('user_id', user.id),
      ]);

      const transactions = txRes.data ?? [];
      const catMap = Object.fromEntries((catRes.data ?? []).map(c => [c.id, c]));

      // Build monthly buckets
      const buckets: MonthData[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expenses: 0 }));
      const catTotals: Record<string, number> = {};
      let totalExpenses = 0;

      for (const tx of transactions) {
        const m = new Date(tx.date + 'T00:00:00').getMonth();
        if (tx.type === 'income') {
          buckets[m].income += tx.amount;
        } else {
          buckets[m].expenses += tx.amount;
          totalExpenses += tx.amount;
          if (tx.category) catTotals[tx.category] = (catTotals[tx.category] ?? 0) + tx.amount;
        }
      }

      setMonthlyData(buckets);

      const topCats: CategoryStat[] = Object.entries(catTotals)
        .map(([id, total]) => {
          const cat = catMap[id];
          return {
            name: cat?.label ?? id,
            icon: cat?.icon ?? '•',
            color: cat?.color ?? colors.labelSecondary,
            total,
            percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
          };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);

      setTopCategories(topCats);
    } finally {
      setLoading(false);
    }
  }, [user, year]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const totalIncome = monthlyData.reduce((s, d) => s + d.income, 0);
  const totalExpenses = monthlyData.reduce((s, d) => s + d.expenses, 0);
  const totalSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const hasData = totalIncome > 0 || totalExpenses > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <BackIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="headline" style={{ flex: 1 }} align="center">{t('reports.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Year selector */}
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => setYear(y => y - 1)} hitSlop={12} activeOpacity={0.7}>
            <ChevronLeft color={colors.tint} />
          </TouchableOpacity>
          <Text variant="title3" style={{ marginHorizontal: Spacing.md }}>{year}</Text>
          <TouchableOpacity onPress={() => setYear(y => y + 1)} hitSlop={12} activeOpacity={0.7} disabled={year >= new Date().getFullYear()}>
            <ChevronRight color={year >= new Date().getFullYear() ? colors.labelTertiary : colors.tint} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ReportsSkeleton />
        ) : !hasData ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text variant="callout" align="center" color={colors.labelSecondary}>{t('reports.noData')}</Text>
          </View>
        ) : (
          <>
            {/* KPI Grid */}
            <View style={styles.kpiRow}>
              <KpiCard label={t('reports.totalIncome')} value={fmtCOP(totalIncome)} color={colors.income} />
              <KpiCard label={t('reports.totalExpenses')} value={fmtCOP(totalExpenses)} color={colors.expense} />
            </View>
            <View style={[styles.kpiRow, { marginTop: Spacing.sm }]}>
              <KpiCard label={t('reports.totalSavings')} value={fmtCOP(totalSavings)} color={totalSavings >= 0 ? colors.income : colors.expense} />
              <KpiCard label={t('reports.savingsRate')} value={fmtRate(savingsRate)} color={savingsRate >= 0 ? colors.income : colors.expense} />
            </View>

            {/* Bar chart */}
            <View style={styles.chartSection}>
              <Text variant="title3" style={{ marginBottom: Spacing.sm }}>{t('reports.byMonth')}</Text>
              <Card radius={Spacing.radius.lg} padding={Spacing.md}>
                <BarChart data={monthlyData} incomeColor={colors.income} expenseColor={colors.expense} />
                <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.income + 'CC' }} />
                    <Text variant="caption1" color={colors.labelSecondary}>{t('reports.income')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.expense + 'CC' }} />
                    <Text variant="caption1" color={colors.labelSecondary}>{t('reports.expenses')}</Text>
                  </View>
                </View>
              </Card>
            </View>

            {/* Top categories */}
            {topCategories.length > 0 && (
              <View style={styles.chartSection}>
                <Text variant="title3" style={{ marginBottom: Spacing.sm }}>{t('reports.topCategories')}</Text>
                <Card radius={Spacing.radius.lg} padding={0}>
                  {topCategories.map((cat, i) => (
                    <View key={i}>
                      <View style={styles.catRow}>
                        <View style={[styles.catDot, { backgroundColor: cat.color }]}>
                          <Text variant="caption1" align="center">{cat.icon}</Text>
                        </View>
                        <Text variant="callout" style={{ flex: 1 }} numberOfLines={1}>{cat.name}</Text>
                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                          <Text variant="callout" style={{ fontWeight: '600' }}>{fmtCOP(cat.total)}</Text>
                          <Text variant="caption2" color={colors.labelSecondary}>{cat.percentage.toFixed(1)}%</Text>
                        </View>
                      </View>
                      {/* Progress bar */}
                      <View style={{ marginHorizontal: Spacing.md, marginBottom: 10 }}>
                        <View style={{ height: 3, backgroundColor: colors.separator, borderRadius: 2 }}>
                          <View style={{ height: 3, width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.color, borderRadius: 2 }} />
                        </View>
                      </View>
                      {i < topCategories.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 60 }} />}
                    </View>
                  ))}
                </Card>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  backBtn: { width: 32 },
  scroll: { paddingBottom: 40 },
  yearRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm, marginBottom: Spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  kpiCard: { flex: 1 },
  chartSection: { paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.xl },
  emptyState: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: 60, alignItems: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4, gap: Spacing.sm,
  },
  catDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
