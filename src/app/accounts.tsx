import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AddAccountSheet } from '@/components/AddAccountSheet';
import { EditAccountSheet } from '@/components/EditAccountSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  name: string;
  balance: number;
  initial_balance: number;
  color: string;
  created_at: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function EditIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 11v6M14 11v6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function WalletBgIcon({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7z" stroke={color} strokeWidth={1.2} />
      <Path d="M2 10h20" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <Circle cx="17" cy="15" r="1" fill={color} />
    </Svg>
  );
}

// ── SwipeableRow ──────────────────────────────────────────────────────────────

const ACTION_WIDTH = 72;
const SNAP_THRESHOLD = ACTION_WIDTH;

interface SwipeableRowProps {
  children: React.ReactNode;
  editLabel: string;
  deleteLabel: string;
  editColor: string;
  editTextColor?: string;
  deleteColor: string;
  cardColor: string;
  separatorColor?: string;
  onEdit: () => void;
  onDelete: () => void;
}

function SwipeableRow({
  children,
  editLabel,
  deleteLabel,
  editColor,
  editTextColor = '#fff',
  deleteColor,
  cardColor,
  separatorColor,
  onEdit,
  onDelete,
}: SwipeableRowProps) {
  const [translateX] = useState(() => new Animated.Value(0));
  const isOpen = useRef(false);

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 })
      .start(() => { isOpen.current = false; });
  }, [translateX]);

  const open = useCallback(() => {
    Animated.spring(translateX, { toValue: -(ACTION_WIDTH * 2), useNativeDriver: true, bounciness: 4 })
      .start(() => { isOpen.current = true; });
  }, [translateX]);

  const onMove = useCallback((_: unknown, { dx }: { dx: number }) => {
    const base = isOpen.current ? -(ACTION_WIDTH * 2) : 0;
    translateX.setValue(Math.max(-(ACTION_WIDTH * 2), Math.min(0, base + dx)));
  }, [translateX]);

  const onRelease = useCallback((_: unknown, { dx, vx }: { dx: number; vx: number }) => {
    const base = isOpen.current ? -(ACTION_WIDTH * 2) : 0;
    const moved = base + dx;
    if (!isOpen.current) {
      if (moved < -SNAP_THRESHOLD || vx < -0.5) { open(); } else { close(); }
    } else {
      if (moved > -(ACTION_WIDTH * 2 - SNAP_THRESHOLD) || vx > 0.5) { close(); } else { open(); }
    }
  }, [open, close]);

  // eslint-disable-next-line react-hooks/refs -- callbacks only run during gesture events, not render
  const panHandlers = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy),
    onPanResponderMove: onMove,
    onPanResponderRelease: onRelease,
  }).panHandlers, [onMove, onRelease]);

