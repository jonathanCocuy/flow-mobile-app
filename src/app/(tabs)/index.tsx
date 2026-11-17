import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import i18n from '@/i18n';
import { AddTransactionSheet } from '@/components/AddTransactionSheet';
import { EditTransactionSheet } from '@/components/EditTransactionSheet';
import { AddAccountSheet } from '@/components/AddAccountSheet';
import { AddBudgetSheet } from '@/components/AddBudgetSheet';
import { AddGoalSheet } from '@/components/AddGoalSheet';
import { GettingStartedChecklist } from '@/components/GettingStartedChecklist';
import { BalanceFlipCard } from '@/components/BalanceFlipCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { BudgetWithProgress, DashboardTransaction, UserCategory } from '@/types/finance';

type AppColors = typeof Colors[keyof typeof Colors];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `$${(Math.abs(value) / 1_000_000).toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `$${(Math.abs(value) / 1_000).toFixed(1)}k`;
  }
  const formatted = Math.abs(value).toLocaleString(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${formatted}`;
}

function formatTxDate(dateStr: string): string {
  if (!dateStr) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (dateStr === todayStr) return i18n.t('common.today');
  if (dateStr === yesterdayStr) return i18n.t('common.yesterday');
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
}


function getCategoryLabel(category: string, categories: UserCategory[]): string {
  const cat = categories.find(c => c.name === category);
  return cat?.label ?? category;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path d="M10 4V16M4 10H16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function AddCircleIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ChartIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TargetIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function WalletIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7z" stroke={color} strokeWidth={1.8} />
      <Path d="M2 10h20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 15h2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowUpIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowDownIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M19 12l-7 7-7-7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PiggyBankIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      {/* Body */}
      <Path d="M9.5 7C9.5 9.5 8.3 11 7 11C5.7 11 2.5 9.8 2.5 7C2.5 4.2 4.5 3 7 3C8.3 3 9.5 4.5 9.5 7Z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      {/* Snout */}
      <Path d="M9.5 6.2C10 5.5 12 5.5 12.5 7C13 8.5 11 9.2 9.5 7.8"
        stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
      {/* Coin slot on top */}
      <Path d="M5.5 3L8.5 3" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
      {/* Eye */}
      <Path d="M6.5 6.8L6.5 6.8" stroke={color} strokeWidth={2} strokeLinecap="round"/>
      {/* Legs */}
      <Path d="M4.5 11L4 13M7.5 11L7.5 13" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
    </Svg>
  );
}

