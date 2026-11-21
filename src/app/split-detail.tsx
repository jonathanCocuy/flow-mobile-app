import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { RefreshScrollView } from '@/components/ui/RefreshScrollView';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { formatAmountInput, parseAmountInput, toAmountInput } from '@/utils/amount';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { SettlementSheet } from '@/components/SettlementSheet';
import type { DashboardAccount } from '@/types/finance';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SharedMember {
  id: string;
  group_id: string;
  name: string;
  share_pct: number;
  is_me: boolean;
  color: string;
}

interface SharedExpense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paid_by_member_id: string | null;
  notes: string | null;
}

interface ExpenseForm {
  description: string;
  amount: string;
  category: string;
  date: string;
  paid_by_member_id: string;
  notes: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'home', icon: 'Home' },
  { key: 'food', icon: 'ShoppingCart' },
  { key: 'transport', icon: 'Car' },
  { key: 'entertainment', icon: 'Clapperboard' },
  { key: 'health', icon: 'Pill' },
  { key: 'services', icon: 'Smartphone' },
  { key: 'other', icon: 'Receipt' },
] as const;

const CATEGORY_ICON: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.key, c.icon]));

const ACTION_WIDTH = 72;

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
    </Svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCOP(n: number): string {
  return Math.abs(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── SwipeableRow ──────────────────────────────────────────────────────────────

interface SwipeableRowProps {
  children: React.ReactNode;
  editLabel: string;
  deleteLabel: string;
  editColor: string;
  deleteColor: string;
  onEdit: () => void;
  onDelete: () => void;
}

function SwipeableRow({ children, editLabel, deleteLabel, editColor, deleteColor, onEdit, onDelete }: SwipeableRowProps) {
  const [translateX] = useState(() => new Animated.Value(0));
  const isOpen = useRef(false);

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    isOpen.current = false;
  }, [translateX]);

  const open = useCallback(() => {
    Animated.spring(translateX, { toValue: -(ACTION_WIDTH * 2), useNativeDriver: true, bounciness: 4 }).start();
    isOpen.current = true;
  }, [translateX]);

  // eslint-disable-next-line react-hooks/refs
  const panHandlers = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => {
      const val = isOpen.current ? -(ACTION_WIDTH * 2) + g.dx : g.dx;
      if (val <= 0 && val >= -(ACTION_WIDTH * 2 + 20)) translateX.setValue(val);
    },
    onPanResponderRelease: (_, g) => {
      if (!isOpen.current && g.dx < -ACTION_WIDTH) { open(); }
      else if (isOpen.current && g.dx > ACTION_WIDTH) { close(); }
      else if (isOpen.current) { open(); }
      else { close(); }
    },
  }).panHandlers, [translateX, open, close]);

  return (
    <View style={{ overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, flexDirection: 'row' }}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: editColor, width: ACTION_WIDTH }]}
          onPress={() => { close(); setTimeout(onEdit, 150); }}>
          <EditIcon color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, marginTop: 3, fontWeight: '600' }}>{editLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: deleteColor, width: ACTION_WIDTH }]}
          onPress={() => { close(); setTimeout(onDelete, 150); }}>
          <TrashIcon color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, marginTop: 3, fontWeight: '600' }}>{deleteLabel}</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

// ── Detail Skeleton ───────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <View style={{ gap: Spacing.sm }}>
      <Card radius={Spacing.radius.lg} style={{ gap: 8 }}>
        {[1, 2].map(i => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Skeleton width={24} height={24} radius={12} />
              <Skeleton width={80} height={14} radius={4} />
            </View>
            <Skeleton width={70} height={14} radius={4} />
          </View>
        ))}
      </Card>
      <Card radius={Spacing.radius.lg} padding={0}>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ padding: Spacing.md, gap: 6 }}>
            <Skeleton width={150} height={15} radius={4} />
            <Skeleton width={100} height={12} radius={4} />
          </View>
        ))}
      </Card>
    </View>
  );
}

// ── ExpenseSheet ──────────────────────────────────────────────────────────────

interface ExpenseSheetProps {
  visible: boolean;
  editing: SharedExpense | null;
  groupId: string;
  members: SharedMember[];
  onClose: () => void;
  onSaved: () => void;
}

