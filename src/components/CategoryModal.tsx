import React, { useState, useEffect } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, useColorScheme, Dimensions, TextInput,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#ef4444', '#fbbf24',
  '#22c55e', '#db2777', '#06b6d4', '#14b8a6', '#6366f1',
];

const CATEGORY_EMOJIS = [
  '🏠','🍕','🚗','💊','🛒','✈️','🎬','👕','📚','💪',
  '🐾','🎮','💳','💰','🏦','🎁','🍺','☕','🚌','💡',
  '🏥','📱','🎵','🌳','👶','🎓','🔧','🍔','🛍️','💄',
  '🏖️','🍷','🎸','📺','🎯','⚡','🌮','🧴','🏋️','🎪',
];

export interface CategoryData {
  id: string;
  label: string;
  color: string;
  icon: string;
}

function XIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface Props {
  visible: boolean;
  category?: CategoryData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoryModal({ visible, category, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [label, setLabel] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (category) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLabel(category.label);
      setColor(category.color);
      setIcon(category.icon || '');
    } else {
      setLabel('');
      setColor(CATEGORY_COLORS[0]);
      setIcon('');
    }
    setError(null);
  }, [visible, category]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) { setError(t('categories.error.nameRequired')); return; }
    const trimmedIcon = icon.trim();

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (category) {
        const { error: dbError } = await supabase
          .from('categories')
          .update({ label: trimmedLabel, color, icon: trimmedIcon })
          .eq('id', category.id);
        if (dbError) throw dbError;
      } else {
        const slug = trimmedLabel
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        const name = `${slug || 'cat'}_${Date.now().toString(36)}`;
        const { error: dbError } = await supabase.from('categories').insert({
          user_id: user.id,
          name,
          label: trimmedLabel,
          color,
          icon: trimmedIcon,
        });
        if (dbError) throw dbError;
      }

      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!category) return;
    setDeleteDialogVisible(true);
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
            <Text variant="headline">
              {category ? t('categories.edit') : t('categories.add')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {category && (
                <TouchableOpacity onPress={handleDelete} hitSlop={12}>
                  <TrashIcon color={colors.expense} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <XIcon color={colors.labelSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {/* Label */}
            <Text variant="caption1" color={colors.labelSecondary} style={styles.fieldLabel}>
              {t('categories.label')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.fillPrimary, color: colors.label, borderColor: colors.separator }]}
              value={label}
              onChangeText={setLabel}
              placeholder={t('categories.labelPlaceholder')}
              placeholderTextColor={colors.labelTertiary}
              autoCapitalize="sentences"
              returnKeyType="next"
            />

            {/* Color */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 20 }]}>
              {t('categories.color')}
            </Text>
            <View style={styles.colorRow}>
              {CATEGORY_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorBtn,
                    { backgroundColor: c },
                    color === c && {
                      borderWidth: 3,
                      borderColor: '#fff',
                      shadowColor: c,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.5,
                      shadowRadius: 4,
                      elevation: 4,
                    },
                  ]}
                  onPress={() => setColor(c)}
                  activeOpacity={0.8}
                />
              ))}
            </View>

            {/* Emoji picker */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: 20 }]}>
              {t('categories.icon')}
            </Text>

            {/* Preview */}
            <View style={{ marginBottom: 12 }}>
              <View style={[styles.emojiPreview, { backgroundColor: color + '33' }]}>
                {icon && /[^\x20-\x7E]/.test(icon) ? (
                  <Text style={{ fontSize: 22, lineHeight: 28, textAlign: 'center' }}>{icon}</Text>
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '700', color, textAlign: 'center' }}>
                    {label.charAt(0).toUpperCase() || '?'}
                  </Text>
                )}
              </View>
            </View>

            {/* Grid */}
            <View style={styles.emojiGrid}>
              {CATEGORY_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, icon === e && { backgroundColor: color + '33', borderColor: color, borderWidth: 2 }]}
                  onPress={() => setIcon(e)}
                  activeOpacity={0.6}
                >
                  <Text style={{ fontSize: 20, textAlign: 'center' }}>{e}</Text>
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
                {saving ? '...' : t('categories.save')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={deleteDialogVisible}
        title={t('categories.deleteTitle')}
        message={category ? t('categories.deleteMessage', { name: category.label }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={async () => {
          setDeleteDialogVisible(false);
          if (!category) return;
          try {
            await supabase.from('categories').delete().eq('id', category.id);
            onSuccess();
          } catch {}
        }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
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
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 },
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
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorBtn: { width: 32, height: 32, borderRadius: 16 },
  emojiPreview: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtn: {
    marginTop: 24, height: 52,
    borderRadius: Spacing.radius.lg, alignItems: 'center', justifyContent: 'center',
  },
});
