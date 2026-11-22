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
  Switch,
} from 'react-native';
import { useKeyboardShift } from '@/hooks/useKeyboardShift';
import Svg, { Path, Polyline } from 'react-native-svg';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { Icon, transactionIcon, isKnownIcon } from '@/components/ui/Icon';
import { IconPicker } from '@/components/ui/IconPicker';
import { formatAmountInput, parseAmountInput } from '@/utils/amount';
import type { DashboardAccount, UserCategory } from '@/types/finance';
import { CategoryModal } from '@/components/CategoryModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type TxType = 'expense' | 'income' | 'transfer';
type AppColors = typeof Colors[keyof typeof Colors];

interface SplitGroup {
  id: string;
  name: string;
  icon: string | null;
  shared_members: { id: string; is_me: boolean }[];
}

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

// ── Icon picker ───────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBalance(value: number): string {
  return Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// ── Props ─────────────────────────────────────────────────────────────────────

interface AddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onCategoryCreated?: () => void;
  accounts: DashboardAccount[];
  categories: UserCategory[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddTransactionSheet({
  visible,
  onClose,
  onSuccess,
  onCategoryCreated,
  accounts,
  categories,
}: AddTransactionSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [txType, setTxType] = useState<TxType>('expense');
  const [iconName, setIconName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<UserCategory | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [sharedGroupId, setSharedGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<SplitGroup[]>([]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTxType('expense');
      setIconName('');
      setDescription('');
      setAmount('');
      setSelectedDate(new Date());
      setShowEmojiPicker(false);
      setSelectedCategory(null);
      setSelectedAccountId(accounts[0]?.id ?? null);
      setDestinationAccountId(null);
      setErrors({});
      setServerError(null);
      setSaving(false);
      setIsShared(false);
      setSharedGroupId(null);
    }
  }, [visible, accounts]);

  // RLS already scopes this to groups the user owns or belongs to.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    supabase
      .from('shared_groups')
      .select('id, name, icon, shared_members(id, is_me)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setGroups((data ?? []) as SplitGroup[]);
      });
    return () => { cancelled = true; };
  }, [visible]);

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

  async function handleSubmit() {
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
    if (txType === 'expense' && isShared && !sharedGroupId) {
      newErrors.sharedGroup = t('transactions.add.error.sharedGroup');
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setErrors({});
    setServerError(null);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setServerError('Not authenticated'); setSaving(false); return; }

      const y = selectedDate.getFullYear();
      const mo = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      const dateISO = `${y}-${mo}-${d}`;
      const descTrimmed = description.trim();
      const iconVal = iconName || (txType === 'transfer' ? 'ArrowRightLeft' : selectedCategory?.icon ?? 'Wallet');

      let error;
      if (txType === 'transfer') {
        const { error: e } = await supabase.rpc('create_transfer', {
          p_user_id:     user.id,
          p_from_id:     selectedAccountId,
          p_to_id:       destinationAccountId,
          p_amount:      amountNum,
          p_description: descTrimmed,
          p_icon:        iconVal,
          p_date:        dateISO,
        });
        error = e;
      } else {
        const shareWithGroup = txType === 'expense' && isShared && !!sharedGroupId;
        const payload = {
          user_id:    user.id,
          account_id: selectedAccountId,
          description: descTrimmed,
          icon:        iconVal,
          amount:      amountNum,
          category:    selectedCategory!.name,
          type:        txType,
          date:        dateISO,
          currency:    'USD',
          exchange_rate: 1,
          group_id:    shareWithGroup ? sharedGroupId : null,
        };

        if (shareWithGroup) {
          const { data, error: txErr } = await supabase
            .from('transactions').insert(payload).select('id').single();
          if (txErr) {
            error = txErr;
          } else {
            // Mirror into the group so it counts towards the split balance.
            // The payer is whichever member the group marks as "me".
            const meId = groups.find(g => g.id === sharedGroupId)
              ?.shared_members.find(m => m.is_me)?.id ?? null;
            const { error: splitErr } = await supabase.from('shared_expenses').insert({
              group_id:          sharedGroupId,
              description:       descTrimmed,
              amount:            amountNum,
              category:          'other',
              date:              dateISO,
              paid_by_member_id: meId,
              account_id:        selectedAccountId,
              transaction_id:    data.id,
            });
            error = splitErr;
          }
        } else {
          const { error: e } = await supabase.from('transactions').insert(payload);
          error = e;
        }
      }

      if (error) { setServerError(error.message); setSaving(false); return; }
      onSuccess();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Unknown error');
      setSaving(false);
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

  // accounts the user can pick as destination (exclude source)
  const destinationAccounts = accounts.filter(a => a.id !== selectedAccountId);

  return (
    <>
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
        <View style={styles.root}>
          <TouchableWithoutFeedback onPress={dismissSheet}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

            <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundGroupedSecondary, transform: [{ translateY: Animated.subtract(translateY, kbShift) }] }]}>
              {/* Handle — drag here to close */}
              <View style={styles.handleZone} {...panResponder.panHandlers}>
                <View style={[styles.handle, { backgroundColor: colors.separator }]} />
              </View>

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
                        onPress={() => {
                          setTxType(opt.key);
                          setErrors({});
                          if (opt.key !== 'expense') { setIsShared(false); setSharedGroupId(null); }
                        }}
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
                        name={iconName || transactionIcon(selectedCategory?.icon, txType, selectedCategory?.name)}
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
                      {/* Add category placeholder */}
                      <TouchableOpacity
                        style={[styles.categoryPill, { backgroundColor: '#fbbf2420', borderColor: '#fbbf24' }]}
                        activeOpacity={0.7}
                        onPress={() => setCategoryModalVisible(true)}
                      >
                        <Text variant="subheadline" color="#fbbf24" style={{ fontWeight: '600' }}>
                          + {t('transactions.add.addCategory')}
                        </Text>
                      </TouchableOpacity>
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

                {/* Shared expense (expense only, and only once a group exists) */}
                {txType === 'expense' && groups.length > 0 && (
                  <View style={styles.fieldGroup}>
                    <View style={[styles.sharedRow, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
                      <Text variant="callout" style={{ flex: 1 }}>{t('transactions.add.shared')}</Text>
                      <Switch
                        value={isShared}
                        onValueChange={v => {
                          setIsShared(v);
                          // One group is an unambiguous choice — preselect it.
                          setSharedGroupId(v && groups.length === 1 ? groups[0].id : null);
                          setErrors(e => ({ ...e, sharedGroup: '' }));
                        }}
                        trackColor={{ true: colors.tint }}
                      />
                    </View>
                    {isShared && (
                      <>
                        <GroupSelect
                          groups={groups}
                          selectedId={sharedGroupId}
                          onSelect={id => { setSharedGroupId(id); setErrors(e => ({ ...e, sharedGroup: '' })); }}
                          colors={colors}
                          placeholder={t('transactions.add.sharedGroupPlaceholder')}
                        />
                        {errors.sharedGroup ? (
                          <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.sharedGroup}</Text>
                        ) : null}
                      </>
                    )}
                  </View>
                )}

                {/* Destination account (transfer only) */}
                {txType === 'transfer' && (
                  <View style={styles.fieldGroup}>
                    <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                      {t('transactions.add.destinationAccount').toUpperCase()}
                    </Text>
                    {destinationAccounts.length === 0 ? (
                      <View style={[styles.emptyTransfer, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
                        <Icon name="Landmark" size={30} color={colors.labelTertiary} strokeWidth={1.5} />
                        <Text variant="callout" align="center" style={{ fontWeight: '600', marginTop: 6 }}>
                          {t('transactions.add.transfer.onlyOneAccount')}
                        </Text>
                        <Text variant="footnote" color={colors.labelSecondary} align="center" style={{ marginTop: 4 }}>
                          {t('transactions.add.transfer.onlyOneAccountHint')}
                        </Text>
                        <TouchableOpacity
                          style={[styles.createAccountBtn, { backgroundColor: colors.tint }]}
                          onPress={() => { onClose(); router.push('/(tabs)/profile'); }}
                          activeOpacity={0.8}
                        >
                          <Text variant="subheadline" color={colors.tintForeground} style={{ fontWeight: '600' }}>
                            {t('transactions.add.transfer.goToProfile')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <AccountSelect
                          accounts={destinationAccounts}
                          selectedId={destinationAccountId}
                          onSelect={id => { setDestinationAccountId(id); setErrors(e => ({ ...e, destination: '' })); }}
                          colors={colors}
                        />
                        {errors.destination ? (
                          <Text variant="caption1" color={colors.expense} style={styles.fieldError}>{errors.destination}</Text>
                        ) : null}
                      </>
                    )}
                  </View>
                )}

                {/* Server error */}
                {serverError ? (
                  <Text variant="caption1" color={colors.expense} align="center">{serverError}</Text>
                ) : null}

                {/* Save */}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: saveBtnColor }]}
                  onPress={handleSubmit}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text variant="headline" color="#ffffff">{t('transactions.add.save')}</Text>
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
        onClose={() => setShowEmojiPicker(false)}
        colors={colors}
        title={t('transactions.add.icon')}
      />
      <CategoryModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSuccess={() => { setCategoryModalVisible(false); onCategoryCreated?.(); }}
      />
    </>
  );
}

