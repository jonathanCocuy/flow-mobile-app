import React, { useState, useEffect, useCallback } from 'react';
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
  TextInput,
} from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import type { DashboardAccount, UserCategory } from '@/types/finance';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type TxType = 'expense' | 'income' | 'transfer';
type AppColors = typeof Colors[keyof typeof Colors];

// ── Emoji data ────────────────────────────────────────────────────────────────

const EMOJIS = [
  '🍔','🍕','☕','🍺','🛒','🏠','🏢','🚗','✈️','🚌','⛽',
  '🏥','💊','🎵','🎮','📺','🎬','👕','👟','💻','📱','📚',
  '🎓','⚽','🎁','🐕','🌊','🍽️','💰','💸','🔧','⚡','💡',
  '🎪','🌿','🧴','🧺','🎨','🎤','🏋️','🛁','🏖️','🎂','🧁',
];

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M8 2v3M16 2v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronLeftIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAY_LETTERS = ['D','L','M','X','J','V','S'];

function CalendarPicker({
  date,
  onSelect,
  colors,
}: {
  date: Date;
  onSelect: (d: Date) => void;
  colors: AppColors;
}) {
  const [viewYear, setViewYear] = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goFwd = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();
  const isSelected = (d: number) =>
    d === date.getDate() && viewMonth === date.getMonth() && viewYear === date.getFullYear();
  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isFuture = (d: number) => new Date(viewYear, viewMonth, d) > today;

  return (
    <View style={[calStyles.root, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
      {/* Nav */}
      <View style={calStyles.nav}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeftIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="callout" style={{ fontWeight: '600' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={goFwd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronRightIcon color={colors.label} />
        </TouchableOpacity>
      </View>
      {/* Day headers */}
      <View style={calStyles.row}>
        {DAY_LETTERS.map(l => (
          <View key={l} style={calStyles.cell}>
            <Text variant="caption2" color={colors.labelTertiary} align="center" style={{ fontWeight: '600' }}>
              {l}
            </Text>
          </View>
        ))}
      </View>
      {/* Day grid */}
      <View style={calStyles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={`blank-${i}`} style={calStyles.cell} />;
          const sel = isSelected(d);
          const tod = isToday(d);
          const fut = isFuture(d);
          return (
            <TouchableOpacity
              key={d}
              style={calStyles.cell}
              onPress={() => !fut && onSelect(new Date(viewYear, viewMonth, d))}
              activeOpacity={fut ? 1 : 0.7}
            >
              <View style={[
                calStyles.dayCircle,
                sel && { backgroundColor: colors.tint },
                !sel && tod && { borderWidth: 1.5, borderColor: colors.tint },
              ]}>
                <Text
                  variant="footnote"
                  align="center"
                  color={sel ? colors.tintForeground : fut ? colors.labelTertiary : colors.label}
                  style={{ fontWeight: sel || tod ? '700' : '400' }}
                >
                  {d}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  root: { padding: Spacing.sm, marginTop: 4 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: Spacing.xs },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});

// ── Emoji picker ──────────────────────────────────────────────────────────────

function EmojiPicker({
  visible,
  current,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  current: string;
  onSelect: (e: string) => void;
  onClose: () => void;
  colors: AppColors;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={emojiStyles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[emojiStyles.box, { backgroundColor: colors.backgroundGroupedSecondary }]}>
              <Text variant="footnote" color={colors.labelSecondary} style={{ marginBottom: Spacing.xs }}>
                EMOJI
              </Text>
              <View style={emojiStyles.grid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => { onSelect(e); onClose(); }}
                    style={[
                      emojiStyles.cell,
                      e === current && { backgroundColor: `${colors.tint}20`, borderRadius: 8 },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text variant="title3" align="center">{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const emojiStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', borderRadius: 20, padding: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBalance(value: number): string {
  return Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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

  const [txType, setTxType] = useState<TxType>('expense');
  const [emoji, setEmoji] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<UserCategory | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTxType('expense');
      setEmoji('');
      setDescription('');
      setAmount('');
      setSelectedDate(new Date());
      setShowCalendar(false);
      setShowEmojiPicker(false);
      setSelectedCategory(null);
      setSelectedAccountId(accounts[0]?.id ?? null);
      setDestinationAccountId(null);
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setServerError('Not authenticated'); setSaving(false); return; }

      const dateISO = selectedDate.toISOString();
      const descTrimmed = description.trim();
      const iconVal = emoji || (txType === 'transfer' ? 'ArrowRightLeft' : selectedCategory?.icon ?? 'Wallet');

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
        const { error: e } = await supabase.from('transactions').insert({
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
        });
        error = e;
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
      <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.root}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={[styles.sheet, { backgroundColor: colors.backgroundGroupedSecondary }]}>
              {/* Handle */}
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
                      <Text variant="title3" align="center">{emoji || '😊'}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.descInput, { color: colors.label }]}
                      placeholder={t('transactions.add.descriptionPlaceholder')}
                      placeholderTextColor={colors.labelTertiary}
                      value={description}
                      onChangeText={v => { setDescription(v); setErrors(e => ({ ...e, description: '' })); }}
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
                      onChangeText={v => { setAmount(v); setErrors(e => ({ ...e, amount: '' })); }}
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
                  <TouchableOpacity
                    onPress={() => setShowCalendar(v => !v)}
                    style={[styles.dateRow, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}
                    activeOpacity={0.7}
                  >
                    <CalendarIcon color={colors.labelSecondary} />
                    <Text variant="callout" style={{ flex: 1 }}>{formatDate(selectedDate)}</Text>
                    <ChevronRightIcon color={colors.labelTertiary} />
                  </TouchableOpacity>
                  {showCalendar && (
                    <CalendarPicker
                      date={selectedDate}
                      onSelect={d => { setSelectedDate(d); setShowCalendar(false); }}
                      colors={colors}
                    />
                  )}
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
                      {/* Add category placeholder */}
                      <TouchableOpacity
                        style={[styles.categoryPill, { backgroundColor: '#fbbf2420', borderColor: '#fbbf24' }]}
                        activeOpacity={0.7}
                        onPress={() => {/* TODO: add category */}}
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
                  <AccountList
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
                {txType === 'transfer' && (
                  <View style={styles.fieldGroup}>
                    <Text variant="footnote" color={colors.labelSecondary} style={styles.fieldLabel}>
                      {t('transactions.add.destinationAccount').toUpperCase()}
                    </Text>
                    {destinationAccounts.length === 0 ? (
                      <View style={[styles.emptyTransfer, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
                        <Text variant="title3" align="center">🏦</Text>
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
                        <AccountList
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
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <EmojiPicker
        visible={showEmojiPicker}
        current={emoji}
        onSelect={setEmoji}
        onClose={() => setShowEmojiPicker(false)}
        colors={colors}
      />
    </>
  );
}

// ── AccountList sub-component ─────────────────────────────────────────────────

function AccountList({
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
  return (
    <View style={[styles.accountList, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
      {accounts.map((acc, index) => {
        const active = selectedId === acc.id;
        return (
          <View key={acc.id}>
            <TouchableOpacity
              onPress={() => onSelect(acc.id)}
              style={styles.accountRow}
              activeOpacity={0.6}
            >
              <View style={[styles.accountDot, { backgroundColor: acc.color || colors.tint }]} />
              <View style={styles.accountMiddle}>
                <Text variant="callout" style={{ fontWeight: '500' }}>{acc.name}</Text>
                <Text variant="caption1" color={colors.labelSecondary}>${formatBalance(acc.balance)}</Text>
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
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  keyboardView: { justifyContent: 'flex-end' },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.92,
    borderTopLeftRadius: Spacing.radius.xxl,
    borderTopRightRadius: Spacing.radius.xxl,
    paddingBottom: 32,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
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

  accountList: { overflow: 'hidden' },
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
