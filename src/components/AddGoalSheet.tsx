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
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GOAL_EMOJIS = [
  '🎯','🏠','🚗','✈️','💻','📱','🎓','💰','🛡️','🌴',
  '💍','🏋️','🎸','🐾','🍽️','⛵','🎁','🌿','🏖️','🏔️',
];

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

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

  const reset = () => {
    setName('');
    setTargetAmount('');
    setDeadline('');
    setIcon('🎯');
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
              <Text variant="headline">{t('goal.add')}</Text>
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
});