// ── AccountSelect sub-component ───────────────────────────────────────────────

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

// ── GroupSelect sub-component ─────────────────────────────────────────────────

function GroupSelect({
  groups,
  selectedId,
  onSelect,
  colors,
  placeholder,
}: {
  groups: SplitGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colors: AppColors;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = groups.find(g => g.id === selectedId);

  return (
    <View>
      <TouchableOpacity
        style={[styles.selectTrigger, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        {selected ? (
          <>
            <View style={[styles.groupAvatar, { backgroundColor: `${colors.tint}18` }]}>
              {isKnownIcon(selected.icon) ? (
                <Icon name={selected.icon} size={15} color={colors.tint} />
              ) : (
                <Text variant="caption1" color={colors.tint} style={{ fontWeight: '700' }}>
                  {selected.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text variant="callout" style={{ flex: 1, fontWeight: '500' }}>{selected.name}</Text>
          </>
        ) : (
          <Text variant="callout" color={colors.labelTertiary} style={{ flex: 1 }}>{placeholder}</Text>
        )}
        <ChevronDownIcon color={open ? colors.tint : colors.labelTertiary} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.selectDropdown, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
          {groups.map((g, index) => (
            <View key={g.id}>
              <TouchableOpacity
                onPress={() => { onSelect(g.id); setOpen(false); }}
                style={styles.accountRow}
                activeOpacity={0.6}
              >
                <View style={[styles.groupAvatar, { backgroundColor: `${colors.tint}18` }]}>
                  {isKnownIcon(g.icon) ? (
                    <Icon name={g.icon} size={15} color={colors.tint} />
                  ) : (
                    <Text variant="caption1" color={colors.tint} style={{ fontWeight: '700' }}>
                      {g.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text variant="callout" style={{ flex: 1, fontWeight: '500' }}>{g.name}</Text>
                {selectedId === g.id && <CheckIcon color={colors.tint} />}
              </TouchableOpacity>
              {index < groups.length - 1 && (
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

  sharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 52,
  },
  groupAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveBtn: {
    height: 52,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  emptyTransfer: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  createAccountBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Spacing.radius.full,
  },
});
