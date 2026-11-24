import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Rect, Text as SvgText, G } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { RefreshScrollView } from '@/components/ui/RefreshScrollView';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon, isKnownIcon } from '@/components/ui/Icon';

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

const MONTH_ABBREVS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CHART_H = 160;
const BAR_GROUP_W = 56;
const BAR_W = 14;
const BAR_GAP = 4;
const CHART_TOTAL_W = BAR_GROUP_W * 12;

function InteractiveBarChart({ data, incomeColor, expenseColor, labelColor, selected, onSelect }: {
  data: MonthData[];
  incomeColor: string;
  expenseColor: string;
  labelColor: string;
  selected: number | null;
  onSelect: (i: number | null) => void;
}) {
  const max = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);
  const barStart = (BAR_GROUP_W - BAR_W * 2 - BAR_GAP) / 2;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
      <Svg width={CHART_TOTAL_W} height={CHART_H + 32}>
        {data.map((d, i) => {
          const gx = i * BAR_GROUP_W;
          const x = gx + barStart;
          const incH = Math.max(3, (d.income / max) * CHART_H);
          const expH = Math.max(3, (d.expenses / max) * CHART_H);
          const isSel = selected === i;

          return (
            <React.Fragment key={i}>
              {/* Full-height tap target + highlight background */}
              <Rect
                x={gx + 2}
                y={0}
                width={BAR_GROUP_W - 4}
                height={CHART_H + 24}
                fill={isSel ? incomeColor + '18' : 'transparent'}
                rx={6}
                onPress={() => onSelect(isSel ? null : i)}
              />
              {/* Income bar */}
              <Rect
                x={x}
                y={CHART_H - incH}
                width={BAR_W}
                height={incH}
                fill={incomeColor + (isSel ? 'FF' : 'BB')}
                rx={3}
                onPress={() => onSelect(isSel ? null : i)}
              />
              {/* Expense bar */}
              <Rect
                x={x + BAR_W + BAR_GAP}
                y={CHART_H - expH}
                width={BAR_W}
                height={expH}
                fill={expenseColor + (isSel ? 'FF' : 'BB')}
                rx={3}
                onPress={() => onSelect(isSel ? null : i)}
              />
              {/* Month label */}
              <SvgText
                x={gx + BAR_GROUP_W / 2}
                y={CHART_H + 20}
                fontSize={10}
                fill={isSel ? incomeColor : labelColor}
                fontWeight={isSel ? 'bold' : 'normal'}
                textAnchor="middle"
                opacity={isSel ? 1 : 0.65}
              >
                {MONTH_ABBREVS[i]}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
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

// ── Donut Chart ───────────────────────────────────────────────────────────────

const DONUT_SIZE = 160;
const OUTER_R = 68;
const INNER_R = 44;
const CX = DONUT_SIZE / 2;
const CY = DONUT_SIZE / 2;

function polar(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  };
}

function donutSegment(cx: number, cy: number, ro: number, ri: number, start: number, end: number): string {
  const o1 = polar(cx, cy, ro, start);
  const o2 = polar(cx, cy, ro, end);
  const i1 = polar(cx, cy, ri, start);
  const i2 = polar(cx, cy, ri, end);
  const large = end - start > Math.PI ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${ro} ${ro} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    `A ${ri} ${ri} 0 ${large} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

interface DonutSlice {
  color: string;
  name: string;
  pct: number;
}

const GAP = 0.025;

function buildSegments(slices: DonutSlice[]) {
  let angle = 0;
  return slices.map(slice => {
    const sweep = (slice.pct / 100) * (2 * Math.PI - GAP * slices.length);
    const start = angle + GAP / 2;
    const end = start + sweep;
    angle = end + GAP / 2;
    return { path: donutSegment(CX, CY, OUTER_R, INNER_R, start, end), color: slice.color };
  });
}

function DonutChart({ slices, centerLabel, centerSub }: { slices: DonutSlice[]; centerLabel: string; centerSub: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const segments = buildSegments(slices);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        {segments.map((seg, i) => (
          <G key={i}>
            <Path d={seg.path} fill={seg.color} />
          </G>
        ))}
        {/* Center text */}
        <SvgText x={CX} y={CY - 8} fontSize={15} fontWeight="bold" fill={colors.label} textAnchor="middle">
          {centerLabel}
        </SvgText>
        <SvgText x={CX} y={CY + 10} fontSize={10} fill={colors.labelSecondary} textAnchor="middle">
          {centerSub}
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={{ flex: 1, gap: 7 }}>
        {slices.map((slice, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: slice.color, flexShrink: 0 }} />
            <Text variant="caption1" style={{ flex: 1 }} numberOfLines={1}>{slice.name}</Text>
            <Text variant="caption1" style={{ fontWeight: '700', color: slice.color }}>
              {slice.pct.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Format ────────────────────────────────────────────────────────────────────

function fmtCOP(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${Math.round(abs)}`;
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
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
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
          .select('id, name, label, icon, color')
          .eq('user_id', user.id),
      ]);

      const transactions = txRes.data ?? [];
      const catList = catRes.data ?? [];
      const catMap: Record<string, typeof catList[0]> = {};
      for (const c of catList) {
        catMap[c.id] = c;
        if (c.name) catMap[c.name] = c;
      }

      // Build monthly buckets
      const buckets: MonthData[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expenses: 0 }));
      const catTotals: Record<string, number> = {};
      let totalExpenses = 0;

      for (const tx of transactions) {
        const m = parseInt(tx.date.substring(5, 7), 10) - 1;
        if (m < 0 || m > 11) continue;
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

  const donutSlices: DonutSlice[] = (() => {
    if (topCategories.length === 0) return [];
    const TOP = 5;
    const top = topCategories.slice(0, TOP);
    const otherPct = topCategories.slice(TOP).reduce((s, c) => s + c.percentage, 0);
    const slices: DonutSlice[] = top.map(c => ({ color: c.color, name: c.name.charAt(0).toUpperCase() + c.name.slice(1), pct: c.percentage }));
    if (otherPct > 0.5) slices.push({ color: colors.labelSecondary, name: t('reports.other'), pct: otherPct });
    return slices;
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <BackIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="headline" style={{ flex: 1 }} align="center">{t('reports.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <RefreshScrollView onRefresh={() => fetchData(true)} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Year selector */}
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => { setYear(y => y - 1); setSelectedMonth(null); }} hitSlop={12} activeOpacity={0.7}>
            <ChevronLeft color={colors.tint} />
          </TouchableOpacity>
          <Text variant="title3" style={{ marginHorizontal: Spacing.md }}>{year}</Text>
          <TouchableOpacity onPress={() => { setYear(y => y + 1); setSelectedMonth(null); }} hitSlop={12} activeOpacity={0.7} disabled={year >= new Date().getFullYear()}>
            <ChevronRight color={year >= new Date().getFullYear() ? colors.labelTertiary : colors.tint} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ReportsSkeleton />
        ) : !hasData ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyEmoji}>
              <Icon name="BarChart3" size={40} color={colors.labelTertiary} strokeWidth={1.4} />
            </View>
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

            {/* Donut chart */}
            {donutSlices.length > 0 && (
              <View style={styles.chartSection}>
                <Text variant="title3" style={{ marginBottom: Spacing.sm }}>{t('reports.expensesByCategory')}</Text>
                <Card radius={Spacing.radius.lg} padding={Spacing.md}>
                  <DonutChart
                    slices={donutSlices}
                    centerLabel={fmtCOP(totalExpenses)}
                    centerSub={t('reports.expenses')}
                  />
                </Card>
              </View>
            )}

            {/* Bar chart */}
            <View style={styles.chartSection}>
              <Text variant="title3" style={{ marginBottom: Spacing.sm }}>{t('reports.byMonth')}</Text>
              <Card radius={Spacing.radius.lg} padding={0} style={{ overflow: 'hidden' }}>
                <View style={{ paddingTop: Spacing.md, paddingHorizontal: 4 }}>
                  <InteractiveBarChart
                    data={monthlyData}
                    incomeColor={colors.income}
                    expenseColor={colors.expense}
                    labelColor={colors.labelSecondary}
                    selected={selectedMonth}
                    onSelect={setSelectedMonth}
                  />
                </View>

                {/* Selected month detail */}
                {selectedMonth !== null && monthlyData[selectedMonth] && (
                  <View style={[styles.monthDetail, { borderTopColor: colors.separator }]}>
                    <Text variant="footnote" color={colors.labelSecondary} style={{ fontWeight: '600' }}>
                      {MONTH_ABBREVS[selectedMonth]} {year}
                    </Text>
                    <View style={styles.monthDetailRow}>
                      <View style={[styles.monthDetailDot, { backgroundColor: colors.income }]} />
                      <Text variant="caption1" color={colors.labelSecondary} style={{ flex: 1 }}>{t('reports.income')}</Text>
                      <Text variant="callout" color={colors.income} style={{ fontWeight: '600' }}>
                        {fmtCOP(monthlyData[selectedMonth].income)}
                      </Text>
                    </View>
                    <View style={styles.monthDetailRow}>
                      <View style={[styles.monthDetailDot, { backgroundColor: colors.expense }]} />
                      <Text variant="caption1" color={colors.labelSecondary} style={{ flex: 1 }}>{t('reports.expenses')}</Text>
                      <Text variant="callout" color={colors.expense} style={{ fontWeight: '600' }}>
                        {fmtCOP(monthlyData[selectedMonth].expenses)}
                      </Text>
                    </View>
                    <View style={styles.monthDetailRow}>
                      <View style={[styles.monthDetailDot, { backgroundColor: colors.savings }]} />
                      <Text variant="caption1" color={colors.labelSecondary} style={{ flex: 1 }}>{t('reports.savings')}</Text>
                      <Text
                        variant="callout"
                        style={{ fontWeight: '600' }}
                        color={(monthlyData[selectedMonth].income - monthlyData[selectedMonth].expenses) >= 0 ? colors.income : colors.expense}
                      >
                        {fmtCOP(monthlyData[selectedMonth].income - monthlyData[selectedMonth].expenses)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, marginTop: 4 }}>
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

            {/* Monthly breakdown table */}
            <View style={styles.chartSection}>
              <Text variant="title3" style={{ marginBottom: Spacing.sm }}>{t('reports.monthlyBreakdown')}</Text>
              <Card radius={Spacing.radius.lg} padding={0}>
                {/* Header */}
                <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: colors.separator }]}>
                  <Text variant="caption1" color={colors.labelSecondary} style={styles.tableColMonth}>{t('reports.month')}</Text>
                  <Text variant="caption1" color={colors.income} style={styles.tableColNum}>{t('reports.income')}</Text>
                  <Text variant="caption1" color={colors.expense} style={styles.tableColNum}>{t('reports.expenses')}</Text>
                  <Text variant="caption1" color={colors.labelSecondary} style={styles.tableColNum}>{t('reports.savings')}</Text>
                </View>
                {monthlyData.map((d, i) => {
                  const net = d.income - d.expenses;
                  const hasActivity = d.income > 0 || d.expenses > 0;
                  return (
                    <View key={i}>
                      <View style={styles.tableRow}>
                        <Text variant="caption1" style={[styles.tableColMonth, !hasActivity && { opacity: 0.4 }]}>{MONTH_ABBREVS[i]}</Text>
                        <Text variant="caption1" color={hasActivity ? colors.income : colors.labelTertiary} style={styles.tableColNum}>
                          {hasActivity ? fmtCOP(d.income) : '—'}
                        </Text>
                        <Text variant="caption1" color={hasActivity ? colors.expense : colors.labelTertiary} style={styles.tableColNum}>
                          {hasActivity ? fmtCOP(d.expenses) : '—'}
                        </Text>
                        <Text
                          variant="caption1"
                          style={[styles.tableColNum, { fontWeight: '600' }]}
                          color={!hasActivity ? colors.labelTertiary : net >= 0 ? colors.income : colors.expense}
                        >
                          {hasActivity ? fmtCOP(net) : '—'}
                        </Text>
                      </View>
                      {i < 11 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginHorizontal: Spacing.md }} />}
                    </View>
                  );
                })}
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
                          {isKnownIcon(cat.icon) ? (
                            <Icon name={cat.icon} size={18} color="#fff" />
                          ) : cat.icon && /[^\x20-\x7E]/.test(cat.icon) ? (
                            // Categories saved before the Lucide switch still hold an emoji.
                            <Text style={{ fontSize: 18, lineHeight: 22, textAlign: 'center' }}>{cat.icon}</Text>
                          ) : (
                            <Text style={{ fontSize: 14, fontWeight: '700', textAlign: 'center', color: '#fff' }}>
                              {cat.name.charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <Text variant="callout" style={{ flex: 1 }} numberOfLines={1}>{cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</Text>
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
      </RefreshScrollView>
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
  emptyEmoji: { marginBottom: 8 },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4, gap: Spacing.sm,
  },
  catDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  monthDetail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: 6,
  },
  monthDetailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  monthDetailDot: { width: 8, height: 8, borderRadius: 4 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 9,
  },
  tableHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableColMonth: { flex: 1.2 },
  tableColNum: { flex: 1.6, textAlign: 'right' },
});