function TrendArrow({ up, color }: { up: boolean; color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d={up ? 'M7 17L17 7M17 7H7M17 7v10' : 'M7 7l10 10M17 17H7M17 17V7'}
        stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { data, loading, refetch } = useDashboard();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTx, setEditTx] = useState<DashboardTransaction | null>(null);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? '';

  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12 ? t('dashboard.greeting.morning')
    : hour >= 12 && hour < 17 ? t('dashboard.greeting.afternoon')
    : t('dashboard.greeting.evening');

  // Balance card — always dark, elevated in dark mode
  const cardBg = colorScheme === 'dark' ? '#262626' : '#171717';
  const cardBorder = colorScheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'transparent';
  const cardText = '#fafafa';
  const cardTextSub = 'rgba(250,250,250,0.55)';
  const chipBg = 'rgba(255,255,255,0.09)';
  const chipBorder = 'rgba(255,255,255,0.13)';

  const savings = data.currentMonthIncome - data.currentMonthExpenses;

  const quickActions = [
    { key: 'add',       label: t('dashboard.action.add'),       icon: (c: string) => <AddCircleIcon color={c} />, onPress: () => setSheetOpen(true) },
    { key: 'accounts',  label: t('dashboard.action.accounts'),  icon: (c: string) => <WalletIcon color={c} />,   onPress: () => router.push('/accounts') },
    { key: 'addBudget', label: t('dashboard.action.addBudget'), icon: (c: string) => <ChartIcon color={c} />,    onPress: () => setBudgetSheetOpen(true) },
    { key: 'addGoal',   label: t('dashboard.action.addGoal'),   icon: (c: string) => <TargetIcon color={c} />,   onPress: () => setGoalSheetOpen(true) },
  ];

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
              {greeting}{firstName ? `, ${firstName}` : ''}
            </Text>
            <Text variant="title2">FlowX</Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            activeOpacity={0.8}
            onPress={() => setSheetOpen(true)}
          >
            <PlusIcon color={colors.tintForeground} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.section}>
          <BalanceFlipCard
            accounts={data.accounts}
            cardBg={cardBg}
            cardBorder={cardBorder}
            frontContent={
              <View style={styles.balancePadding}>
                {/* Label */}
                <Text variant="footnote" color={cardTextSub} align="center">
                  {t('dashboard.totalBalance')}
                </Text>

                {/* Balance amount */}
                {loading ? (
                  <View style={styles.balanceSkeleton}>
                    <Skeleton width={180} height={40} radius={10} />
                  </View>
                ) : (
                  <Text variant="displayMedium" color={cardText} align="center" style={styles.balanceAmount}>
                    {formatCurrency(data.totalBalance)}
                  </Text>
                )}

                {/* Net savings badge */}
                {!loading && (
                  <View style={styles.savingsBadge}>
                    <TrendArrow up={savings >= 0} color={savings >= 0 ? colors.income : colors.expense} />
                    <Text variant="caption1" color={savings >= 0 ? colors.income : colors.expense}>
                      {savings >= 0 ? '+' : ''}{formatCurrency(savings, true)} {t('dashboard.thisMonth')}
                    </Text>
                  </View>
                )}

                {/* Floating stat chips */}
                <View style={styles.chipRow}>
                  <StatChip
                    label={t('dashboard.income')}
                    value={loading ? '—' : formatCurrency(data.currentMonthIncome, true)}
                    accent={colors.income}
                    chipBg={chipBg}
                    chipBorder={chipBorder}
                    icon={<ArrowUpIcon color={colors.income} />}
                  />
                  <StatChip
                    label={t('dashboard.expenses')}
                    value={loading ? '—' : formatCurrency(Math.abs(data.currentMonthExpenses), true)}
                    accent={colors.expense}
                    chipBg={chipBg}
                    chipBorder={chipBorder}
                    icon={<ArrowDownIcon color={colors.expense} />}
                  />
                  <StatChip
                    label={t('dashboard.savings')}
                    value={loading ? '—' : formatCurrency(Math.abs(savings), true)}
                    accent={colors.savings}
                    chipBg={chipBg}
                    chipBorder={chipBorder}
                    icon={<PiggyBankIcon color={colors.savings} />}
                  />
                </View>
              </View>
            }
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickAction}
                activeOpacity={0.7}
                onPress={action.onPress}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.fillPrimary }]}>
                  {action.icon(colors.tint)}
                </View>
                <Text variant="caption1" color={colors.labelSecondary} style={styles.quickActionLabel}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Getting Started Checklist */}
        {!loading && (
          <View style={styles.section}>
            <GettingStartedChecklist
              hasAccounts={data.accounts.length > 0}
              hasTransactions={data.hasTransactions}
              hasBudgets={data.hasBudgets}
              hasGoals={data.hasGoals}
              onAddAccount={() => setAccountSheetOpen(true)}
              onAddTransaction={() => setSheetOpen(true)}
              onAddBudget={() => setBudgetSheetOpen(true)}
              onAddGoal={() => setGoalSheetOpen(true)}
            />
          </View>
        )}

        {/* Budget Overview */}
        {(loading || data.budgets.length > 0) && (
          <View style={styles.sectionWithHeader}>
            <View style={styles.sectionHeader}>
              <Text variant="title3">{t('dashboard.budgets')}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/budgets')}>
                <Text variant="subheadline" color={colors.tint}>{t('dashboard.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            <Card radius={Spacing.radius.lg} padding={0}>
              {loading ? (
                <View style={{ paddingVertical: Spacing.xs }}>
                  {([1, 2] as const).map((i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, gap: Spacing.sm }}>
                      <Skeleton width={40} height={40} radius={20} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Skeleton width="45%" height={13} radius={7} />
                          <Skeleton width="22%" height={13} radius={7} />
                        </View>
                        <Skeleton width="100%" height={5} radius={3} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                data.budgets.map((budget, index) => (
                  <BudgetRow
                    key={budget.id}
                    budget={budget}
                    categories={data.categories}
                    colors={colors}
                    isLast={index === data.budgets.length - 1}
                  />
                ))
              )}
            </Card>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={[styles.sectionWithHeader, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text variant="title3">{t('dashboard.recentTransactions')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text variant="subheadline" color={colors.tint}>{t('dashboard.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          <Card radius={Spacing.radius.lg} padding={0}>
            {loading ? (
              <View style={{ paddingVertical: Spacing.xs }}>
                {([1, 2, 3] as const).map((i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm }}>
                    <Skeleton width={40} height={40} radius={20} />
                    <View style={{ flex: 1, gap: 5 }}>
                      <Skeleton width="52%" height={13} radius={7} />
                      <Skeleton width="38%" height={12} radius={6} />
                    </View>
                    <Skeleton width={56} height={13} radius={7} />
                  </View>
                ))}
              </View>
            ) : data.recentTransactions.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text variant="callout" color={colors.labelTertiary} align="center">
                  {t('dashboard.noTransactions')}
                </Text>
              </View>
            ) : (
              data.recentTransactions.map((tx, index) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  categories={data.categories}
                  colors={colors}
                  isLast={index === data.recentTransactions.length - 1}
                  onPress={() => setEditTx(tx)}
                />
              ))
            )}
          </Card>
        </View>
      </ScrollView>

      <AddTransactionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => { setSheetOpen(false); refetch(); }}
        accounts={data.accounts}
        categories={data.categories}
      />
      <EditTransactionSheet
        visible={!!editTx}
        transaction={editTx}
        onClose={() => setEditTx(null)}
        onSuccess={() => { setEditTx(null); refetch(); }}
        accounts={data.accounts}
        categories={data.categories}
      />
      <AddAccountSheet
        visible={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSuccess={() => { setAccountSheetOpen(false); refetch(); }}
      />
      <AddBudgetSheet
        visible={budgetSheetOpen}
        onClose={() => setBudgetSheetOpen(false)}
        onSuccess={() => { setBudgetSheetOpen(false); refetch(); }}
        categories={data.categories}
      />
      <AddGoalSheet
        visible={goalSheetOpen}
        onClose={() => setGoalSheetOpen(false)}
        onSuccess={() => { setGoalSheetOpen(false); refetch(); }}
      />
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatChip({
  label, value, accent, chipBg, chipBorder, icon, elevated,
}: {
  label: string;
  value: string;
  accent: string;
  chipBg: string;
  chipBorder: string;
  icon: React.ReactNode;
  elevated?: boolean;
}) {
  return (
    <View style={[
      chipStyles.chip,
      { backgroundColor: chipBg, borderColor: chipBorder },
      elevated && { transform: [{ translateY: -10 }] },
    ]}>
      <View style={[chipStyles.iconBox, { backgroundColor: `${accent}22` }]}>
        {icon}
      </View>
      <Text variant="caption2" color="rgba(250,250,250,0.55)">{label}</Text>
      <Text variant="footnote" color="#fafafa" style={{ fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function BudgetRow({
  budget,
  categories,
  colors,
  isLast,
}: {
  budget: BudgetWithProgress;
  categories: UserCategory[];
  colors: AppColors;
  isLast: boolean;
}) {
  const pct = Math.min(budget.percentage, 100);
  const barColor = budget.isOverBudget ? colors.expense : budget.percentage > 80 ? colors.tintOrange : colors.tintGreen;
  const label = getCategoryLabel(budget.category, categories);

  return (
    <>
      <View style={[styles.budgetItem, { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 }]}>
        <View style={styles.budgetLeft}>
          <Text variant="callout">{label}</Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.fillPrimary }]}>
            <View style={[styles.progressFill, { backgroundColor: barColor, width: `${pct}%` }]} />
          </View>
        </View>
        <View style={styles.budgetRight}>
          <Text variant="callout" style={{ fontWeight: '600' }}>
            {formatCurrency(budget.spent, true)}
          </Text>
          <Text variant="caption1" color={colors.labelSecondary}>
            {i18n.t('common.of')} {formatCurrency(budget.monthly_limit, true)}
          </Text>
        </View>
      </View>
      {!isLast && (
        <View style={[styles.insetDivider, { backgroundColor: colors.separator, marginLeft: Spacing.md }]} />
      )}
    </>
  );
}

function TransactionRow({
  tx,
  categories,
  colors,
  isLast,
  onPress,
}: {
  tx: DashboardTransaction;
  categories: UserCategory[];
  colors: AppColors;
  isLast: boolean;
  onPress: () => void;
}) {
  const emoji = getCategoryEmoji(tx.category, tx.type);
  const label = getCategoryLabel(tx.category, categories);
  const displayAmount = tx.amount * (tx.exchange_rate ?? 1);
  const isIncome = tx.type === 'income';

  return (
    <>
      <TouchableOpacity
        style={[styles.txItem, { paddingHorizontal: Spacing.md }]}
        activeOpacity={0.6}
        onPress={onPress}
      >
        <View style={[styles.txIcon, { backgroundColor: isIncome ? `${colors.income}18` : colors.fillTertiary }]}>
          <Text variant="footnote" align="center">{emoji}</Text>
        </View>
        <View style={styles.txMiddle}>
          <Text variant="callout" style={{ fontWeight: '500' }}>{tx.description}</Text>
          <Text variant="caption1" color={colors.labelSecondary}>{label}</Text>
        </View>
        <View style={styles.txRight}>
          <Text
            variant="callout"
            style={{ fontWeight: '600' }}
            color={isIncome ? colors.income : tx.type === 'transfer' ? colors.savings : colors.expense}
          >
            {isIncome ? '+' : tx.type === 'transfer' ? '' : '-'}{formatCurrency(displayAmount)}
          </Text>
          <Text variant="caption2" color={colors.labelTertiary}>{formatTxDate(tx.date)}</Text>
        </View>
      </TouchableOpacity>
      {!isLast && (
        <View style={[styles.insetDivider, { backgroundColor: colors.separator, marginLeft: 72 }]} />
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 24 },
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
  lastSection: { marginBottom: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  balanceCard: { overflow: 'hidden' },
  balancePadding: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  balanceSkeleton: {
    height: 56,
    justifyContent: 'center',
    marginVertical: Spacing.xs,
  },
  balanceAmount: {
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
    marginTop: 4,
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
  quickActionLabel: { marginTop: 2 },
  loadingRow: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyRow: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  budgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  budgetLeft: { flex: 1, gap: Spacing.xs },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  budgetRight: { alignItems: 'flex-end' },
  insetDivider: { height: StyleSheet.hairlineWidth },
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
  txMiddle: { flex: 1, gap: 2 },
  txRight: { alignItems: 'flex-end', gap: 2 },
});
