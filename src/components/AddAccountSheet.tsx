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

const ACCOUNT_COLORS = [
  '#db2777', '#a855f7', '#059669', '#3b82f6',
  '#f97316', '#ef4444', '#eab308', '#6366f1',
  '#14b8a6', '#06b6d4',
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

export function AddAccountSheet({ visible, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(ACCOUNT_COLORS[2]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setBalance('');
    setColor(ACCOUNT_COLORS[2]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) { setError(t('account.error.nameRequired')); return; }
    const amount = parseFloat(balance.replace(',', '.'));
    if (isNaN(amount)) { setError(t('account.error.balanceInvalid')); return; }

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: dbError } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: name.trim(),
        balance: amount,
        initial_balance: amount,
        color,
      });
      if (dbError) throw dbError;

      reset();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving account');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.fillPrimary,
      color: colors.label,
      borderColor: colors.separator,
    },
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
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.fillPrimary }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text variant="headline">{t('account.add')}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <XIcon color={colors.labelSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {/* Name */}
            <Text variant="caption1" color={colors.labelSecondary} style={styles.fieldLabel}>
              {t('account.name')}
            </Text>
            <TextInput
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder={t('account.namePlaceholder')}
              placeholderTextColor={colors.labelTertiary}
              autoCapitalize="words"
              returnKeyType="next"
            />

            {/* Balance */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 16 }]}>
              {t('account.balance')}
            </Text>
            <TextInput
              style={inputStyle}
              value={balance}
              onChangeText={setBalance}
              placeholder="0.00"
              placeholderTextColor={colors.labelTertiary}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            {/* Color picker */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 16 }]}>
              {t('account.color')}
            </Text>
            <View style={styles.colorRow}>
              {ACCOUNT_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setColor(c)}
                  activeOpacity={0.8}
                />
              ))}
            </View>

            {error && (
              <Text variant="caption1" color={colors.expense} style={{ marginTop: 12 }}>
                {error}
              </Text>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.income }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text variant="headline" color="#fff">
                {saving ? '...' : t('account.save')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  kavWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
  },
  fieldLabel: {
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: Spacing.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  saveBtn: {
    marginTop: 24,
    height: 52,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
