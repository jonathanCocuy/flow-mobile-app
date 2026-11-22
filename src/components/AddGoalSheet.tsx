import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  useColorScheme,
  Dimensions,
  TextInput,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { useKeyboardShift } from '@/hooks/useKeyboardShift';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Icon, isKnownIcon } from '@/components/ui/Icon';
import { formatAmountInput, parseAmountInput, toAmountInput } from '@/utils/amount';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GOAL_ICONS = [
  'Target', 'Home', 'Car', 'Plane', 'Laptop', 'Smartphone', 'GraduationCap',
  'PiggyBank', 'ShieldCheck', 'Palmtree',
  'Gem', 'Dumbbell', 'Music', 'Dog', 'Utensils', 'Sailboat', 'Gift', 'Leaf',
  'Umbrella', 'Mountain',
];

interface InitialGoal {
  id: string;
  name: string;
  target_amount: number;
  deadline: string | null;
  icon: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (id: string) => void;
  initialGoal?: InitialGoal | null;
}

export function AddGoalSheet({ visible, onClose, onSuccess, onDelete, initialGoal }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isEditing = !!initialGoal?.id;

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState(new Date());
  const [icon, setIcon] = useState('Target');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);
  const { shift: kbShift, onFocus: onKbFocus } = useKeyboardShift(visible);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

  useEffect(() => {
    if (visible && initialGoal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(initialGoal.name);
      setTargetAmount(toAmountInput(initialGoal.target_amount));
      if (initialGoal.deadline) {
        setDeadlineEnabled(true);
        const parts = initialGoal.deadline.split('-').map(Number);
        setSelectedDeadline(new Date(parts[0], parts[1] - 1, parts[2]));
      } else {
        setDeadlineEnabled(false);
        setSelectedDeadline(new Date());
      }
      setIcon(isKnownIcon(initialGoal.icon) ? initialGoal.icon! : 'Target');
      setError(null);
    } else if (visible && !initialGoal) {
      setName('');
      setTargetAmount('');
      setDeadlineEnabled(false);
      setSelectedDeadline(new Date());
      setIcon('Target');
      setError(null);
    }
  }, [visible, initialGoal]);

  const reset = () => {
    setName('');
    setTargetAmount('');
    setDeadlineEnabled(false);
    setSelectedDeadline(new Date());
    setIcon('Target');
    setError(null);
  };

  function dismissSheet() {
    Keyboard.dismiss();
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
    if (!name.trim()) { setError(t('goal.error.nameRequired')); return; }
    const amount = parseAmountInput(targetAmount);
    if (isNaN(amount) || amount <= 0) { setError(t('goal.error.amountInvalid')); return; }

    const deadlineISO: string | null = deadlineEnabled
      ? `${selectedDeadline.getFullYear()}-${String(selectedDeadline.getMonth() + 1).padStart(2, '0')}-${String(selectedDeadline.getDate()).padStart(2, '0')}`
      : null;

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let dbError;
      if (initialGoal?.id) {
        ({ error: dbError } = await supabase
          .from('savings_goals')
          .update({ name: name.trim(), target_amount: amount, deadline: deadlineISO, icon })
          .eq('id', initialGoal.id));
      } else {
        ({ error: dbError } = await supabase.from('savings_goals').insert({
          user_id: user.id,
          name: name.trim(),
          target_amount: amount,
          deadline: deadlineISO,
          icon,
        }));
      }
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
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={dismissSheet}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.backgroundGrouped, transform: [{ translateY: Animated.subtract(translateY, kbShift) }] },
            ]}
          >
            {/* Handle — drag to close */}
            <View style={styles.handleZone} {...panResponder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: colors.separator }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text variant="headline">{isEditing ? t('goal.edit') : t('goal.add')}</Text>
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
                  {GOAL_ICONS.map(e => (
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
                      <Icon name={e} size={20} color={icon === e ? colors.savings : colors.labelSecondary} />
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
                onFocus={onKbFocus}
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
                onChangeText={v => setTargetAmount(formatAmountInput(v))}
                onFocus={onKbFocus}
                placeholder="0.00"
                placeholderTextColor={colors.labelTertiary}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              {/* Deadline (optional) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
                <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginBottom: 0, flex: 1 }]}>
                  {t('goal.deadline')}
                </Text>
                <TouchableOpacity
                  onPress={() => setDeadlineEnabled(v => !v)}
                  style={[
                    { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
                    { backgroundColor: deadlineEnabled ? colors.savings : colors.fillPrimary },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[
                    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
                    { transform: [{ translateX: deadlineEnabled ? 18 : 0 }] },
                  ]} />
                </TouchableOpacity>
              </View>
              {deadlineEnabled && (
                <DatePickerField
                  value={selectedDeadline}
                  onChange={d => setSelectedDeadline(d)}
                  colors={colors}
                />
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
                  {saving ? '...' : isEditing ? t('goal.update') : t('goal.save')}
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
      </View>

      <ConfirmDialog
        visible={deleteConfirm}
        title={t('goals.deleteTitle')}
        message={t('goals.deleteMessage', { name })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          setDeleteConfirm(false);
          if (initialGoal?.id && onDelete) onDelete(initialGoal.id);
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
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85, paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { paddingHorizontal: Spacing.md, paddingBottom: 12 },
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
  deleteBtn: {
    marginTop: 12, height: 52,
    borderRadius: Spacing.radius.lg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
});
