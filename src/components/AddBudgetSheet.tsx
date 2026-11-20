import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Dimensions,
  TextInput,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { Icon, transactionIcon } from '@/components/ui/Icon';
import { formatAmountInput, parseAmountInput, toAmountInput } from '@/utils/amount';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { UserCategory } from '@/types/finance';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (id: string) => void;
  categories: UserCategory[];
  initialBudget?: { id?: string; category: string; monthly_limit: number } | null;
}

export function AddBudgetSheet({ visible, onClose, onSuccess, onDelete, categories, initialBudget }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isEditing = !!initialBudget?.id;

  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

  useEffect(() => {
    if (visible && initialBudget) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(initialBudget.category);
      setLimit(toAmountInput(initialBudget.monthly_limit));
      setError(null);
    } else if (visible && !initialBudget) {
      setCategory('');
      setLimit('');
      setError(null);
    }
  }, [visible, initialBudget]);

  const reset = () => {
    setCategory('');
    setLimit('');
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
    if (!category) { setError(t('budget.error.categoryRequired')); return; }
    const amount = parseAmountInput(limit);
    if (isNaN(amount) || amount <= 0) { setError(t('budget.error.limitInvalid')); return; }

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let dbError;
      if (initialBudget?.id) {
        ({ error: dbError } = await supabase
          .from('budgets')
          .update({ category, monthly_limit: amount })
          .eq('id', initialBudget.id));
      } else {
        ({ error: dbError } = await supabase
          .from('budgets')
          .upsert(
            { user_id: user.id, category, monthly_limit: amount, rollover_enabled: false },
            { onConflict: 'user_id,category' },
          ));
      }
      if (dbError) throw dbError;

      reset();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving budget');
    } finally {
      setSaving(false);
    }
  };

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
              <Text variant="headline">
                {isEditing ? t('budget.edit') : t('budget.add')}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
            >
              {/* Category grid */}
              <Text variant="caption1" color={colors.labelSecondary} style={styles.fieldLabel}>
                {t('transactions.add.category')}
              </Text>
              <View style={styles.categoryGrid}>
                {categories.map(cat => {
                  const selected = category === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: selected ? `${cat.color}22` : colors.fillPrimary,
                          borderColor: selected ? cat.color : colors.separator,
                        },
                      ]}
                      onPress={() => !isEditing && setCategory(cat.name)}
                      activeOpacity={isEditing ? 1 : 0.7}
                    >
                      <Icon
                        name={transactionIcon(cat.icon, 'expense', cat.name)}
                        size={16}
                        color={selected ? cat.color : colors.labelSecondary}
                      />
                      <Text
                        variant="caption1"
                        color={selected ? cat.color : colors.label}
                        style={{ fontWeight: selected ? '600' : '400' }}
                        numberOfLines={1}
                      >
                        {cat.label}
                      </Text>
                      {selected && <CheckIcon color={cat.color} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Monthly limit */}
              <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 20 }]}>
                {t('budget.monthlyLimit')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.fillPrimary, color: colors.label, borderColor: colors.separator }]}
                value={limit}
                onChangeText={v => setLimit(formatAmountInput(v))}
                placeholder="0.00"
                placeholderTextColor={colors.labelTertiary}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

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
                  {saving ? '...' : isEditing ? t('budget.update') : t('budget.save')}
                </Text>
              </TouchableOpacity>

              {isEditing && onDelete && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: colors.expense }]}
                  onPress={() => setDeleteConfirm(true)}
                  activeOpacity={0.85}
                >
                  <Text variant="headline" color={colors.expense}>
                    {t('common.delete')}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>

      <ConfirmDialog
        visible={deleteConfirm}
        title={t('budgets.deleteTitle')}
        message={t('budgets.deleteMessage', { name: categories.find(c => c.name === category)?.label ?? category })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          setDeleteConfirm(false);
          if (initialBudget?.id && onDelete) onDelete(initialBudget.id);
        }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
  },
  body: { paddingHorizontal: Spacing.md, paddingBottom: 8 },
  fieldLabel: { marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: Spacing.radius.md, borderWidth: 1,
  },
  input: {
    borderRadius: Spacing.radius.md, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
  saveBtn: {
    marginTop: 24, height: 52,
    borderRadius: Spacing.radius.lg, alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    marginTop: 12, height: 52,
    borderRadius: Spacing.radius.lg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
});
