import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLOR_OPTIONS = [
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

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface AccountLike {
  id: string;
  name: string;
  color: string;
}

interface Props {
  visible: boolean;
  account: AccountLike;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditAccountSheet({ visible, account, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState(account.name);
  const [color, setColor] = useState(account.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(account.name);
    setColor(account.color);
    setError(null);
  }, [account]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError(t('account.error.nameRequired')); return; }

    setSaving(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('accounts')
        .update({ name: trimmed, color })
        .eq('id', account.id);
      if (dbError) throw dbError;
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving account');
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
            <Text variant="headline">{t('accounts.edit')}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <XIcon color={colors.labelSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {/* Name */}
            <Text variant="caption1" color={colors.labelSecondary} style={styles.fieldLabel}>
              {t('account.name')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.fillPrimary, color: colors.label, borderColor: colors.separator }]}
              value={name}
              onChangeText={setName}
              placeholder={t('account.namePlaceholder')}
              placeholderTextColor={colors.labelTertiary}
              returnKeyType="done"
            />

            {/* Color picker */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 20 }]}>
              {t('account.color')}
            </Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]}
                  onPress={() => setColor(c)}
                  activeOpacity={0.75}
                >
                  {color === c && <CheckIcon color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            {error && (
              <Text variant="caption1" color={colors.expense} style={{ marginTop: 12 }}>
                {error}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.tint }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text variant="headline" color={colors.tintForeground}>
                {saving ? '...' : t('account.save')}
              </Text>
            </TouchableOpacity>
          </View>
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
    maxHeight: SCREEN_HEIGHT * 0.75,
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
  input: {
    borderRadius: Spacing.radius.md, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  saveBtn: {
    marginTop: 24, height: 52,
    borderRadius: Spacing.radius.lg, alignItems: 'center', justifyContent: 'center',
  },
});
