import React, { useState, useMemo } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Animated, PanResponder, Platform, ActivityIndicator, Dimensions,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function ExportSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { if (visible) { setStatus('idle'); setMessage(''); translateY.setValue(SCREEN_HEIGHT); Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start(); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(onClose);
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 0,
    onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy); },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 80 || vy > 0.8) {
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(onClose);
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  async function handleExport() {
    setStatus('loading');
    setMessage('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .select('date, description, category, amount, type, accounts(name)')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        setStatus('error');
        setMessage(t('export.empty'));
        return;
      }

      const headers = ['Date', 'Description', 'Category', 'Amount', 'Type', 'Account'];
      const rows = data.map(tx => {
        const accountName = (tx.accounts as { name?: string } | null)?.name ?? '';
        return [
          escapeCsv(tx.date),
          escapeCsv(tx.description),
          escapeCsv(tx.category),
          escapeCsv(tx.amount),
          escapeCsv(tx.type),
          escapeCsv(accountName),
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const filename = `flowx-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      const path = (FileSystem.cacheDirectory ?? '') + filename;

      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) throw new Error('Sharing not available');

      await Sharing.shareAsync(path, {
        mimeType: 'text/csv',
        dialogTitle: t('export.title'),
        UTI: 'public.comma-separated-values-text',
      });

      setStatus('done');
      setMessage(t('export.success'));
    } catch {
      setStatus('error');
      setMessage(t('export.error'));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundGrouped, transform: [{ translateY }] }]}>
          <View style={styles.handleZone} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.separator }]} />
          </View>
          <View style={styles.body}>
            <View style={inner.iconCircle}>
              <Icon name="Download" size={28} color={colors.tint} />
            </View>
            <Text variant="title3" align="center" style={{ marginTop: Spacing.md }}>{t('export.title')}</Text>
            <Text variant="callout" color={colors.labelSecondary} align="center" style={{ marginTop: 6, lineHeight: 20 }}>
              {t('export.desc')}
            </Text>

            {!!message && (
              <Text
                variant="footnote"
                color={status === 'error' ? colors.expense : colors.income}
                align="center"
                style={{ marginTop: Spacing.md, lineHeight: 18 }}
              >
                {message}
              </Text>
            )}

            <TouchableOpacity
              style={[inner.btn, { backgroundColor: colors.tint, marginTop: Spacing.xl, opacity: status === 'loading' ? 0.6 : 1 }]}
              onPress={handleExport}
              disabled={status === 'loading'}
              activeOpacity={0.8}
            >
              {status === 'loading' ? (
                <ActivityIndicator color={colors.tintForeground} />
              ) : (
                <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>
                  {t('export.button')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    minHeight: 280,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, alignItems: 'center' },
});

const inner = StyleSheet.create({
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  btn: {
    width: '100%', height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
});
