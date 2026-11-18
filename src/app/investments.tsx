import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
  Modal, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  stock: '📈', etf: '📊', crypto: '🪙', fund: '🏦', other: '💼',
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
    amount: String(r.amount),
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
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(record ? recordToForm(record) : emptyForm()); setErrors({});
    }
  }, [visible, record?.id]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = t('investment.error.nameRequired');
    const amt = parseFloat(form.amount.replace(',', '.'));
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = t('investment.error.amountInvalid');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) e.date = t('investment.error.dateInvalid');
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
      amount: parseFloat(form.amount.replace(',', '.')),
      currency: form.currency,
      date: form.date,
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.separator }]}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text variant="callout" color={colors.tint}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text variant="headline">{isEdit ? t('investments.edit') : t('investments.add')}</Text>
            <TouchableOpacity onPress={handleSave} hitSlop={12} disabled={saving}>
              <Text variant="callout" color={colors.tint} style={{ fontWeight: '600', opacity: saving ? 0.5 : 1 }}>
                {isEdit ? t('investment.update') : t('investment.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.screenHorizontal, gap: Spacing.md }}>
            {/* Name */}
            <View>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('investment.name').toUpperCase()}</Text>
              <Card radius={Spacing.radius.lg} padding={0}>
                <TextInput
                  style={[styles.textInput, { color: colors.label }]}
                  placeholder={t('investment.namePlaceholder')}
                  placeholderTextColor={colors.labelTertiary}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                />
              </Card>
              {errors.name && <Text variant="caption1" color={colors.expense} style={{ marginTop: 4 }}>{errors.name}</Text>}
            </View>

            {/* Type */}
            <View>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('investment.type').toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
                {INVESTMENT_TYPES.map(tp => (
                  <TouchableOpacity
                    key={tp}
                    style={[styles.chip, {
                      backgroundColor: form.type === tp ? TYPE_COLOR[tp] + '22' : colors.fillPrimary,
                      borderColor: form.type === tp ? TYPE_COLOR[tp] : 'transparent',
                      borderWidth: 1,
                    }]}
                    onPress={() => setForm(f => ({ ...f, type: tp }))}
                    activeOpacity={0.7}
                  >
                    <Text variant="caption1">{TYPE_EMOJI[tp]} {t(`investment.type.${tp}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount + Currency */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('investment.amount').toUpperCase()}</Text>
                <Card radius={Spacing.radius.lg} padding={0}>
                  <TextInput
                    style={[styles.textInput, { color: colors.label }]}
                    placeholder="0"
                    placeholderTextColor={colors.labelTertiary}
                    keyboardType="decimal-pad"
                    value={form.amount}
                    onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                  />
                </Card>
                {errors.amount && <Text variant="caption1" color={colors.expense} style={{ marginTop: 4 }}>{errors.amount}</Text>}
              </View>
              <View style={{ width: 100 }}>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('investment.currency').toUpperCase()}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CURRENCIES.map(cur => (
                    <TouchableOpacity
                      key={cur}
                      style={[styles.chip, {
                        flex: 1,
                        backgroundColor: form.currency === cur ? colors.tint + '22' : colors.fillPrimary,
                        borderColor: form.currency === cur ? colors.tint : 'transparent',
                        borderWidth: 1,
                      }]}
                      onPress={() => setForm(f => ({ ...f, currency: cur }))}
                      activeOpacity={0.7}
                    >
                      <Text variant="caption1" align="center">{cur}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Date */}
            <View>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('investment.date').toUpperCase()}</Text>
              <Card radius={Spacing.radius.lg} padding={0}>
                <TextInput
                  style={[styles.textInput, { color: colors.label }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.labelTertiary}
                  value={form.date}
                  onChangeText={v => setForm(f => ({ ...f, date: v }))}
                  keyboardType="numbers-and-punctuation"
                />
              </Card>
              {errors.date && <Text variant="caption1" color={colors.expense} style={{ marginTop: 4 }}>{errors.date}</Text>}
            </View>

            {/* Notes */}
            <View>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('investment.notes').toUpperCase()}</Text>
              <Card radius={Spacing.radius.lg} padding={0}>
                <TextInput
                  style={[styles.textInput, { color: colors.label, minHeight: 72, textAlignVertical: 'top', paddingTop: 14 }]}
                  placeholder={t('investment.notesPh')}
                  placeholderTextColor={colors.labelTertiary}
                  multiline
                  value={form.notes}
                  onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                />
              </Card>
            </View>
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

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {loading ? (
          <InvestmentsSkeleton />
        ) : records.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📈</Text>
            <Text variant="callout" align="center" color={colors.labelSecondary}>{t('investments.empty')}</Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
              onPress={() => { setEditing(null); setSheetOpen(true); }}
              activeOpacity={0.85}
            >
              <Text variant="callout" color={colors.tintForeground}>{t('investments.add')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary */}
            <View style={styles.section}>
              <View style={styles.summaryRow}>
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

            {/* List */}
            <View style={[styles.section, { marginTop: Spacing.xl }]}>
              <Text variant="title3" style={{ marginBottom: Spacing.sm }}>{t('investments.records')}</Text>
              <Card radius={Spacing.radius.lg} padding={0}>
                {records.map((rec, i) => (
                  <View key={rec.id}>
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => { setEditing(rec); setSheetOpen(true); }}
                      onLongPress={() => setDeleteTarget(rec)}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: TYPE_COLOR[rec.type] + '20' }]}>
                        <Text variant="body" align="center">{TYPE_EMOJI[rec.type]}</Text>
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
                    </TouchableOpacity>
                    {i < records.length - 1 && (
                      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 72 }} />
                    )}
                  </View>
                ))}
              </Card>
            </View>
          </>
        )}
      </ScrollView>

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
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  section: { paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.md },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  emptyState: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: 60, alignItems: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyBtn: { marginTop: 16, paddingHorizontal: Spacing.lg, paddingVertical: 12, borderRadius: Spacing.radius.full },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  // Sheet
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: { letterSpacing: 0.5, marginBottom: 6, marginLeft: 2 },
  textInput: {
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: 16, fontFamily: 'System',
  },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Spacing.radius.full,
  },
});