return (
    <View
      style={[
        { overflow: 'hidden', paddingLeft: Spacing.md, backgroundColor: cardColor },
        separatorColor
          ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: separatorColor }
          : undefined,
      ]}
    >
      {/* Actions revealed on the right */}
      <View style={[styles.swipeActions, { position: 'absolute', top: 0, bottom: 0, right: 0 }]}>
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: editColor }]}
          onPress={() => { close(); onEdit(); }}
          activeOpacity={0.85}
        >
          <EditIcon color={editTextColor} />
          <Text variant="caption2" color={editTextColor} style={styles.swipeLabel}>{editLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: deleteColor }]}
          onPress={() => { close(); onDelete(); }}
          activeOpacity={0.85}
        >
          <TrashIcon color="#fff" />
          <Text variant="caption2" color="#fff" style={styles.swipeLabel}>{deleteLabel}</Text>
        </TouchableOpacity>
      </View>
      {/* Slideable row content */}
      <Animated.View
        {...panHandlers}
        style={[{ backgroundColor: cardColor }, { transform: [{ translateX }] }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Account | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      setAccounts(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchAccounts(); }, [fetchAccounts]));

  const handleEdit = (account: Account) => {
    setEditTarget(account);
  };

  const handleDelete = (account: Account) => {
    setDeleteDialog(account);
  };


  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <BackIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="headline" style={{ flex: 1 }} align="center">
          {t('accounts.title')}
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => setAddOpen(true)}
          hitSlop={8}
        >
          <PlusIcon color={colors.tintForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={fetchAccounts} />
        }
      >
        {/* Summary card */}
        {!loading && accounts.length > 0 && (
          <View style={styles.section}>
            <Card radius={Spacing.radius.xl} padding={Spacing.lg} style={{ backgroundColor: colors.backgroundGrouped }}>
              <Text variant="footnote" color={colors.labelSecondary}>{t('accounts.totalBalance')}</Text>
              <Text variant="title1" style={{ marginTop: 4 }}>{formatCurrency(totalBalance)}</Text>
              <Text variant="caption1" color={colors.labelSecondary} style={{ marginTop: 4 }}>
                {t('accounts.count', { count: accounts.length })}
              </Text>
            </Card>
          </View>
        )}

        {/* Accounts list */}
        <View style={styles.section}>
          {loading ? (
            <Card radius={Spacing.radius.xl} padding={0} style={styles.listCard}>
              {[1, 2, 3].map((i) => (
                <View key={i}>
                  <View style={[styles.accountRow, { backgroundColor: colors.card }]}>
                    <View style={[styles.colorDot, { backgroundColor: colors.separator }]} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Skeleton width="50%" height={14} radius={7} />
                      <Skeleton width="35%" height={12} radius={6} />
                    </View>
                    <Skeleton width={72} height={14} radius={7} />
                  </View>
                  {i < 3 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />}
                </View>
              ))}
            </Card>
          ) : accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <WalletBgIcon color={colors.labelTertiary} />
              <Text variant="callout" color={colors.labelSecondary} style={{ marginTop: 16 }}>
                {t('accounts.empty')}
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: colors.tint }]}
                onPress={() => setAddOpen(true)}
                activeOpacity={0.85}
              >
                <Text variant="subheadline" color={colors.tintForeground}>{t('account.add')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Card radius={Spacing.radius.xl} padding={0} style={styles.listCard}>
              {accounts.map((account, i) => (
                <SwipeableRow
                  key={account.id}
                  editLabel={t('accounts.edit')}
                  deleteLabel={t('common.delete')}
                  editColor={colors.tint}
                  editTextColor={colors.tintForeground}
                  deleteColor={colors.expense}
                  cardColor={colors.card}
                  separatorColor={i > 0 ? colors.separator : undefined}
                  onEdit={() => handleEdit(account)}
                  onDelete={() => handleDelete(account)}
                >
                  <View style={[styles.accountRow, { backgroundColor: colors.card }]}>
                    <View style={[styles.colorDot, { backgroundColor: account.color ?? colors.tint }]} />
                    <View style={{ flex: 1 }}>
                      <Text variant="subheadline" numberOfLines={1}>{account.name}</Text>
                      <Text variant="caption1" color={colors.labelSecondary} style={{ marginTop: 2 }}>
                        {t('accounts.initialBalance')}: {formatCurrency(account.initial_balance ?? 0)}
                      </Text>
                    </View>
                    <Text
                      variant="subheadline"
                      color={account.balance >= 0 ? colors.income : colors.expense}
                      style={{ fontWeight: '600' }}
                    >
                      {formatCurrency(account.balance ?? 0)}
                    </Text>
                  </View>
                </SwipeableRow>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>

      <AddAccountSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); fetchAccounts(); }}
      />

      {editTarget && (
        <EditAccountSheet
          visible={!!editTarget}
          account={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); fetchAccounts(); }}
        />
      )}

      <ConfirmDialog
        visible={deleteDialog !== null}
        title={t('accounts.deleteTitle')}
        message={deleteDialog ? t('accounts.deleteMessage', { name: deleteDialog.name }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={async () => {
          if (!deleteDialog) return;
          await supabase.from('accounts').delete().eq('id', deleteDialog.id);
          setDeleteDialog(null);
          fetchAccounts();
        }}
        onCancel={() => setDeleteDialog(null)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  backBtn: { width: 32 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingBottom: 40 },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  loadingRow: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyAddBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: Spacing.radius.lg,
  },
  listCard: { overflow: 'hidden' },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.xl,
    paddingVertical: 14,
    gap: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  swipeActions: {
    flexDirection: 'row',
  },
  swipeAction: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  swipeLabel: {
    fontWeight: '500',
  },
});
