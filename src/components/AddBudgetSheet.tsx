import React, { useState } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import type { UserCategory } from '@/types/finance';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function XIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

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
  categories: UserCategory[];
}

export function AddBudgetSheet({ visible, onClose, onSuccess, categories }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCategory('');
    setLimit('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!category) { setError(t('budget.error.categoryRequired')); return; }
    const amount = parseFloat(limit.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) { setError(t('budget.error.limitInvalid')); return; }

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: dbError } = await supabase
        .from('budgets')
        .upsert(
          { user_id: user.id, category, monthly_limit: amount, rollover_enabled: false },
          { onConflict: 'user_id,category' }
        );
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavWrapper}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { backgroundColor: colors.backgroundGrouped }]}>
          <View style={[styles.handle, { backgroundColor: colors.fillPrimary }]} />

          <View style={styles.header}>
            <Text variant="headline">{t('budget.add')}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <XIcon color={colors.labelSecondary} />
            </TouchableOpacity>
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
                    onPress={() => setCategory(cat.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16 }}>{getCategoryEmoji(cat.name, 'expense')}</Text>
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
              onChangeText={setLimit}
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
                {saving ? '...' : t('budget.save')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  kavWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 8, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
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
});
