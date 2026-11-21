import React, { useState, useMemo } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Animated, PanResponder, Platform, ActivityIndicator, Dimensions,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ParsedRow = {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
};

function parseCSV(csv: string): ParsedRow[] {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Skip header row
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parse — handles quoted fields
    const cols = parseLine(line);
    if (cols.length < 4) continue;
    const [date, description, category, amountStr, typeRaw] = cols;
    const amount = Math.abs(parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0);
    if (!date || amount === 0) continue;
    const type: 'income' | 'expense' = typeRaw?.toLowerCase().includes('income') ? 'income' : 'expense';
    rows.push({ date: date.trim(), description: description?.trim() ?? '', category: category?.trim() ?? 'other', amount, type });
  }
  return rows;
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onImported?: () => void;
}

export function ImportSheet({ visible, onClose, onImported }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'preview' | 'importing' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { if (visible) { setStatus('idle'); setRows([]); setMessage(''); translateY.setValue(SCREEN_HEIGHT); Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start(); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handlePickFile() {
    setMessage('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) return;

      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = parseCSV(content);
      if (parsed.length === 0) {
        setStatus('error');
        setMessage(t('import.empty'));
        return;
      }
      setRows(parsed);
      setStatus('preview');
    } catch {
      setStatus('error');
      setMessage(t('import.error.parse'));
    }
  }

  async function handleImport() {
    setStatus('importing');
    setMessage('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find the first account to attach transactions to
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .order('created_at')
        .limit(1);
      const accountId = accounts?.[0]?.id ?? null;

      const records = rows.map(row => ({
        user_id: user.id,
        account_id: accountId,
        date: row.date,
        description: row.description,
        category: row.category.toLowerCase(),
        amount: row.amount,
        type: row.type,
        icon: 'FileUp',
      }));

      const { error } = await supabase.from('transactions').insert(records);
      if (error) throw error;

      setStatus('done');
      setMessage(t('import.success', { count: rows.length }));
      onImported?.();
    } catch {
      setStatus('error');
      setMessage(t('import.error.generic'));
    }
  }

  function renderContent() {
    if (status === 'done') {
      return (
        <View style={inner.centeredBlock}>
          <View style={[inner.iconCircle, { backgroundColor: colors.income + '18' }]}>
            <Icon name="CheckCircle" size={28} color={colors.income} />
          </View>
          <Text variant="title3" align="center" style={{ marginTop: Spacing.md }}>{t('import.doneTitle')}</Text>
          <Text variant="callout" color={colors.income} align="center" style={{ marginTop: 6 }}>{message}</Text>
          <TouchableOpacity
            style={[inner.btn, { backgroundColor: colors.tint, marginTop: Spacing.xl }]}
            onPress={dismiss}
            activeOpacity={0.8}
          >
            <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'preview' || status === 'importing') {
      const preview = rows.slice(0, 5);
      return (
        <View style={{ flex: 1 }}>
          <Text variant="headline" style={{ marginBottom: 4 }}>{t('import.preview')}</Text>
          <Text variant="footnote" color={colors.labelSecondary} style={{ marginBottom: Spacing.sm }}>
            {t('import.rows', { count: rows.length })}
          </Text>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {preview.map((row, i) => (
              <View key={i} style={[inner.previewRow, { borderBottomColor: colors.separator }]}>
                <Text variant="footnote" color={colors.labelSecondary} style={{ width: 76 }}>{row.date}</Text>
                <Text variant="footnote" style={{ flex: 1 }} numberOfLines={1}>{row.description || row.category}</Text>
                <Text
                  variant="footnote"
                  color={row.type === 'income' ? colors.income : colors.expense}
                  style={{ fontWeight: '600', width: 72, textAlign: 'right' }}
                >
                  {row.type === 'income' ? '+' : '-'}{row.amount.toLocaleString()}
                </Text>
              </View>
            ))}
            {rows.length > 5 && (
              <Text variant="footnote" color={colors.labelTertiary} style={{ marginTop: 4, textAlign: 'center' }}>
                +{rows.length - 5} more…
              </Text>
            )}
          </ScrollView>
          <TouchableOpacity
            style={[inner.btn, { backgroundColor: colors.tint, marginTop: Spacing.lg, opacity: status === 'importing' ? 0.6 : 1 }]}
            onPress={handleImport}
            disabled={status === 'importing'}
            activeOpacity={0.8}
          >
            {status === 'importing' ? (
              <ActivityIndicator color={colors.tintForeground} />
            ) : (
              <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>
                {t('import.import')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // idle or error
    return (
      <View style={inner.centeredBlock}>
        <View style={[inner.iconCircle, { backgroundColor: colors.tint + '18' }]}>
          <Icon name="FileUp" size={28} color={colors.tint} />
        </View>
        <Text variant="title3" align="center" style={{ marginTop: Spacing.md }}>{t('import.title')}</Text>
        <Text variant="callout" color={colors.labelSecondary} align="center" style={{ marginTop: 6, lineHeight: 20 }}>
          {t('import.desc')}
        </Text>
        <Text variant="caption1" color={colors.labelTertiary} align="center" style={{ marginTop: 4 }}>
          {t('import.format')}
        </Text>
        {!!message && (
          <Text variant="footnote" color={colors.expense} align="center" style={{ marginTop: Spacing.sm }}>{message}</Text>
        )}
        <TouchableOpacity
          style={[inner.btn, { backgroundColor: colors.tint, marginTop: Spacing.xl }]}
          onPress={handlePickFile}
          activeOpacity={0.8}
        >
          <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>{t('import.pickFile')}</Text>
        </TouchableOpacity>
      </View>
    );
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
            {renderContent()}
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
    minHeight: 300,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
});

const inner = StyleSheet.create({
  centeredBlock: { alignItems: 'center', paddingTop: Spacing.sm },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  btn: {
    width: '100%', height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
