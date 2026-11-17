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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GOAL_EMOJIS = [
  '🎯','🏠','🚗','✈️','💻','📱','🎓','💰','🛡️','🌴',
  '💍','🏋️','🎸','🐾','🍽️','⛵','🎁','🌿','🏖️','🏔️',
];

function XIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddGoalSheet({ visible, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setTargetAmount('');
    setDeadline('');
    setIcon('🎯');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) { setError(t('goal.error.nameRequired')); return; }
    const amount = parseFloat(targetAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) { setError(t('goal.error.amountInvalid')); return; }

    let deadlineISO: string | null = null;
    if (deadline.trim()) {
      const parsed = new Date(deadline.trim());
      if (isNaN(parsed.getTime())) { setError(t('goal.error.deadlineInvalid')); return; }
      deadlineISO = parsed.toISOString().split('T')[0];
    }

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: dbError } = await supabase.from('savings_goals').insert({
        user_id: user.id,
        name: name.trim(),
        target_amount: amount,
        deadline: deadlineISO,
        icon,
      });
      if (dbError) throw dbError;

      reset();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving goal');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.fillPrimary, color: colors.label, borderColor: colors.separator },
  ];

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
            <Text variant="headline">{t('goal.add')}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <XIcon color={colors.labelSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {/* Emoji picker */}
            <Text variant="caption1" color={colors.labelSecondary} style={styles.fieldLabel}>
              {t('goal.icon')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              <View style={styles.emojiRow}>
                {GOAL_EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[
                      styles.emojiBtn,
                      { backgroundColor: colors.fillPrimary },
                      icon === e && { backgroundColor: `${colors.savings}22`, borderColor: colors.savings, borderWidth: 1.5 },
                    ]}
                    onPress={() => setIcon(e)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Name */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 16 }]}>
              {t('goal.name')}
            </Text>
            <TextInput
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder={t('goal.namePlaceholder')}
              placeholderTextColor={colors.labelTertiary}
              autoCapitalize="sentences"
              returnKeyType="next"
            />

            {/* Target amount */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 16 }]}>
              {t('goal.targetAmount')}
            </Text>
            <TextInput
              style={inputStyle}
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="0.00"
              placeholderTextColor={colors.labelTertiary}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            {/* Deadline (optional) */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 16 }]}>
              {t('goal.deadline')}
            </Text>
            <TextInput
              style={inputStyle}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.labelTertiary}
              keyboardType="numbers-and-punctuation"
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
                {saving ? '...' : t('goal.save')}
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
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85, paddingBottom: Platform.OS === 'ios' ? 34 : 24,
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
  fieldLabel: { marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  emojiScroll: { marginBottom: 4 },
  emojiRow: { flexDirection: 'row', gap: 8 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
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
