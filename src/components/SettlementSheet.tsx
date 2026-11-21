import React, { useState, useCallback } from 'react';
import {
  View,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';
import type { DashboardAccount } from '@/types/finance';

interface SharedMember {
  id: string;
  name: string;
  is_me: boolean;
  color: string;
}

export type BalanceMember = SharedMember & { net: number };

interface SettlementSheetProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  balances: BalanceMember[];
  accounts: DashboardAccount[];
  onSettled: () => void;
}

function fmtCOP(n: number): string {
  return Math.abs(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

export function SettlementSheet({ visible, onClose, groupId, balances, accounts, onSettled }: SettlementSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [settling, setSettling] = useState<string | null>(null);
  const [error, setError] = useState('');

  const me = balances.find(b => b.is_me);

  const settleRows = balances
    .filter(b => !b.is_me)
    .map(other => {
      if (!me) return null;
      if (me.net > 1 && other.net < -1) {
        return { member: other, amount: Math.min(me.net, Math.abs(other.net)), isIncome: true };
      }
      if (me.net < -1 && other.net > 1) {
        return { member: other, amount: Math.min(Math.abs(me.net), other.net), isIncome: false };
      }
      return null;
    })
    .filter((r): r is { member: BalanceMember; amount: number; isIncome: boolean } => r !== null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { if (visible && accounts.length > 0 && !selectedAccountId) setSelectedAccountId(accounts[0].id); }, [visible, accounts, selectedAccountId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { if (!visible) { setError(''); setSettling(null); } }, [visible]);

  const handleSettle = useCallback(async (
    memberId: string,
    amount: number,
    isIncome: boolean,
    memberName: string,
  ) => {
    if (!selectedAccountId) {
      setError(t('split.settle.noAccount'));
      return;
    }
    setError('');
    setSettling(memberId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: selectedAccountId,
        description: isIncome
          ? t('split.settle.paymentFrom', { name: memberName })
          : t('split.settle.paymentTo', { name: memberName }),
        icon: 'HandCoins',
        amount,
        category: 'other',
        type: isIncome ? 'income' : 'expense',
        date: new Date().toISOString(),
        group_id: groupId,
      });
      if (insertError) throw insertError;
      onSettled();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSettling(null);
    }
  }, [selectedAccountId, groupId, onSettled, onClose, t]);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.backgroundGrouped }]}>
        <View style={[styles.handle, { backgroundColor: colors.fillPrimary }]} />

        <View style={styles.headerRow}>
          <Text variant="title3" style={{ fontWeight: '700' }}>{t('split.settle.title')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Icon name="X" size={20} color={colors.labelSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
          {/* Balance summary */}
          <Text variant="footnote" color={colors.labelSecondary} style={styles.sectionLabel}>
            {t('split.detail.balance').toUpperCase()}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {balances.map((m, i) => (
              <View
                key={m.id}
                style={[
                  styles.balanceRow,
                  i < balances.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
                ]}>
                <View style={[styles.dot, { backgroundColor: m.color }]} />
                <Text variant="subheadline" style={{ flex: 1, fontWeight: m.is_me ? '700' : '500' }}>
                  {m.name}{m.is_me ? ' (tú)' : ''}
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: m.net > 1 ? colors.income : m.net < -1 ? colors.expense : colors.labelSecondary,
                }}>
                  {m.net > 1 ? '+' : m.net < -1 ? '-' : ''}${fmtCOP(m.net)}
                </Text>
              </View>
            ))}
          </View>

          {/* Account picker */}
          {accounts.length > 0 && (
            <>
              <Text variant="footnote" color={colors.labelSecondary} style={[styles.sectionLabel, { marginTop: Spacing.md }]}>
                {t('split.settle.account').toUpperCase()}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: Spacing.xs, paddingBottom: 4 }}>
                  {accounts.map(acc => (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => setSelectedAccountId(acc.id)}
                      activeOpacity={0.7}
                      style={[styles.accountChip, {
                        backgroundColor: selectedAccountId === acc.id ? acc.color + '20' : colors.fillPrimary,
                        borderColor: selectedAccountId === acc.id ? acc.color : 'transparent',
                      }]}>
                      <View style={[styles.accountDot, { backgroundColor: acc.color }]} />
                      <Text
                        variant="subheadline"
                        style={{
                          color: selectedAccountId === acc.id ? acc.color : colors.label,
                          fontWeight: selectedAccountId === acc.id ? '600' : '400',
                        }}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Settle rows */}
          {settleRows.length > 0 ? (
            <>
              <Text variant="footnote" color={colors.labelSecondary} style={[styles.sectionLabel, { marginTop: Spacing.sm }]}>
                {t('split.settle.payments').toUpperCase()}
              </Text>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                {settleRows.map((row, i) => (
                  <View
                    key={row.member.id}
                    style={[
                      styles.settleRow,
                      i < settleRows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
                    ]}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text variant="subheadline" style={{ fontWeight: '600' }}>
                        {row.isIncome
                          ? t('split.settle.youAreOwed', { name: row.member.name })
                          : t('split.settle.youOwe', { name: row.member.name })}
                      </Text>
                      <Text variant="footnote" style={{ fontWeight: '700', color: row.isIncome ? colors.income : colors.expense }}>
                        ${fmtCOP(row.amount)} COP
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.settleBtn,
                        {
                          backgroundColor: row.isIncome ? colors.income + '18' : colors.expense + '18',
                          opacity: settling === row.member.id ? 0.5 : 1,
                        },
                      ]}
                      onPress={() => handleSettle(row.member.id, row.amount, row.isIncome, row.member.name)}
                      disabled={!!settling}
                      activeOpacity={0.7}>
                      <Icon
                        name="HandCoins"
                        size={15}
                        color={row.isIncome ? colors.income : colors.expense}
                      />
                      <Text
                        variant="footnote"
                        style={{ color: row.isIncome ? colors.income : colors.expense, fontWeight: '700' }}>
                        {settling === row.member.id ? '...' : t('split.settle.settle')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.allSettled}>
              <Icon name="CheckCircle" size={40} color={colors.income} strokeWidth={1.5} />
              <Text variant="callout" style={{ fontWeight: '600', marginTop: Spacing.sm }}>
                {t('split.settle.allSettled')}
              </Text>
            </View>
          )}

          {!!error && (
            <Text variant="caption1" color={colors.expense} style={{ marginTop: Spacing.sm, marginHorizontal: 2 }}>
              {error}
            </Text>
          )}
          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  card: {
    borderRadius: Spacing.radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Spacing.radius.full,
    borderWidth: 1.5,
  },
  accountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  allSettled: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
});
