import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import type { DashboardAccount, UserCategory } from '@/types/finance';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBalance(value: number): string {
  return Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: DashboardAccount[];
  categories: UserCategory[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddTransactionSheet({
  visible,
  onClose,
  onSuccess,
  accounts,
  categories,
}: AddTransactionSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<UserCategory | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset form on open
  useEffect(() => {
    if (visible) {
      setTxType('expense');
      setDescription('');
      setAmount('');
      setSelectedCategory(null);
      setSelectedAccountId(accounts[0]?.id ?? null);
      setErrors({});
      setServerError(null);
      setSaving(false);
    }
  }, [visible, accounts]);

  async function handleSubmit() {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = t('transactions.add.error.description');
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) newErrors.amount = t('transactions.add.error.amount');
    if (!selectedCategory) newErrors.category = t('transactions.add.error.category');
    if (!selectedAccountId) newErrors.account = t('transactions.add.error.account');

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setServerError(null);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setServerError('Not authenticated'); setSaving(false); return; }

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: selectedAccountId,
        description: description.trim(),
        icon: selectedCategory!.icon,
        amount: amountNum,
        category: selectedCategory!.name,
        type: txType,
        date: new Date().toISOString(),
        currency: 'USD',
        exchange_rate: 1,
      });

      if (error) { setServerError(error.message); setSaving(false); return; }
      onSuccess();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Unknown error');
      setSaving(false);
    }
  }

  const incomeActive = txType === 'income';
  const expenseActive = txType === 'expense';

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.root}>
        {/* Overlay */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={[styles.sheet, { backgroundColor: colors.backgroundGroupedSecondary }]}>
            {/* Drag handle */}
            <View style={[styles.handle, { backgroundColor: colors.separator }]} />

            {/* Header */}
            <View style={styles.header}>
              <Text variant="headline">{t('transactions.add.title')}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text variant="body" color={colors.tint}>{t('transactions.add.cancel')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Type selector */}
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: incomeActive ? `${colors.income}18` : colors.fillPrimary,
                      borderColor: incomeActive ? colors.income : 'transparent',
                    },
                  ]}
                  onPress={() => setTxType('income')}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="subheadline"
                    color={incomeActive ? colors.income : colors.labelSecondary}
                    style={{ fontWeight: '600' }}
                  >
                    {t('transactions.add.income')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: expenseActive ? `${colors.expense}18` : colors.fillPrimary,
                      borderColor: expenseActive ? colors.expense : 'transparent',
                    },
                  ]}
                  onPress={() => setTxType('expense')}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="subheadline"
                    color={expenseActive ? colors.expense : colors.labelSecondary}
                    style={{ fontWeight: '600' }}
                  >
                    {t('transactions.add.expense')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Description */}
              <Input
                label={t('transactions.add.description')}
                placeholder={t('transactions.add.descriptionPlaceholder')}
                value={description}
                onChangeText={(v) => { setDescription(v); setErrors(e => ({ ...e, description: '' })); }}
                error={errors.description}
                autoCapitalize="sentences"
                autoCorrect={false}
                returnKeyType="next"
              />

              {/* Amount */}
              <Input
                label={t('transactions.add.amount')}
                placeholder="0.00"
                value={amount}
                onChangeText={(v) => { setAmount(v); setErrors(e => ({ ...e, amount: '' })); }}
                error={errors.amount}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              {/* Category */}
              <View style={styles.fieldGroup}>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                  {t('transactions.add.category').toUpperCase()}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {categories.map((cat) => {
                    const active = selectedCategory?.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => { setSelectedCategory(cat); setErrors(e => ({ ...e, category: '' })); }}
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: active ? `${cat.color}20` : colors.fillPrimary,
                            borderColor: active ? cat.color : 'transparent',
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                        <Text
                          variant="subheadline"
                          color={active ? cat.color : colors.label}
                          style={{ fontWeight: active ? '600' : '400' }}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {errors.category ? (
                  <Text variant="caption1" color={colors.expense} style={styles.fieldError}>
                    {errors.category}
                  </Text>
                ) : null}
              </View>

              {/* Account */}
              <View style={styles.fieldGroup}>
                <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                  {t('transactions.add.account').toUpperCase()}
                </Text>
                <View style={[styles.accountList, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
                  {accounts.map((acc, index) => {
                    const active = selectedAccountId === acc.id;
                    return (
                      <View key={acc.id}>
                        <TouchableOpacity
                          onPress={() => { setSelectedAccountId(acc.id); setErrors(e => ({ ...e, account: '' })); }}
                          style={styles.accountRow}
                          activeOpacity={0.6}
                        >
                          <View style={[styles.accountDot, { backgroundColor: acc.color || colors.tint }]} />
                          <View style={styles.accountMiddle}>
                            <Text variant="callout" style={{ fontWeight: '500' }}>{acc.name}</Text>
                            <Text variant="caption1" color={colors.labelSecondary}>
                              ${formatBalance(acc.balance)}
                            </Text>
                          </View>
                          {active && <CheckIcon color={colors.tint} />}
                        </TouchableOpacity>
                        {index < accounts.length - 1 && (
                          <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: 48 }]} />
                        )}
                      </View>
                    );
                  })}
                </View>
                {errors.account ? (
                  <Text variant="caption1" color={colors.expense} style={styles.fieldError}>
                    {errors.account}
                  </Text>
                ) : null}
              </View>

              {/* Server error */}
              {serverError ? (
                <Text variant="caption1" color={colors.expense} align="center">
                  {serverError}
                </Text>
              ) : null}

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: txType === 'income' ? colors.income : colors.expense }]}
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text variant="headline" color="#ffffff">{t('transactions.add.save')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.90,
    borderTopLeftRadius: Spacing.radius.xxl,
    borderTopRightRadius: Spacing.radius.xxl,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeBtn: {
    flex: 1,
    height: 44,
    borderRadius: Spacing.radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    letterSpacing: 0.5,
    marginLeft: 2,
  },
  fieldError: {
    marginLeft: 2,
    marginTop: 2,
  },
  categoryScroll: {
    gap: Spacing.xs,
    paddingRight: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Spacing.radius.full,
    borderWidth: 1.5,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accountList: {
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  accountDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accountMiddle: {
    flex: 1,
    gap: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    height: 52,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
});
