import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  Platform,
  useColorScheme,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Animated,
  PanResponder,
} from 'react-native';
import { useKeyboardShift } from '@/hooks/useKeyboardShift';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon, isKnownIcon, transactionIcon } from '@/components/ui/Icon';
import { IconPicker } from '@/components/ui/IconPicker';
import { formatAmountInput, parseAmountInput, toAmountInput } from '@/utils/amount';
import type { DashboardTransaction, DashboardAccount, UserCategory } from '@/types/finance';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type TxType = 'expense' | 'income' | 'transfer';
type AppColors = typeof Colors[keyof typeof Colors];

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M10 7V5h4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 7h12v11a2 2 0 01-2 2H8a2 2 0 01-2-2V7z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 11v5M14 11v5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBalance(value: number): string {
  return Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EditTransactionSheetProps {
  visible: boolean;
  transaction: DashboardTransaction | null;
  onClose: () => void;
  onSuccess: () => void;
  accounts: DashboardAccount[];
  categories: UserCategory[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditTransactionSheet({
  visible,
  transaction,
  onClose,
  onSuccess,
  accounts,
  categories,
}: EditTransactionSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [txType, setTxType] = useState<TxType>('expense');
  const [iconName, setIconName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<UserCategory | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTxType(transaction.type);
    setIconName(isKnownIcon(transaction.icon) ? transaction.icon! : '');
    setDescription(transaction.description ?? '');
    setAmount(toAmountInput(transaction.amount));
    const parts = transaction.date.split('-').map(Number);
    setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    setShowEmojiPicker(false);
    setSelectedCategory(categories.find(c => c.name === transaction.category) ?? null);
    setSelectedAccountId(transaction.account_id);
    setDestinationAccountId(transaction.destination_account_id ?? null);
    setErrors({});
    setServerError(null);
    setSaving(false);
    setDeleting(false);
    setShowDeleteConfirm(false);
  }, [transaction, categories]);

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);
  const { shift: kbShift, onFocus: onKbFocus } = useKeyboardShift(visible);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

  function dismissSheet() {
    Keyboard.dismiss();
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(() => {
      onClose();
    });
  }

  // PanResponder created each render (acceptable — component renders rarely)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 0,
    onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy); },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 100 || vy > 0.8) {
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(() => {
          onClose();
        });
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  async function handleSave() {
    if (!transaction) return;
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = t('transactions.add.error.description');
    const amountNum = parseAmountInput(amount);
    if (isNaN(amountNum) || amountNum <= 0) newErrors.amount = t('transactions.add.error.amount');
    if (!selectedAccountId) newErrors.account = t('transactions.add.error.account');
    if (txType !== 'transfer' && !selectedCategory) newErrors.category = t('transactions.add.error.category');
    if (txType === 'transfer') {
      if (!destinationAccountId) newErrors.destination = t('transactions.add.error.destinationAccount');
      else if (destinationAccountId === selectedAccountId) newErrors.destination = t('transactions.add.error.sameAccount');
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setErrors({});
    setServerError(null);
    setSaving(true);

    const y = selectedDate.getFullYear();
    const mo = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateISO = `${y}-${mo}-${d}`;
    const iconVal = iconName || (isKnownIcon(transaction.icon) ? transaction.icon! : '')
      || (txType === 'transfer' ? 'ArrowRightLeft' : selectedCategory?.icon ?? 'Wallet');

    try {
      const { error } = await supabase.from('transactions').update({
        description: description.trim(),
        icon: iconVal,
        amount: amountNum,
        category: txType !== 'transfer' ? selectedCategory!.name : transaction.category,
        type: txType,
        date: dateISO,
        account_id: selectedAccountId,
        destination_account_id: txType === 'transfer' ? destinationAccountId : null,
      }).eq('id', transaction.id);
      if (error) { setServerError(error.message); setSaving(false); return; }
      onSuccess();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Unknown error');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', transaction.id);
      if (error) { setServerError(error.message); setDeleting(false); setShowDeleteConfirm(false); return; }
      onSuccess();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Unknown error');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const TYPE_OPTIONS: { key: TxType; label: string; color: string }[] = [
    { key: 'expense',  label: t('transactions.add.expense'),  color: colors.expense },
    { key: 'income',   label: t('transactions.add.income'),   color: colors.income },
    { key: 'transfer', label: t('transactions.add.transfer'), color: colors.savings },
  ];

  const saveBtnColor =
    txType === 'income' ? colors.income :
    txType === 'transfer' ? colors.savings :
    colors.expense;

  const destinationAccounts = accounts.filter(a => a.id !== selectedAccountId);

  return (
    <>
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
        <View style={styles.root}>
          <TouchableWithoutFeedback onPress={dismissSheet}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

            <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundGroupedSecondary, transform: [{ translateY: Animated.subtract(translateY, kbShift) }] }]}>
              <View style={styles.handleZone} {...panResponder.panHandlers}>
                <View style={[styles.handle, { backgroundColor: colors.separator }]} />
              </View>

              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text variant="body" color={colors.tint}>{t('transactions.add.cancel')}</Text>
                </TouchableOpacity>
                <Text variant="headline">{t('transactions.edit.title')}</Text>
                <TouchableOpacity
                  onPress={() => setShowDeleteConfirm(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <TrashIcon color={colors.expense} />
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
                  {TYPE_OPTIONS.map(opt => {
                    const active = txType === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.typeBtn,
                          {
                            backgroundColor: active ? `${opt.color}18` : colors.fillPrimary,
                            borderColor: active ? opt.color : 'transparent',
                          },
                        ]}
                        onPress={() => { setTxType(opt.key); setErrors({}); }}
                        activeOpacity={0.7}
                      >
                        <Text
                          variant="subheadline"
                          color={active ? opt.color : colors.labelSecondary}
                          style={{ fontWeight: '600' }}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Emoji + Description */}
                <View style={styles.fieldGroup}>
                  <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                    {t('transactions.add.description').toUpperCase()}
                  </Text>
                  <View style={[styles.descRow, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
                    <TouchableOpacity
                      onPress={() => setShowEmojiPicker(true)}
                      style={[styles.emojiBtn, { borderRightColor: colors.separator }]}
                      activeOpacity={0.7}
                    >
                      <Icon
                        name={iconName || transactionIcon(transaction?.icon, txType, selectedCategory?.name)}
                        size={21}
                        color={iconName ? colors.tint : colors.labelSecondary}
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.descInput, { color: colors.label }]}
                      placeholder={t('transactions.add.descriptionPlaceholder')}
                      placeholderTextColor={colors.labelTertiary}
                      value={description}
                      onChangeText={v => { setDescription(v); setErrors(e => ({ ...e, description: '' })); }}
                      onFocus={onKbFocus}
                      autoCapitalize="sentences"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                  {errors.description ? (
                    <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.description}</Text>
                  ) : null}
                </View>

                {/* Amount */}
                <View style={styles.fieldGroup}>
                  <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                    {t('transactions.add.amount').toUpperCase()}
                  </Text>
                  <View style={[styles.amountRow, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
                    <Text variant="title3" color={colors.labelSecondary} style={{ marginLeft: Spacing.md }}>$</Text>
                    <TextInput
                      style={[styles.amountInput, { color: colors.label }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.labelTertiary}
                      value={amount}
                      onChangeText={v => { setAmount(formatAmountInput(v)); setErrors(e => ({ ...e, amount: '' })); }}
                      onFocus={onKbFocus}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                  {errors.amount ? (
                    <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.amount}</Text>
                  ) : null}
                </View>

                {/* Date */}
                <View style={styles.fieldGroup}>
                  <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                    {t('transactions.add.date').toUpperCase()}
                  </Text>
                  <DatePickerField
                    value={selectedDate}
                    onChange={d => setSelectedDate(d)}
                    colors={colors}
                  />
                </View>

                {/* Category (expense / income only) */}
                {txType !== 'transfer' && (
                  <View style={styles.fieldGroup}>
                    <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                      {t('transactions.add.category').toUpperCase()}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      {categories.map(cat => {
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
                            {isKnownIcon(cat.icon) ? (
                              <Icon name={cat.icon} size={14} color={cat.color} />
                            ) : (
                              <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                            )}
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
                      <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.category}</Text>
                    ) : null}
                  </View>
                )}

                {/* Source account */}
                <View style={styles.fieldGroup}>
                  <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                    {txType === 'transfer'
                      ? t('transactions.add.fromAccount').toUpperCase()
                      : t('transactions.add.account').toUpperCase()}
                  </Text>
                  <AccountSelect
                    accounts={accounts}
                    selectedId={selectedAccountId}
                    onSelect={id => { setSelectedAccountId(id); setErrors(e => ({ ...e, account: '' })); }}
                    colors={colors}
                  />
                  {errors.account ? (
                    <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.account}</Text>
                  ) : null}
                </View>

                {/* Destination account (transfer only) */}
                {txType === 'transfer' && destinationAccounts.length > 0 && (
                  <View style={styles.fieldGroup}>
                    <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                      {t('transactions.add.destinationAccount').toUpperCase()}
                    </Text>
                    <AccountSelect
                      accounts={destinationAccounts}
                      selectedId={destinationAccountId}
                      onSelect={id => { setDestinationAccountId(id); setErrors(e => ({ ...e, destination: '' })); }}
                      colors={colors}
                    />
                    {errors.destination ? (
                      <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.destination}</Text>
                    ) : null}
                  </View>
                )}

                {serverError ? (
                  <Text variant="caption1" color={colors.expense} align="center">{serverError}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: saveBtnColor }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text variant="headline" color="#ffffff">{t('transactions.edit.save')}</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
        </View>
      </Modal>

      <IconPicker
        visible={showEmojiPicker}
        current={iconName}
        onSelect={setIconName}
        title={t('transactions.add.icon')}
        onClose={() => setShowEmojiPicker(false)}
        colors={colors}
      />

      <ConfirmDialog
        visible={showDeleteConfirm}
        title={t('transactions.edit.deleteTitle')}
        message={t('transactions.edit.deleteMessage', { name: transaction?.description ?? '' })}
        confirmLabel={t('transactions.edit.delete')}
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

// ── AccountSelect ─────────────────────────────────────────────────────────────

function AccountSelect({
  accounts,
  selectedId,
  onSelect,
  colors,
}: {
  accounts: DashboardAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colors: AppColors;
}) {
  const [open, setOpen] = useState(false);
  const selected = accounts.find(a => a.id === selectedId);

  return (
    <View>
      <TouchableOpacity
        style={[styles.selectTrigger, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        {selected ? (
          <>
            <View style={[styles.accountDot, { backgroundColor: selected.color || colors.tint }]} />
            <View style={styles.accountMiddle}>
              <Text variant="callout" style={{ fontWeight: '500' }}>{selected.name}</Text>
              <Text variant="caption1" color={colors.labelSecondary}>${formatBalance(selected.balance)}</Text>
            </View>
          </>
        ) : (
          <Text variant="callout" color={colors.labelTertiary} style={{ flex: 1 }}>—</Text>
        )}
        <ChevronDownIcon color={open ? colors.tint : colors.labelTertiary} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.selectDropdown, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
          {accounts.map((acc, index) => (
            <View key={acc.id}>
              <TouchableOpacity
                onPress={() => { onSelect(acc.id); setOpen(false); }}
                style={styles.accountRow}
                activeOpacity={0.6}
              >
                <View style={[styles.accountDot, { backgroundColor: acc.color || colors.tint }]} />
                <View style={styles.accountMiddle}>
                  <Text variant="callout" style={{ fontWeight: '500' }}>{acc.name}</Text>
                  <Text variant="caption1" color={colors.labelSecondary}>${formatBalance(acc.balance)}</Text>
                </View>
                {selectedId === acc.id && <CheckIcon color={colors.tint} />}
              </TouchableOpacity>
              {index < accounts.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: 48 }]} />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.92,
    borderTopLeftRadius: Spacing.radius.xxl,
    borderTopRightRadius: Spacing.radius.xxl,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
  },
  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  typeRow: { flexDirection: 'row', gap: Spacing.xs },
  typeBtn: {
    flex: 1,
    height: 44,
    borderRadius: Spacing.radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { letterSpacing: 0.5, marginLeft: 2 },
  fieldError: { marginLeft: 2, marginTop: 2 },
  descRow: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  emojiBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  descInput: { flex: 1, height: 52, paddingHorizontal: Spacing.sm, fontSize: 16 },
  amountRow: { flexDirection: 'row', alignItems: 'center', height: 52, overflow: 'hidden' },
  amountInput: { flex: 1, height: 52, paddingHorizontal: Spacing.sm, fontSize: 20, fontWeight: '600' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  categoryScroll: { gap: Spacing.xs, paddingRight: 4 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Spacing.radius.full,
    borderWidth: 1.5,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 52,
  },
  selectDropdown: {
    overflow: 'hidden',
    marginTop: 4,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  accountDot: { width: 10, height: 10, borderRadius: 5 },
  accountMiddle: { flex: 1, gap: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  saveBtn: {
    height: 52,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
});
