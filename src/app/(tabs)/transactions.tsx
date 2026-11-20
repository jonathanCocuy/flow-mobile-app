import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import i18n from '@/i18n';
import { useTransactions } from '@/hooks/useTransactions';
import { AddTransactionSheet } from '@/components/AddTransactionSheet';
import { EditTransactionSheet } from '@/components/EditTransactionSheet';
import { Icon, transactionIcon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import type { DashboardTransaction, DashboardAccount, UserCategory } from '@/types/finance';

type AppColors = typeof Colors[keyof typeof Colors];
type FilterKey = 'all' | 'income' | 'expense' | 'transfer';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(tx: DashboardTransaction): string {
  const val = Math.abs(tx.amount * tx.exchange_rate);
  const formatted = val.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (tx.type === 'income') return `+$${formatted}`;
  if (tx.type === 'transfer') return `$${formatted}`;
  return `-$${formatted}`;
}

function formatGroupDate(dateStr: string): string {
  if (!dateStr) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (dateStr === todayStr) return i18n.t('common.today');
  if (dateStr === yesterdayStr) return i18n.t('common.yesterday');
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(i18n.language, {
    weekday: 'long', month: 'short', day: 'numeric',
  });
}

function getCategoryLabel(category: string, categories: UserCategory[]): string {
  const cat = categories.find(c => c.name === category);
  return cat?.label ?? category;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TransactionsSkeleton({ colors }: { colors: AppColors }) {
  return (
    <View>
      {([0, 1] as const).map((groupIdx) => (
        <View key={groupIdx} style={{ paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.lg }}>
          <Skeleton width={groupIdx === 0 ? 44 : 160} height={12} radius={6} style={{ marginBottom: Spacing.xs, marginLeft: 2 }} />
          <Card radius={Spacing.radius.lg} padding={0}>
            {([0, 1, 2] as const).map((rowIdx) => (
              <View key={rowIdx}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm }}>
                  <Skeleton width={44} height={44} radius={22} />
                  <View style={{ flex: 1, gap: 5 }}>
                    <Skeleton width="55%" height={14} radius={7} />
                    <Skeleton width="40%" height={12} radius={6} />
                  </View>
                  <Skeleton width={60} height={14} radius={7} />
                </View>
                {rowIdx < 2 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 72 }} />}
              </View>
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function getAccountName(accountId: string, accounts: DashboardAccount[]): string {
  return accounts.find(a => a.id === accountId)?.name ?? '';
}

function TxRow({
  tx,
  isLast,
  colors,
  categories,
  accounts,
  onPress,
}: {
  tx: DashboardTransaction;
  isLast: boolean;
  colors: AppColors;
  categories: UserCategory[];
  accounts: DashboardAccount[];
  onPress: () => void;
}) {
  const iconName = transactionIcon(tx.icon, tx.type, tx.category);
  const label = getCategoryLabel(tx.category, categories);
  const accountName = getAccountName(tx.account_id, accounts);
  const secondaryLine = accountName ? `${label} · ${accountName}` : label;
  const amountStr = formatAmount(tx);
  const amountColor =
    tx.type === 'income' ? colors.income :
    tx.type === 'transfer' ? colors.savings :
    colors.expense;

  return (
    <View>
      <TouchableOpacity
        style={[styles.txRow, { paddingHorizontal: Spacing.md }]}
        activeOpacity={0.6}
        onPress={onPress}
      >
        <View style={[styles.txIcon, { backgroundColor: colors.fillTertiary }]}>
          <Icon name={iconName} size={19} color={colors.labelSecondary} />
        </View>
        <View style={styles.txMiddle}>
          <Text variant="callout" style={{ fontWeight: '500' }}>{tx.description}</Text>
          <Text variant="caption1" color={colors.labelSecondary}>{secondaryLine}</Text>
        </View>
        <Text variant="callout" style={{ fontWeight: '600' }} color={amountColor}>
          {amountStr}
        </Text>
      </TouchableOpacity>
      {!isLast && (
        <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: 72 }]} />
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { data, loading, refetch } = useTransactions();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTx, setEditTx] = useState<DashboardTransaction | null>(null);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('transactions.filter.all') },
    { key: 'income', label: t('transactions.filter.income') },
    { key: 'expense', label: t('transactions.filter.expense') },
    { key: 'transfer', label: t('transactions.filter.transfer') },
  ];

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return data.transactions;
    return data.transactions.filter(tx => tx.type === activeFilter);
  }, [data.transactions, activeFilter]);

  const groups = useMemo(() => {
    const map: Record<string, DashboardTransaction[]> = {};
    for (const tx of filtered) {
      if (!map[tx.date]) map[tx.date] = [];
      map[tx.date].push(tx);
    }
    return map;
  }, [filtered]);

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="largeTitle">{t('transactions.title')}</Text>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: activeFilter === f.key ? colors.tint : colors.fillPrimary,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                variant="subheadline"
                color={activeFilter === f.key ? colors.tintForeground : colors.labelSecondary}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Loading state */}
        {loading && data.transactions.length === 0 && (
          <TransactionsSkeleton colors={colors} />
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <View style={styles.center}>
            <Text variant="body" color={colors.labelSecondary} align="center">
              {t('transactions.empty')}
            </Text>
          </View>
        )}

        {/* Grouped transactions */}
        {sortedDates.map(date => {
          const txs = groups[date];
          return (
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
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    isLast={index === txs.length - 1}
                    colors={colors}
                    categories={data.categories}
                    accounts={data.accounts}
                    onPress={() => setEditTx(tx)}
                  />
                ))}
              </Card>
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => setSheetOpen(true)}
        activeOpacity={0.85}
      >
        <PlusIcon color={colors.tintForeground} />
      </TouchableOpacity>

      {/* Add transaction sheet */}
      <AddTransactionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => { setSheetOpen(false); refetch(); }}
        accounts={data.accounts}
        categories={data.categories}
      />

      {/* Edit transaction sheet */}
      <EditTransactionSheet
        visible={!!editTx}
        transaction={editTx}
        onClose={() => setEditTx(null)}
        onSuccess={() => { setEditTx(null); refetch(); }}
        accounts={data.accounts}
        categories={data.categories}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filters: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Spacing.radius.full,
  },
  center: {
    paddingTop: 80,
    alignItems: 'center',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
