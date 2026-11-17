import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* Backdrop — full screen, dark overlay, closes on tap */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Card — stops touch from bubbling to backdrop */}
        <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={styles.body}>
            <Text variant="headline" align="center">{title}</Text>
            {message ? (
              <Text
                variant="callout"
                color={colors.labelSecondary}
                align="center"
                style={styles.message}
              >
                {message}
              </Text>
            ) : null}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.separator }]} />

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.5 }]}
              onPress={onCancel}
            >
              <Text variant="callout" color={colors.label} align="center">
                {cancelLabel}
              </Text>
            </Pressable>

            <View style={[styles.vDivider, { backgroundColor: colors.separator }]} />

            <Pressable
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.5 }]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text
                variant="callout"
                color={destructive ? colors.expense : colors.tint}
                align="center"
                style={{ fontWeight: '600', opacity: loading ? 0.5 : 1 }}
              >
                {loading ? '…' : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: 6,
  },
  message: {
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
    height: 48,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
  },
});
