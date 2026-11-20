import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
  Modal, KeyboardAvoidingView, Platform, TextInput, Switch, Animated, PanResponder,
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
import { Icon, isKnownIcon } from '@/components/ui/Icon';
import { IconPicker } from '@/components/ui/IconPicker';
import { formatAmountInput, parseAmountInput, toAmountInput } from '@/utils/amount';
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

function ChevronDownIcon({ color, open }: { color: string; open?: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
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
        { overflow: 'hidden', backgroundColor: cardColor },
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
    icon: 'CreditCard', description: '', amount: '',
    currency: 'COP', category_id: '', type: 'expense',
    account_id: '', interval: 'monthly',
    day_of_month: '1', day_of_week: '1', is_active: true,
  };
}

function templateToForm(t: RecurringTemplate): FormState {
  return {
    icon: t.icon, description: t.description, amount: toAmountInput(t.amount),
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
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) { setForm(template ? templateToForm(template) : emptyForm()); setErrors({}); }
  }, [visible, template?.id]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.description.trim()) e.description = t('recurring.error.descRequired');
    const amt = parseAmountInput(form.amount);
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
      icon: form.icon.trim() || 'CreditCard',
      description: form.description.trim(),
      amount: parseAmountInput(form.amount),
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


  const typeColor = form.type === 'income' ? colors.income : colors.expense;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.separator }]}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text variant="callout" color={colors.tint}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text variant="headline">{isEdit ? t('recurring.edit') : t('recurring.add')}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Type */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('recurring.type').toUpperCase()}
              </Text>
              <View style={styles.typeRow}>
                {TYPES.map(tp => {
                  const tpColor = tp === 'income' ? colors.income : colors.expense;
                  const active = form.type === tp;
                  return (
                    <TouchableOpacity
                      key={tp}
                      style={[styles.typeBtn, {
                        backgroundColor: active ? `${tpColor}18` : colors.fillPrimary,
                        borderColor: active ? tpColor : 'transparent',
                      }]}
                      onPress={() => setForm(p => ({ ...p, type: tp }))}
                      activeOpacity={0.7}
                    >
                      <Text variant="subheadline" color={active ? tpColor : colors.labelSecondary} style={{ fontWeight: '600' }}>
                        {t(`transactions.add.${tp}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('recurring.description').toUpperCase()}
              </Text>
              <View style={[styles.descRow, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
                <TouchableOpacity
                  style={[styles.iconInput, { borderRightColor: colors.separator, alignItems: 'center', justifyContent: 'center' }]}
                  onPress={() => setIconPickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={isKnownIcon(form.icon) ? form.icon : 'CreditCard'}
                    size={20}
                    color={colors.labelSecondary}
                  />
                </TouchableOpacity>
                <TextInput
                  style={[styles.descInput, { color: colors.label }]}
                  placeholder={t('recurring.descriptionPh')}
                  placeholderTextColor={colors.labelTertiary}
                  value={form.description}
                  onChangeText={v => setForm(p => ({ ...p, description: v }))}
                  autoCapitalize="sentences"
                />
              </View>
              {errors.description && (
                <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.description}</Text>
              )}
            </View>

            {/* Amount */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('recurring.amount').toUpperCase()}
              </Text>
              <View style={[styles.amountRow, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
                <Text variant="title3" color={colors.labelSecondary} style={{ marginLeft: Spacing.md }}>$</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.label }]}
                  placeholder="0"
                  placeholderTextColor={colors.labelTertiary}
                  keyboardType="decimal-pad"
                  value={form.amount}
                  onChangeText={v => setForm(p => ({ ...p, amount: formatAmountInput(v) }))}
                />
                <View style={{ flexDirection: 'row', marginRight: Spacing.sm, gap: 4 }}>
                  {['COP', 'USD'].map(cur => (
                    <TouchableOpacity
                      key={cur}
                      style={[styles.currencyBtn, {
                        backgroundColor: form.currency === cur ? typeColor + '18' : colors.fillPrimary,
                        borderColor: form.currency === cur ? typeColor : 'transparent',
                      }]}
                      onPress={() => setForm(p => ({ ...p, currency: cur }))}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="caption2"
                        color={form.currency === cur ? typeColor : colors.labelSecondary}
                        style={{ fontWeight: form.currency === cur ? '700' : '400' }}
                      >
                        {cur}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {errors.amount && (
                <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.amount}</Text>
              )}
            </View>

            {/* Account */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('recurring.account').toUpperCase()}
              </Text>
              <View style={[{ borderRadius: Spacing.radius.md, overflow: 'hidden', backgroundColor: colors.fillTertiary }]}>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() => setAccountOpen(v => !v)}
                  activeOpacity={0.7}
                >
                  <Text variant="callout" color={form.account_id ? colors.label : colors.labelTertiary} style={{ flex: 1 }}>
                    {accounts.find(a => a.id === form.account_id)?.name ?? t('recurring.selectAccount')}
                  </Text>
                  <ChevronDownIcon color={colors.labelSecondary} open={accountOpen} />
                </TouchableOpacity>
                {accountOpen && accounts.map((acc, i) => (
                  <View key={acc.id}>
                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: Spacing.md }} />
                    <TouchableOpacity
                      style={styles.selectOption}
                      onPress={() => { setForm(p => ({ ...p, account_id: acc.id })); setAccountOpen(false); }}
                      activeOpacity={0.6}
                    >
                      <Text variant="callout" style={{ flex: 1 }}>{acc.name}</Text>
                      {form.account_id === acc.id && <CheckIcon color={colors.tint} />}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              {errors.account_id && (
                <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.account_id}</Text>
              )}
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('recurring.category').toUpperCase()}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {categories.map(cat => {
                  const selected = form.category_id === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setForm(p => ({ ...p, category_id: cat.id }))}
                      style={[styles.categoryPill, {
                        backgroundColor: selected ? `${cat.color}20` : colors.fillPrimary,
                        borderColor: selected ? cat.color : 'transparent',
                      }]}
                      activeOpacity={0.7}
                    >
                      {isKnownIcon(cat.icon) ? (
                        <Icon name={cat.icon} size={14} color={cat.color} />
                      ) : (
                        <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      )}
                      <Text
                        variant="subheadline"
                        color={selected ? cat.color : colors.label}
                        style={{ fontWeight: selected ? '600' : '400' }}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {errors.category_id && (
                <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.category_id}</Text>
              )}
            </View>

            {/* Interval */}
            <View style={styles.fieldGroup}>
              <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('recurring.interval').toUpperCase()}
              </Text>
              <View style={styles.typeRow}>
                {INTERVALS.map(iv => {
                  const active = form.interval === iv;
                  return (
                    <TouchableOpacity
                      key={iv}
                      style={[styles.typeBtn, {
                        backgroundColor: active ? colors.tint + '18' : colors.fillPrimary,
                        borderColor: active ? colors.tint : 'transparent',
                      }]}
                      onPress={() => setForm(p => ({ ...p, interval: iv }))}
                      activeOpacity={0.7}
                    >
                      <Text variant="subheadline" color={active ? colors.tint : colors.labelSecondary} style={{ fontWeight: active ? '600' : '400' }}>
                        {t(`recurring.${iv}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Day */}
            {form.interval === 'monthly' ? (
              <View style={styles.fieldGroup}>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                  {t('recurring.dayOfMonth').toUpperCase()}
                </Text>
                <View style={[styles.amountRow, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
                  <TextInput
                    style={[styles.amountInput, { color: colors.label }]}
                    placeholder="1–31"
                    placeholderTextColor={colors.labelTertiary}
                    keyboardType="number-pad"
                    value={form.day_of_month}
                    onChangeText={v => setForm(p => ({ ...p, day_of_month: v }))}
                    maxLength={2}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.fieldGroup}>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                  {t('recurring.dayOfWeek').toUpperCase()}
                </Text>
                <View style={styles.typeRow}>
                  {WEEKDAY_KEYS.map((key, idx) => {
                    const active = form.day_of_week === String(idx);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dayBtn, {
                          backgroundColor: active ? colors.tint + '18' : colors.fillPrimary,
                          borderColor: active ? colors.tint : 'transparent',
                        }]}
                        onPress={() => setForm(p => ({ ...p, day_of_week: String(idx) }))}
                        activeOpacity={0.7}
                      >
                        <Text variant="caption1" color={active ? colors.tint : colors.labelSecondary} style={{ fontWeight: active ? '700' : '400' }}>
                          {t(key).slice(0, 1).toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Active */}
            <View style={[styles.activeRow, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
              <Text variant="callout" style={{ flex: 1 }}>{t('recurring.active')}</Text>
              <Switch
                value={form.is_active}
                onValueChange={v => setForm(p => ({ ...p, is_active: v }))}
                trackColor={{ true: colors.tint }}
              />
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: typeColor, opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text variant="headline" color="#ffffff">
                {saving ? '...' : isEdit ? t('recurring.update') : t('recurring.save')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <IconPicker
        visible={iconPickerOpen}
        current={form.icon}
        onSelect={(name: string) => setForm(p => ({ ...p, icon: name }))}
        onClose={() => setIconPickerOpen(false)}
        colors={colors}
        title={t('transactions.add.icon')}
      />
    </Modal>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RecurringSkeleton() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
      <View style={{ paddingHorizontal: Spacing.screenHorizontal }}>
        <Card radius={Spacing.radius.lg} padding={Spacing.md}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ gap: 6 }}>
              <Skeleton width={120} height={12} radius={6} />
              <Skeleton width={80} height={22} radius={6} />
            </View>
            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              <Skeleton width={70} height={20} radius={10} />
              <Skeleton width={70} height={20} radius={10} />
            </View>
          </View>
        </Card>
      </View>
      <View style={{ paddingHorizontal: Spacing.screenHorizontal }}>
        <Card radius={Spacing.radius.lg} padding={0}>
          {[1, 2, 3].map((i) => (
            <View key={i}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm }}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="50%" height={14} radius={7} />
                  <Skeleton width="30%" height={12} radius={6} />
                </View>
                <Skeleton width={56} height={28} radius={14} />
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

  const fetchData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
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

  const monthlyExpenses = templates
    .filter(tpl => tpl.is_active && tpl.interval === 'monthly' && tpl.type === 'expense' && tpl.currency === 'COP')
    .reduce((s, tpl) => s + tpl.amount, 0);

  const activeCount = templates.filter(tpl => tpl.is_active).length;
  const inactiveCount = templates.filter(tpl => !tpl.is_active).length;

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

      <RefreshScrollView onRefresh={() => fetchData(true)} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {loading ? (
          <RecurringSkeleton />
        ) : templates.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Icon name="CalendarClock" size={38} color={colors.labelTertiary} strokeWidth={1.4} /></View>
            <Text variant="callout" align="center" color={colors.labelSecondary} style={{ marginBottom: Spacing.lg }}>
              {t('recurring.empty')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.tint }]}
              onPress={() => { setEditing(null); setSheetOpen(true); }}
              activeOpacity={0.85}
            >
              <PlusIcon color={colors.tintForeground} />
              <Text variant="subheadline" color={colors.tintForeground} style={{ fontWeight: '600' }}>
                {t('recurring.add')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary card */}
            <View style={{ paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.md }}>
              <Card radius={Spacing.radius.lg} padding={Spacing.md}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="caption1" color={colors.labelSecondary}>{t('recurring.obligations')}</Text>
                    <Text variant="title3" style={{ marginTop: 4 }} color={colors.expense}>
                      ${Math.round(monthlyExpenses).toLocaleString('es-CO')} COP
                    </Text>
                  </View>
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    <View style={[styles.statBadge, { backgroundColor: colors.tint + '18' }]}>
                      <Text variant="caption2" color={colors.tint} style={{ fontWeight: '600' }}>
                        {activeCount} {t('recurring.active').toLowerCase()}
                      </Text>
                    </View>
                    {inactiveCount > 0 && (
                      <View style={[styles.statBadge, { backgroundColor: colors.fillPrimary }]}>
                        <Text variant="caption2" color={colors.labelSecondary} style={{ fontWeight: '500' }}>
                          {inactiveCount} {t('recurring.inactive').toLowerCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </View>

            {/* List */}
            <View style={{ paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.md }}>
              <Card radius={Spacing.radius.lg} padding={0} style={{ overflow: 'hidden' }}>
                {templates.map((tpl, i) => (
                  <SwipeableRow
                    key={tpl.id}
                    editLabel={t('accounts.edit')}
                    deleteLabel={t('common.delete')}
                    editColor={colors.tint}
                    editTextColor={colors.tintForeground}
                    deleteColor={colors.expense}
                    cardColor={colors.card}
                    separatorColor={i > 0 ? colors.separator : undefined}
                    onEdit={() => { setEditing(tpl); setSheetOpen(true); }}
                    onDelete={() => setDeleteTarget(tpl)}
                  >
                    {/* Row: left content is tappable for edit, switch is separate */}
                    <View style={[styles.rowOuter, { backgroundColor: colors.card, opacity: tpl.is_active ? 1 : 0.45 }]}>
                      <TouchableOpacity
                        style={styles.rowContent}
                        onPress={() => { setEditing(tpl); setSheetOpen(true); }}
                        activeOpacity={0.6}
                      >
                        <View style={[styles.iconCircle, {
                          backgroundColor: tpl.type === 'income'
                            ? colors.income + '20'
                            : colors.expense + '20',
                        }]}>
                          <Icon
                            name={isKnownIcon(tpl.icon) ? tpl.icon : 'CreditCard'}
                            size={19}
                            color={tpl.type === 'income' ? colors.income : colors.expense}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="callout" style={{ fontWeight: '500' }} numberOfLines={1}>{tpl.description}</Text>
                          <Text variant="caption1" color={colors.labelSecondary}>
                            {t('recurring.nextOn', { date: nextOccurrence(tpl) })}
                          </Text>
                        </View>
                        <Text
                          variant="callout"
                          style={{ fontWeight: '600', marginRight: 4 }}
                          color={tpl.type === 'income' ? colors.income : colors.expense}
                        >
                          {tpl.type === 'expense' ? '-' : '+'}{tpl.amount.toLocaleString('es-CO')} {tpl.currency}
                        </Text>
                      </TouchableOpacity>
                      <Switch
                        value={tpl.is_active}
                        onValueChange={() => toggleActive(tpl)}
                        trackColor={{ true: colors.tint }}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], marginRight: Spacing.sm }}
                      />
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
                {t('recurring.swipeHint')}
              </Text>
            </View>
          </>
        )}
      </RefreshScrollView>

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
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingBottom: 40 },
  emptyState: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: 60, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.xl, paddingVertical: 12,
    borderRadius: Spacing.radius.lg,
  },
  statBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Spacing.radius.full,
  },
  rowOuter: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rowContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingLeft: Spacing.md,
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
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.sm,
    paddingBottom: 24,
    gap: Spacing.md,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { letterSpacing: 0.5, marginLeft: 2 },
  fieldError: { marginLeft: 2, marginTop: 2 },
  typeRow: { flexDirection: 'row', gap: Spacing.xs },
  typeBtn: {
    flex: 1, height: 44,
    borderRadius: Spacing.radius.md,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  descRow: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  iconInput: {
    width: 52, height: 52, textAlign: 'center', fontSize: 22,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  descInput: { flex: 1, height: 52, paddingHorizontal: Spacing.sm, fontSize: 16 },
  amountRow: { flexDirection: 'row', alignItems: 'center', height: 52, overflow: 'hidden' },
  amountInput: { flex: 1, height: 52, paddingHorizontal: Spacing.sm, fontSize: 20, fontWeight: '600' },
  currencyBtn: {
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1.5, alignItems: 'center',
  },
  selectTrigger: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14, gap: 8, minHeight: 52,
  },
  selectOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, gap: 8,
  },
  categoryScroll: { gap: Spacing.xs, paddingRight: 4 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderRadius: Spacing.radius.full, borderWidth: 1.5,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  dayBtn: {
    flex: 1, height: 38,
    borderRadius: Spacing.radius.md, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  activeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  saveBtn: {
    height: 52, borderRadius: Spacing.radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xs,
  },
});
