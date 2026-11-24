import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
  Modal, KeyboardAvoidingView, Platform, TextInput, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { RefreshScrollView } from '@/components/ui/RefreshScrollView';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { formatAmountInput, parseAmountInput, toAmountInput } from '@/utils/amount';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DatePickerField } from '@/components/ui/DatePickerField';
import type { InvestmentRecord } from '@/types/finance';

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
  children, editLabel, deleteLabel,
  editColor, editTextColor = '#fff',
  deleteColor, cardColor, separatorColor,
  onEdit, onDelete,
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
      <Animated.View
        {...panHandlers}
        style={[{ backgroundColor: cardColor }, { transform: [{ translateX }] }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  stock: 'TrendingUp', etf: 'BarChart3', crypto: 'Coins', fund: 'Landmark', other: 'Briefcase',
};

const TYPE_COLOR: Record<string, string> = {
  stock: '#3b82f6', etf: '#8b5cf6', crypto: '#f97316', fund: '#22c55e', other: '#6b7280',
};

const INVESTMENT_TYPES = ['etf', 'stock', 'crypto', 'fund', 'other'] as const;
const CURRENCIES = ['COP', 'USD'] as const;

function fmtAmount(amount: number, currency: string): string {
  if (currency === 'COP') {
    return `$${Math.round(amount).toLocaleString('es-CO')}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  type: typeof INVESTMENT_TYPES[number];
  amount: string;
  currency: typeof CURRENCIES[number];
  date: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    name: '',
    type: 'etf',
    amount: '',
    currency: 'COP',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  };
}

function recordToForm(r: InvestmentRecord): FormState {
  return {
    name: r.name,
    type: r.type,
    amount: toAmountInput(r.amount),
    currency: r.currency,
    date: r.date,
    notes: r.notes ?? '',
  };
}

// ── InvestmentSheet ───────────────────────────────────────────────────────────

function InvestmentSheet({
  visible,
  record,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  record: InvestmentRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isEdit = record !== null;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      const f = record ? recordToForm(record) : emptyForm();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(f); setErrors({});
      const parts = f.date.split('-').map(Number);
      setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
  }, [visible, record?.id]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = t('investment.error.nameRequired');
    const amt = parseAmountInput(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = t('investment.error.amountInvalid');
    if (!selectedDate) e.date = t('investment.error.dateInvalid');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      type: form.type,
      amount: parseAmountInput(form.amount),
      currency: form.currency,
      date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
      notes: form.notes.trim() || null,
    };
    if (isEdit && record) {
      await supabase.from('investment_records').update(payload).eq('id', record.id);
    } else {
      await supabase.from('investment_records').insert(payload);
    }
    setSaving(false);
    onSuccess();
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.separator }]}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text variant="callout" color={colors.tint}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text variant="headline">{isEdit ? t('investments.edit') : t('investments.add')}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('investment.name').toUpperCase()}
              </Text>
              <View style={[styles.inputRow, { backgroundColor: colors.fillTertiary }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.label }]}
                  placeholder={t('investment.namePlaceholder')}
                  placeholderTextColor={colors.labelTertiary}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                />
              </View>
              {errors.name && <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.name}</Text>}
            </View>

            {/* Type */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('investment.type').toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
                {INVESTMENT_TYPES.map(tp => {
                  const active = form.type === tp;
                  const tpColor = TYPE_COLOR[tp];
                  return (
                    <TouchableOpacity
                      key={tp}
                      style={[styles.typePill, {
                        backgroundColor: active ? tpColor + '20' : colors.fillPrimary,
                        borderColor: active ? tpColor : 'transparent',
                      }]}
                      onPress={() => setForm(f => ({ ...f, type: tp }))}
                      activeOpacity={0.7}
                    >
                      <Icon name={TYPE_ICON[tp]} size={14} color={active ? tpColor : colors.labelSecondary} />
                      <Text variant="subheadline" color={active ? tpColor : colors.label} style={{ fontWeight: active ? '600' : '400' }}>
                        {t(`investment.type.${tp}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Amount */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('investment.amount').toUpperCase()}
              </Text>
              <View style={[styles.amountRow, { backgroundColor: colors.fillTertiary }]}>
                <Text variant="title3" color={colors.labelSecondary} style={{ paddingLeft: Spacing.md }}>$</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.label }]}
                  placeholder="0"
                  placeholderTextColor={colors.labelTertiary}
                  keyboardType="decimal-pad"
                  value={form.amount}
                  onChangeText={v => setForm(f => ({ ...f, amount: formatAmountInput(v) }))}
                />
                <View style={styles.currencyRow}>
                  {CURRENCIES.map(cur => (
                    <TouchableOpacity
                      key={cur}
                      style={[styles.currencyBtn, {
                        backgroundColor: form.currency === cur ? colors.tint + '18' : colors.fillPrimary,
                        borderColor: form.currency === cur ? colors.tint : 'transparent',
                      }]}
                      onPress={() => setForm(f => ({ ...f, currency: cur }))}
                      activeOpacity={0.7}
                    >
                      <Text variant="caption2" color={form.currency === cur ? colors.tint : colors.labelSecondary} style={{ fontWeight: form.currency === cur ? '700' : '400' }}>
                        {cur}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {errors.amount && <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.amount}</Text>}
            </View>

            {/* Date */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('investment.date').toUpperCase()}
              </Text>
              <DatePickerField
                value={selectedDate}
                onChange={d => setSelectedDate(d)}
                colors={colors}
              />
              {errors.date && <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.date}</Text>}
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('investment.notes').toUpperCase()}
              </Text>
              <View style={[styles.notesRow, { backgroundColor: colors.fillTertiary }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.label, textAlignVertical: 'top' }]}
                  placeholder={t('investment.notesPh')}
                  placeholderTextColor={colors.labelTertiary}
                  multiline
                  numberOfLines={3}
                  value={form.notes}
                  onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                />
              </View>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text variant="headline" color={colors.tintForeground}>
                {saving ? '...' : isEdit ? t('investment.update') : t('investment.save')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function InvestmentsSkeleton() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <View style={{ gap: Spacing.xl, marginTop: Spacing.md }}>
      <View style={{ paddingHorizontal: Spacing.screenHorizontal, flexDirection: 'row', gap: Spacing.sm }}>
        {[1, 2].map(i => (
          <Card key={i} style={{ flex: 1 }} radius={Spacing.radius.lg} padding={Spacing.md}>
            <Skeleton width={60} height={12} radius={6} />
            <Skeleton width={80} height={22} radius={6} style={{ marginTop: 6 }} />
          </Card>
        ))}
      </View>
      <View style={{ paddingHorizontal: Spacing.screenHorizontal }}>
        <Card radius={Spacing.radius.lg} padding={0}>
          {[1, 2, 3].map((i) => (
            <View key={i}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm }}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="55%" height={14} radius={7} />
                  <Skeleton width="35%" height={12} radius={6} />
                </View>
                <Skeleton width={72} height={14} radius={7} />
              </View>
              {i < 3 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 72 }} />}
            </View>
          ))}
        </Card>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function InvestmentsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const [records, setRecords] = useState<InvestmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<InvestmentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvestmentRecord | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await supabase
        .from('investment_records')
        .select('id, name, type, amount, currency, date, notes')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      setRecords((data ?? []) as InvestmentRecord[]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const totalCOP = records.filter(r => r.currency === 'COP').reduce((s, r) => s + r.amount, 0);
  const totalUSD = records.filter(r => r.currency === 'USD').reduce((s, r) => s + r.amount, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <BackIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="headline" style={{ flex: 1 }} align="center">{t('investments.title')}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => { setEditing(null); setSheetOpen(true); }}
          hitSlop={8}
        >
          <PlusIcon color={colors.tintForeground} />
        </TouchableOpacity>
      </View>

      <RefreshScrollView onRefresh={() => fetchData(true)} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {loading ? (
          <InvestmentsSkeleton />
        ) : records.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Icon name="Gem" size={38} color={colors.labelTertiary} strokeWidth={1.4} /></View>
            <Text variant="callout" align="center" color={colors.labelSecondary} style={{ marginBottom: Spacing.lg }}>
              {t('investments.empty')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.tint }]}
              onPress={() => { setEditing(null); setSheetOpen(true); }}
              activeOpacity={0.85}
            >
              <PlusIcon color={colors.tintForeground} />
              <Text variant="subheadline" color={colors.tintForeground} style={{ fontWeight: '600' }}>
                {t('investments.add')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary totals */}
            <View style={styles.section}>
              <View style={styles.summaryRow}>
                <Card style={{ flex: 1 }} radius={Spacing.radius.lg} padding={Spacing.md}>
                  <Text variant="caption1" color={colors.labelSecondary}>{t('investments.records')}</Text>
                  <Text variant="title3" style={{ marginTop: 4 }}>{records.length}</Text>
                </Card>
                {totalCOP > 0 && (
                  <Card style={{ flex: 1 }} radius={Spacing.radius.lg} padding={Spacing.md}>
                    <Text variant="caption1" color={colors.labelSecondary}>{t('investments.totalCOP')}</Text>
                    <Text variant="title3" style={{ marginTop: 4 }}>
                      ${Math.round(totalCOP).toLocaleString('es-CO')}
                    </Text>
                  </Card>
                )}
                {totalUSD > 0 && (
                  <Card style={{ flex: 1 }} radius={Spacing.radius.lg} padding={Spacing.md}>
                    <Text variant="caption1" color={colors.labelSecondary}>{t('investments.totalUSD')}</Text>
                    <Text variant="title3" style={{ marginTop: 4 }}>
                      ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </Card>
                )}
              </View>
            </View>

            {/* Type breakdown chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.xs, paddingLeft: Spacing.screenHorizontal, paddingRight: Spacing.screenHorizontal, marginTop: 2 }}
              style={{ marginTop: Spacing.sm }}
            >
              {INVESTMENT_TYPES.filter(tp => records.some(r => r.type === tp)).map(tp => {
                const typeRecs = records.filter(r => r.type === tp);
                const total = typeRecs.reduce((s, r) => s + r.amount, 0);
                const currency = typeRecs[0]?.currency ?? 'COP';
                const color = TYPE_COLOR[tp];
                return (
                  <View key={tp} style={[styles.typeChip, { backgroundColor: color + '15', borderColor: color + '50' }]}>
                    <Icon name={TYPE_ICON[tp]} size={15} color={color} />
                    <View style={{ gap: 1 }}>
                      <Text variant="caption2" color={color} style={{ fontWeight: '700' }}>
                        {t(`investment.type.${tp}`)}
                      </Text>
                      <Text style={{ fontSize: 11, color: color + 'AA', fontWeight: '500' }}>
                        {typeRecs.length} · {fmtAmount(total, currency)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Records list */}
            <View style={[styles.section, { marginTop: Spacing.xl }]}>
              <Text variant="title3" style={{ marginBottom: Spacing.sm }}>{t('investments.records')}</Text>
              <Card radius={Spacing.radius.lg} padding={0} style={{ overflow: 'hidden' }}>
                {records.map((rec, i) => (
                  <SwipeableRow
                    key={rec.id}
                    editLabel={t('accounts.edit')}
                    deleteLabel={t('common.delete')}
                    editColor={colors.tint}
                    editTextColor={colors.tintForeground}
                    deleteColor={colors.expense}
                    cardColor={colors.card}
                    separatorColor={i > 0 ? colors.separator : undefined}
                    onEdit={() => { setEditing(rec); setSheetOpen(true); }}
                    onDelete={() => setDeleteTarget(rec)}
                  >
                    <View style={[styles.row, { backgroundColor: colors.card }]}>
                      <View style={[styles.iconCircle, { backgroundColor: TYPE_COLOR[rec.type] + '20' }]}>
                        <Icon name={TYPE_ICON[rec.type]} size={19} color={TYPE_COLOR[rec.type]} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="callout" style={{ fontWeight: '500' }} numberOfLines={1}>{rec.name}</Text>
                        <Text variant="caption1" color={colors.labelSecondary}>
                          {t(`investment.type.${rec.type}`)} · {rec.date}
                        </Text>
                      </View>
                      <Text variant="callout" style={{ fontWeight: '600' }} color={TYPE_COLOR[rec.type]}>
                        {fmtAmount(rec.amount, rec.currency)}
                      </Text>
                    </View>
                  </SwipeableRow>
                ))}
              </Card>
              <Text
                variant="caption2"
                color={colors.labelTertiary}
                align="center"
                style={{ marginTop: Spacing.sm, paddingHorizontal: Spacing.md }}
              >
                {t('investments.swipeHint')}
              </Text>
            </View>
          </>
        )}
      </RefreshScrollView>

      <InvestmentSheet
        visible={sheetOpen}
        record={editing}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => { setSheetOpen(false); fetchData(); }}
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title={t('investments.deleteTitle')}
        message={deleteTarget ? t('investments.deleteMessage', { name: deleteTarget.name }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          await supabase.from('investment_records').delete().eq('id', deleteTarget.id);
          setDeleteTarget(null);
          fetchData();
        }}
        onCancel={() => setDeleteTarget(null)}
      />
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
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingBottom: 40 },
  section: { paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.md },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  emptyState: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: 60, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.xl, paddingVertical: 12,
    borderRadius: Spacing.radius.lg,
  },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Spacing.radius.lg, borderWidth: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: Spacing.xl, paddingVertical: 14, gap: Spacing.sm,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  swipeActions: { flexDirection: 'row' },
  swipeAction: { width: ACTION_WIDTH, justifyContent: 'center', alignItems: 'center', gap: 4 },
  swipeLabel: { fontWeight: '500' },
  // Sheet
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: Spacing.sm, paddingBottom: 24, gap: Spacing.md },
  fieldGroup: { gap: 6 },
  fieldLabel: { letterSpacing: 0.5, marginLeft: 2 },
  fieldError: { marginLeft: 2, marginTop: 2 },
  inputRow: { borderRadius: Spacing.radius.md, overflow: 'hidden' },
  textInput: { paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: 16 },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderRadius: Spacing.radius.full, borderWidth: 1.5,
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 52, borderRadius: Spacing.radius.md, overflow: 'hidden',
  },
  amountInput: { flex: 1, height: 52, paddingHorizontal: Spacing.sm, fontSize: 20, fontWeight: '600' },
  currencyRow: { flexDirection: 'row', marginRight: Spacing.sm, gap: 4 },
  currencyBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1.5, alignItems: 'center' },
  notesRow: { borderRadius: Spacing.radius.md, overflow: 'hidden', minHeight: 90 },
  saveBtn: {
    height: 52, borderRadius: Spacing.radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xs,
  },
});