function ExpenseSheet({ visible, editing, groupId, members, onClose, onSaved }: ExpenseSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [form, setForm] = useState<ExpenseForm>({
    description: '',
    amount: '',
    category: 'home',
    date: todayISO(),
    paid_by_member_id: '',
    notes: '',
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const p = todayISO().split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    if (editing) {
      setForm({
        description: editing.description,
        amount: toAmountInput(editing.amount),
        category: editing.category,
        date: editing.date,
        paid_by_member_id: editing.paid_by_member_id ?? '',
        notes: editing.notes ?? '',
      });
      const p = editing.date.split('-').map(Number);
      setSelectedDate(new Date(p[0], p[1] - 1, p[2]));
    } else {
      const meId = members.find(m => m.is_me)?.id ?? members[0]?.id ?? '';
      setForm({ description: '', amount: '', category: 'home', date: todayISO(), paid_by_member_id: meId, notes: '' });
      const p = todayISO().split('-').map(Number);
      setSelectedDate(new Date(p[0], p[1] - 1, p[2]));
    }
    setError('');
    setSaving(false);
  }, [editing, members]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { if (visible) reset(); }, [visible, reset]);

  const patch = (key: keyof ExpenseForm, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setError('');
    if (!form.description.trim()) { setError(t('split.expense.error.descRequired')); return; }
    const amount = parseAmountInput(form.amount);
    if (isNaN(amount) || amount <= 0) { setError(t('split.expense.error.amountInvalid')); return; }
    if (!form.paid_by_member_id) { setError(t('split.expense.error.paidByRequired')); return; }

    setSaving(true);
    try {
      const payload = {
        group_id: groupId,
        description: form.description.trim(),
        amount,
        category: form.category,
        date: form.date,
        paid_by_member_id: form.paid_by_member_id || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        await supabase.from('shared_expenses').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('shared_expenses').insert(payload);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, {
    backgroundColor: colors.fillTertiary,
    color: colors.label,
  }];

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.backgroundGrouped }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.fillPrimary }]} />
          <Text variant="title3" style={{ marginBottom: Spacing.md, fontWeight: '700' }}>
            {editing ? t('split.expense.edit') : t('split.expense.add')}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('split.expense.description').toUpperCase()}
              </Text>
              <TextInput
                style={inputStyle}
                value={form.description}
                onChangeText={v => patch('description', v)}
                placeholder={t('split.expense.descPh')}
                placeholderTextColor={colors.labelTertiary}
                maxLength={80}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('split.expense.amount').toUpperCase()}
              </Text>
              <TextInput
                style={inputStyle}
                value={form.amount}
                onChangeText={v => patch('amount', formatAmountInput(v))}
                placeholder="0"
                placeholderTextColor={colors.labelTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('split.expense.category').toUpperCase()}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: Spacing.xs, paddingBottom: 4 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => patch('category', cat.key)}
                      style={[styles.catChip, {
                        backgroundColor: form.category === cat.key ? colors.tint + '18' : colors.fillPrimary,
                        borderColor: form.category === cat.key ? colors.tint : 'transparent',
                      }]}>
                      <Icon
                        name={cat.icon}
                        size={14}
                        color={colors.tint}
                      />
                      <Text variant="subheadline" style={{ color: form.category === cat.key ? colors.tint : colors.label, fontWeight: form.category === cat.key ? '600' : '400' }}>
                        {t(`split.category.${cat.key}` as Parameters<typeof t>[0])}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('split.expense.date').toUpperCase()}
              </Text>
              <DatePickerField
                value={selectedDate}
                onChange={d => {
                  setSelectedDate(d);
                  patch('date', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                }}
                colors={colors}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('split.expense.paidBy').toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm }}>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => patch('paid_by_member_id', m.id)}
                    style={[styles.memberChip, {
                      backgroundColor: form.paid_by_member_id === m.id ? m.color + '20' : colors.fillPrimary,
                      borderColor: form.paid_by_member_id === m.id ? m.color : 'transparent',
                    }]}>
                    <View style={[styles.memberDot, { backgroundColor: m.color }]} />
                    <Text variant="subheadline" style={{ color: form.paid_by_member_id === m.id ? m.color : colors.label, fontWeight: form.paid_by_member_id === m.id ? '600' : '400' }}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('split.expense.notes').toUpperCase()}
              </Text>
              <TextInput
                style={[inputStyle, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                value={form.notes}
                onChangeText={v => patch('notes', v)}
                placeholder={t('split.expense.notesPh')}
                placeholderTextColor={colors.labelTertiary}
                multiline
                maxLength={200}
              />
            </View>

            {!!error && (
              <Text variant="caption1" color={colors.expense} style={{ marginTop: Spacing.xs }}>{error}</Text>
            )}
            <View style={{ height: Spacing.md }} />
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}>
            <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>
              {saving ? '...' : editing ? t('split.expense.update') : t('split.expense.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SplitDetailScreen() {
  const { t } = useTranslation();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const groupId = params.id;
  const groupName = params.name;

  const [members, setMembers] = useState<SharedMember[]>([]);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [accounts, setAccounts] = useState<DashboardAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [editing, setEditing] = useState<SharedExpense | null>(null);
  const [deleting, setDeleting] = useState<SharedExpense | null>(null);

  const load = useCallback(async () => {
    if (!groupId) return;
    const [{ data: mData }, { data: eData }, { data: aData }] = await Promise.all([
      supabase.from('shared_members').select('*').eq('group_id', groupId).order('created_at'),
      supabase.from('shared_expenses').select('*').eq('group_id', groupId).order('date', { ascending: false }),
      supabase.from('accounts').select('id, name, color, balance, initial_balance').order('created_at'),
    ]);
    setMembers((mData ?? []) as SharedMember[]);
    setExpenses((eData ?? []) as SharedExpense[]);
    setAccounts((aData ?? []) as DashboardAccount[]);
    setLoading(false);
  }, [groupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const balances = useMemo(() => {
    return members.map(member => {
      let paid = 0;
      let owed = 0;
      for (const exp of expenses) {
        if (exp.paid_by_member_id === member.id) paid += Number(exp.amount);
        owed += (member.share_pct / 100) * Number(exp.amount);
      }
      return { ...member, net: paid - owed };
    }).sort((a, b) => {
      if (a.is_me) return -1;
      if (b.is_me) return 1;
      return b.net - a.net;
    });
  }, [members, expenses]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const memberById = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);

  const handleDelete = async () => {
    if (!deleting) return;
    await supabase.from('shared_expenses').delete().eq('id', deleting.id);
    setDeleting(null);
    load();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundGrouped }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <BackIcon color={colors.label} />
          </TouchableOpacity>
          <Text variant="title3" style={{ fontWeight: '700' }} numberOfLines={1}>{groupName}</Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <DetailSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundGrouped }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <BackIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="title3" style={{ fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: Spacing.sm }} numberOfLines={1}>{groupName}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => { setEditing(null); setSheetOpen(true); }}
          hitSlop={8}>
          <PlusIcon color={colors.tintForeground} />
        </TouchableOpacity>
      </View>

      <RefreshScrollView onRefresh={load} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {members.length > 0 && (
          <Card radius={Spacing.radius.lg} style={{ marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <Text variant="callout" style={{ fontWeight: '700' }}>{t('split.detail.balance')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                {totalExpenses > 0 && (
                  <Text variant="caption1" color={colors.labelSecondary}>
                    Total: ${fmtCOP(totalExpenses)} COP
                  </Text>
                )}
                {totalExpenses > 0 && (
                  <TouchableOpacity
                    onPress={() => setSettlementOpen(true)}
                    style={[styles.settleHeaderBtn, { backgroundColor: colors.tint + '18' }]}
                    activeOpacity={0.7}
                    hitSlop={8}>
                    <Icon name="HandCoins" size={13} color={colors.tint} />
                    <Text variant="caption1" style={{ color: colors.tint, fontWeight: '700' }}>
                      {t('split.settle.settle')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {balances.map((m, i) => (
              <View key={m.id} style={[styles.balanceRow, i < balances.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}>
                <View style={[styles.memberDotSmall, { backgroundColor: m.color }]} />
                <Text variant="subheadline" style={{ flex: 1, fontWeight: m.is_me ? '700' : '500' }}>
                  {m.name}{m.is_me ? ' (tú)' : ''}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: m.net > 1 ? colors.income : m.net < -1 ? colors.expense : colors.labelSecondary,
                  }}>
                  {m.net > 1 ? '+' : m.net < -1 ? '-' : ''}${fmtCOP(m.net)}
                </Text>
              </View>
            ))}
            {totalExpenses === 0 && (
              <Text variant="caption1" color={colors.labelTertiary} align="center" style={{ marginTop: Spacing.xs }}>
                {t('split.detail.empty')}
              </Text>
            )}
          </Card>
        )}

        <Text variant="footnote" color={colors.labelSecondary} style={styles.sectionTitle}>
          {t('split.detail.expenses').toUpperCase()}
        </Text>

        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={{ marginBottom: Spacing.sm }}>
              <Icon name="ReceiptText" size={42} color={colors.labelTertiary} strokeWidth={1.4} />
            </View>
            <Text variant="callout" style={{ fontWeight: '600', marginBottom: 6 }}>{t('split.detail.empty')}</Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.tint }]}
              onPress={() => { setEditing(null); setSheetOpen(true); }}
              activeOpacity={0.85}>
              <PlusIcon color={colors.tintForeground} />
              <Text variant="subheadline" color={colors.tintForeground} style={{ fontWeight: '600' }}>
                {t('split.detail.addFirst')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Card radius={Spacing.radius.lg} padding={0}>
            {expenses.map((exp, idx) => {
              const payer = exp.paid_by_member_id ? memberById[exp.paid_by_member_id] : null;
              const catIcon = CATEGORY_ICON[exp.category] ?? 'Receipt';

              return (
                <View key={exp.id}>
                  {idx > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 72 }} />}
                  <SwipeableRow
                    editLabel={t('common.edit') ?? 'Edit'}
                    deleteLabel={t('common.delete')}
                    editColor={colors.tint}
                    deleteColor={colors.expense}
                    onEdit={() => { setEditing(exp); setSheetOpen(true); }}
                    onDelete={() => setDeleting(exp)}>
                    <TouchableOpacity
                      style={[styles.expenseRow, { backgroundColor: colors.card }]}
                      onPress={() => { setEditing(exp); setSheetOpen(true); }}
                      activeOpacity={0.7}>
                      <View style={[styles.catIcon, { backgroundColor: colors.fillTertiary }]}>
                        <Icon name={catIcon} size={19} color={colors.labelSecondary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="callout" style={{ fontWeight: '600' }} numberOfLines={1}>{exp.description}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {payer && (
                            <View style={[styles.payerTag, { backgroundColor: payer.color + '20' }]}>
                              <View style={[styles.memberDotXS, { backgroundColor: payer.color }]} />
                              <Text style={{ fontSize: 11, color: payer.color, fontWeight: '600' }}>{payer.name}</Text>
                            </View>
                          )}
                          <Text variant="caption2" color={colors.labelTertiary}>{fmtDate(exp.date)}</Text>
                        </View>
                      </View>
                      <Text variant="callout" style={{ fontWeight: '700', color: colors.label }}>
                        ${fmtCOP(exp.amount)}
                      </Text>
                    </TouchableOpacity>
                  </SwipeableRow>
                </View>
              );
            })}
          </Card>
        )}

        {expenses.length > 0 && (
          <Text variant="caption2" color={colors.labelTertiary} align="center" style={{ marginTop: Spacing.sm }}>
            {t('split.detail.swipeHint')}
          </Text>
        )}

        <View style={{ height: 80 }} />
      </RefreshScrollView>

      <ExpenseSheet
        visible={sheetOpen}
        editing={editing}
        groupId={groupId}
        members={members}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
      />

      <SettlementSheet
        visible={settlementOpen}
        onClose={() => setSettlementOpen(false)}
        groupId={groupId}
        balances={balances}
        accounts={accounts}
        onSettled={load}
      />

      <ConfirmDialog
        visible={!!deleting}
        title={t('split.expense.deleteTitle')}
        message={t('split.expense.deleteMessage', { name: deleting?.description ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 80 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
  },
  memberDotSmall: {
    width: 10, height: 10, borderRadius: 5,
  },
  settleHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: Spacing.sm,
  },
  catIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  payerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberDotXS: {
    width: 6, height: 6, borderRadius: 3,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 24,
  },
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
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing.sm,
  },
  fieldGroup: { gap: 6, marginBottom: Spacing.sm },
  fieldLabel: { letterSpacing: 0.5, marginLeft: 2 },
  input: {
    borderRadius: Spacing.radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 13,
    fontSize: 15,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Spacing.radius.full,
    borderWidth: 1.5,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Spacing.radius.full,
    borderWidth: 1.5,
  },
  memberDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
});
