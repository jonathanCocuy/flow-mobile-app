import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, useColorScheme, Dimensions, TextInput,
  ScrollView, Switch, Animated, PanResponder,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ContributeGoal {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
}

export interface ContributeAccount {
  id: string;
  name: string;
  balance: number;
  color: string;
}

interface Props {
  visible: boolean;
  goal: ContributeGoal | null;
  accounts: ContributeAccount[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ContributeGoalSheet({ visible, goal, accounts, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [amount, setAmount] = useState('');
  const [recordTx, setRecordTx] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

  useEffect(() => {
    if (visible && accounts.length > 0 && !accountId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccountId(accounts[0].id);
    }
  }, [visible, accounts, accountId]);

  const reset = () => {
    setAmount('');
    setRecordTx(false);
    setError(null);
  };

  function dismissSheet() {
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(() => {
      reset();
      onClose();
    });
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 0,
    onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy); },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 100 || vy > 0.8) {
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(() => {
          reset();
          onClose();
        });
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  const handleSave = async () => {
    if (!goal) return;
    const val = parseFloat(amount.replace(',', '.'));
    if (isNaN(val) || val <= 0) { setError(t('goal.error.amountInvalid')); return; }
    if (recordTx && !accountId) { setError(t('transactions.add.error.account')); return; }

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: (goal.current_amount ?? 0) + val })
        .eq('id', goal.id);
      if (updateError) throw updateError;

      if (recordTx && accountId) {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('transactions').insert({
          user_id: user.id,
          description: goal.name,
          amount: val,
          type: 'expense',
          category: 'other',
          account_id: accountId,
          date: today,
          currency: 'USD',
          exchange_rate: 1,
        });
      }

      reset();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  if (!goal) return null;

  const pct = goal.target_amount > 0 ? Math.min(((goal.current_amount ?? 0) / goal.target_amount) * 100, 100) : 0;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={dismissSheet}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.backgroundGrouped, transform: [{ translateY }] },
            ]}
          >
            {/* Handle — drag to close */}
            <View style={styles.handleZone} {...panResponder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: colors.separator }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text variant="headline">{t('goals.contributeTitle')}</Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
            >
              {/* Goal progress preview */}
              <View style={[styles.goalPreview, { backgroundColor: colors.fillPrimary }]}>
                <View style={styles.previewRow}>
                  <Text variant="callout" style={{ fontWeight: '600' }}>{goal.name}</Text>
                  <Text variant="callout" color={colors.labelSecondary}>{Math.round(pct)}%</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.separator, marginTop: 8 }]}>
                  <View style={[styles.progressFill, { backgroundColor: colors.savings, width: `${pct}%` }]} />
                </View>
                <View style={[styles.previewRow, { marginTop: 6 }]}>
                  <Text variant="caption1" color={colors.labelSecondary}>
                    ${(goal.current_amount ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                  <Text variant="caption1" color={colors.labelSecondary}>
                    ${goal.target_amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              <Text variant="caption1" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('goals.amount')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.fillPrimary, color: colors.label, borderColor: colors.separator }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.labelTertiary}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              {/* Record as transaction toggle */}
              <View style={styles.toggleRow}>
                <Text variant="callout">{t('goals.recordTransaction')}</Text>
                <Switch
                  value={recordTx}
                  onValueChange={setRecordTx}
                  trackColor={{ false: colors.fillPrimary, true: colors.savings }}
                  thumbColor="#fff"
                />
              </View>

              {/* Account picker (shown when recordTx = true) */}
              {recordTx && accounts.length > 0 && (
                <>
                  <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 16 }]}>
                    {t('goals.account')}
                  </Text>
                  <View style={styles.chipGrid}>
                    {accounts.map(acc => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.accountChip,
                          {
                            backgroundColor: accountId === acc.id ? `${acc.color}22` : colors.fillPrimary,
                            borderColor: accountId === acc.id ? acc.color : colors.separator,
                          },
                        ]}
                        onPress={() => setAccountId(acc.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.colorDot, { backgroundColor: acc.color }]} />
                        <Text
                          variant="caption1"
                          color={accountId === acc.id ? acc.color : colors.label}
                          numberOfLines={1}
                        >
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {error && (
                <Text variant="caption1" color={colors.expense} style={{ marginTop: 12 }}>
                  {error}
                </Text>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.savings }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text variant="headline" color="#fff">
                  {saving ? '...' : t('goals.contribute')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { paddingHorizontal: Spacing.md, paddingBottom: 12 },
  body: { paddingHorizontal: Spacing.md, paddingBottom: 8 },
  goalPreview: { borderRadius: Spacing.radius.md, padding: Spacing.md, marginBottom: 20 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  fieldLabel: { marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderRadius: Spacing.radius.md, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: Spacing.radius.md, borderWidth: 1,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  saveBtn: {
    marginTop: 24, height: 52,
    borderRadius: Spacing.radius.lg, alignItems: 'center', justifyContent: 'center',
  },
});
