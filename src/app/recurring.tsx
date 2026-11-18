import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
  Modal, KeyboardAvoidingView, Platform, TextInput, Switch,
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
import type { RecurringTemplate } from '@/types/finance';

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

const WEEKDAY_KEYS = ['weekdays.sunday', 'weekdays.monday', 'weekdays.tuesday', 'weekdays.wednesday', 'weekdays.thursday', 'weekdays.friday', 'weekdays.saturday'] as const;

const INTERVALS = ['monthly', 'weekly'] as const;
const TYPES = ['expense', 'income'] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Account { id: string; name: string; }
interface Category { id: string; label: string; icon: string; color: string; }

interface FormState {
  icon: string;
  description: string;
  amount: string;
  currency: string;
  category_id: string;
  type: 'income' | 'expense';
  account_id: string;
  interval: 'monthly' | 'weekly';
  day_of_month: string;
  day_of_week: string;
  is_active: boolean;
}

function emptyForm(): FormState {
  return {
    icon: '💳', description: '', amount: '',
    currency: 'COP', category_id: '', type: 'expense',
    account_id: '', interval: 'monthly',
    day_of_month: '1', day_of_week: '1', is_active: true,
  };
}

function templateToForm(t: RecurringTemplate): FormState {
  return {
    icon: t.icon, description: t.description, amount: String(t.amount),
    currency: t.currency, category_id: t.category, type: t.type,
    account_id: t.account_id, interval: t.interval,
    day_of_month: t.day_of_month !== null ? String(t.day_of_month) : '1',
    day_of_week: t.day_of_week !== null ? String(t.day_of_week) : '1',
    is_active: t.is_active,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextOccurrence(template: RecurringTemplate): string {
  const today = new Date();
  const next = new Date(today);
  if (template.interval === 'monthly' && template.day_of_month !== null) {
    next.setDate(template.day_of_month);
    if (next <= today) { next.setMonth(next.getMonth() + 1); next.setDate(template.day_of_month); }
  } else if (template.interval === 'weekly' && template.day_of_week !== null) {
    const diff = (template.day_of_week - today.getDay() + 7) % 7 || 7;
    next.setDate(today.getDate() + diff);
  }
  return next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

function RecurringSheet({
  visible, template, accounts, categories, onClose, onSuccess,
}: {
  visible: boolean;
  template: RecurringTemplate | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isEdit = template !== null;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) { setForm(template ? templateToForm(template) : emptyForm()); setErrors({}); }
  }, [visible, template?.id]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.description.trim()) e.description = t('recurring.error.descRequired');
    const amt = parseFloat(form.amount.replace(',', '.'));
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = t('recurring.error.amountInvalid');
    if (!form.account_id) e.account_id = t('recurring.error.accountRequired');
    if (!form.category_id) e.category_id = t('recurring.error.categoryRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !user) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      user_id: user.id,
      icon: form.icon.trim() || '💳',
      description: form.description.trim(),
      amount: parseFloat(form.amount.replace(',', '.')),
      currency: form.currency,
      category: form.category_id,
      type: form.type,
      account_id: form.account_id,
      interval: form.interval,
      day_of_month: form.interval === 'monthly' ? parseInt(form.day_of_month) || 1 : null,
      day_of_week: form.interval === 'weekly' ? parseInt(form.day_of_week) || 1 : null,
      is_active: form.is_active,
    };
    if (isEdit && template) {
      await supabase.from('recurring_templates').update(payload).eq('id', template.id);
    } else {
      await supabase.from('recurring_templates').insert(payload);
    }
    setSaving(false);
    onSuccess();
  }

  const f = (key: keyof FormState) => (val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.separator }]}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text variant="callout" color={colors.tint}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text variant="headline">{isEdit ? t('recurring.edit') : t('recurring.add')}</Text>
            <TouchableOpacity onPress={handleSave} hitSlop={12} disabled={saving}>
              <Text variant="callout" color={colors.tint} style={{ fontWeight: '600', opacity: saving ? 0.5 : 1 }}>
                {isEdit ? t('recurring.update') : t('recurring.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.screenHorizontal, gap: Spacing.md }}>
            {/* Icon + Description */}
            <View>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('recurring.description').toUpperCase()}</Text>
              <Card radius={Spacing.radius.lg} padding={0}>
                <View style={{ flexDirection: 'row' }}>
                  <TextInput
                    style={[styles.textInput, { width: 54, textAlign: 'center' }]}
                    value={form.icon}
                    onChangeText={f('icon')}
                    maxLength={4}
                    placeholder="💳"
                    placeholderTextColor={colors.labelTertiary}
                  />
                  <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />
                  <TextInput
                    style={[styles.textInput, { flex: 1, color: colors.label }]}
                    placeholder={t('recurring.descriptionPh')}
                    placeholderTextColor={colors.labelTertiary}
                    value={form.description}
                    onChangeText={v => setForm(p => ({ ...p, description: v }))}
                  />
                </View>
              </Card>
              {errors.description && <Text variant="caption1" color={colors.expense} style={{ marginTop: 4 }}>{errors.description}</Text>}
            </View>

            {/* Type */}
            <View>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('recurring.type').toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {TYPES.map(tp => (
                  <TouchableOpacity
                    key={tp}
                    style={[styles.chip, {
                      flex: 1,
                      backgroundColor: form.type === tp ? (tp === 'income' ? colors.income : colors.expense) + '22' : colors.fillPrimary,
                      borderColor: form.type === tp ? (tp === 'income' ? colors.income : colors.expense) : 'transparent',
                      borderWidth: 1,
                    }]}
                    onPress={() => setForm(p => ({ ...p, type: tp }))}
                    activeOpacity={0.7}
                  >
                    <Text variant="callout" align="center">{tp === 'income' ? '📥' : '📤'} {t(`transaction.type.${tp}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount + Currency */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('recurring.amount').toUpperCase()}</Text>
                <Card radius={Spacing.radius.lg} padding={0}>
                  <TextInput
                    style={[styles.textInput, { color: colors.label }]}
                    placeholder="0"
                    placeholderTextColor={colors.labelTertiary}
                    keyboardType="decimal-pad"
                    value={form.amount}
                    onChangeText={v => setForm(p => ({ ...p, amount: v }))}
                  />
                </Card>
                {errors.amount && <Text variant="caption1" color={colors.expense} style={{ marginTop: 4 }}>{errors.amount}</Text>}
              </View>
              <View style={{ width: 80 }}>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>CUR</Text>
                <View style={{ gap: 4 }}>
                  {['COP', 'USD'].map(cur => (
                    <TouchableOpacity
                      key={cur}
                      style={[styles.chip, {
                        backgroundColor: form.currency === cur ? colors.tint + '22' : colors.fillPrimary,
                        borderColor: form.currency === cur ? colors.tint : 'transparent',
                        borderWidth: 1, alignItems: 'center',
                      }]}
                      onPress={() => setForm(p => ({ ...p, currency: cur }))}
                      activeOpacity={0.7}
                    >
                      <Text variant="caption1">{cur}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Account */}
            <View>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('recurring.account').toUpperCase()}</Text>
              <Card radius={Spacing.radius.lg} padding={0}>
                {accounts.map((acc, i) => (
                  <View key={acc.id}>
                    <TouchableOpacity
                      style={styles.pickerRow}
                      onPress={() => setForm(p => ({ ...p, account_id: acc.id }))}
                      activeOpacity={0.6}
                    >
                      <Text variant="callout" style={{ flex: 1 }}>{acc.name}</Text>
                      {form.account_id === acc.id && (
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Path d="M20 6L9 17l-5-5" stroke={colors.tint} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      )}
                    </TouchableOpacity>
                    {i < accounts.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: Spacing.md }} />}
                  </View>
                ))}
              </Card>
              {errors.account_id && <Text variant="caption1" color={colors.expense} style={{ marginTop: 4 }}>{errors.account_id}</Text>}
            </View>

            {/* Category */}
            <View>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('recurring.category').toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, {
                      backgroundColor: form.category_id === cat.id ? cat.color + '22' : colors.fillPrimary,
                      borderColor: form.category_id === cat.id ? cat.color : 'transparent',
                      borderWidth: 1,
                    }]}
                    onPress={() => setForm(p => ({ ...p, category_id: cat.id }))}
                    activeOpacity={0.7}
                  >
                    <Text variant="caption1">{cat.icon} {cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.category_id && <Text variant="caption1" color={colors.expense} style={{ marginTop: 4 }}>{errors.category_id}</Text>}
            </View>

            {/* Interval */}
            <View>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('recurring.interval').toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {INTERVALS.map(iv => (
                  <TouchableOpacity
                    key={iv}
                    style={[styles.chip, {
                      flex: 1,
                      backgroundColor: form.interval === iv ? colors.tint + '22' : colors.fillPrimary,
                      borderColor: form.interval === iv ? colors.tint : 'transparent',
                      borderWidth: 1,
                    }]}
                    onPress={() => setForm(p => ({ ...p, interval: iv }))}
                    activeOpacity={0.7}
                  >
                    <Text variant="callout" align="center">{t(`recurring.${iv}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Day */}
            {form.interval === 'monthly' ? (
              <View>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('recurring.dayOfMonth').toUpperCase()}</Text>
                <Card radius={Spacing.radius.lg} padding={0}>
                  <TextInput
                    style={[styles.textInput, { color: colors.label }]}
                    placeholder="1–31"
                    placeholderTextColor={colors.labelTertiary}
                    keyboardType="number-pad"
                    value={form.day_of_month}
                    onChangeText={v => setForm(p => ({ ...p, day_of_month: v }))}
                    maxLength={2}
                  />
                </Card>
              </View>
            ) : (
              <View>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>{t('recurring.dayOfWeek').toUpperCase()}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {WEEKDAY_KEYS.map((key, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.chip, {
                        backgroundColor: form.day_of_week === String(idx) ? colors.tint + '22' : colors.fillPrimary,
                        borderColor: form.day_of_week === String(idx) ? colors.tint : 'transparent',
                        borderWidth: 1,
                      }]}
                      onPress={() => setForm(p => ({ ...p, day_of_week: String(idx) }))}
                      activeOpacity={0.7}
                    >
                      <Text variant="caption1">{t(key).slice(0, 3)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Active */}
            <View style={[styles.pickerRow, { paddingHorizontal: 0 }]}>
              <Text variant="callout" style={{ flex: 1 }}>{t('recurring.active')}</Text>
              <Switch
                value={form.is_active}
                onValueChange={v => setForm(p => ({ ...p, is_active: v }))}
                trackColor={{ true: colors.tint }}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RecurringSkeleton() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <View style={{ paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.md }}>
      <Card radius={Spacing.radius.lg} padding={0}>
        {[1, 2, 3].map((i) => (
          <View key={i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm }}>
              <Skeleton width={44} height={44} radius={22} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="50%" height={14} radius={7} />
                <Skeleton width="30%" height={12} radius={6} />
              </View>
              <Skeleton width={56} height={14} radius={7} />
            </View>
            {i < 3 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 72 }} />}
          </View>
        ))}
      </Card>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function RecurringScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTemplate | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.rpc('process_recurring_transactions', { p_user_id: user.id });
      const [tplRes, accRes, catRes] = await Promise.all([
        supabase.from('recurring_templates').select('*').eq('user_id', user.id).order('description'),
        supabase.from('accounts').select('id, name').eq('user_id', user.id),
        supabase.from('categories').select('id, label, icon, color').eq('user_id', user.id),
      ]);
      setTemplates((tplRes.data ?? []) as RecurringTemplate[]);
      setAccounts((accRes.data ?? []) as Account[]);
      setCategories((catRes.data ?? []) as Category[]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  async function toggleActive(tpl: RecurringTemplate) {
    await supabase.from('recurring_templates').update({ is_active: !tpl.is_active }).eq('id', tpl.id);
    setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, is_active: !t.is_active } : t));
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <BackIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="headline" style={{ flex: 1 }} align="center">{t('recurring.title')}</Text>
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
          <RecurringSkeleton />
        ) : templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔄</Text>
            <Text variant="callout" align="center" color={colors.labelSecondary}>{t('recurring.empty')}</Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
              onPress={() => { setEditing(null); setSheetOpen(true); }}
              activeOpacity={0.85}
            >
              <Text variant="callout" color={colors.tintForeground}>{t('recurring.add')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.md }}>
            <Card radius={Spacing.radius.lg} padding={0}>
              {templates.map((tpl, i) => (
                <View key={tpl.id}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => { setEditing(tpl); setSheetOpen(true); }}
                    onLongPress={() => setDeleteTarget(tpl)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: colors.fillPrimary }]}>
                      <Text variant="body" align="center">{tpl.icon}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="callout" style={{ fontWeight: '500' }} numberOfLines={1}>{tpl.description}</Text>
                      <Text variant="caption1" color={colors.labelSecondary}>
                        {t('recurring.nextOn', { date: nextOccurrence(tpl) })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text variant="callout" style={{ fontWeight: '600' }} color={tpl.type === 'income' ? colors.income : colors.expense}>
                        {tpl.type === 'expense' ? '-' : '+'}{tpl.amount.toLocaleString('es-CO')} {tpl.currency}
                      </Text>
                      <Switch
                        value={tpl.is_active}
                        onValueChange={() => toggleActive(tpl)}
                        trackColor={{ true: colors.tint }}
                        style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                      />
                    </View>
                  </TouchableOpacity>
                  {i < templates.length - 1 && (
                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 72 }} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>

      <RecurringSheet
        visible={sheetOpen}
        template={editing}
        accounts={accounts}
        categories={categories}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => { setSheetOpen(false); fetchData(); }}
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title={t('recurring.deleteTitle')}
        message={deleteTarget ? t('recurring.deleteMessage', { name: deleteTarget.description }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          await supabase.from('recurring_templates').delete().eq('id', deleteTarget.id);
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
    borderRadius: Spacing.radius.full, alignItems: 'center',
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
});
