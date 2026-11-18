import React, { useState, useCallback, useMemo } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
  Modal, Animated, PanResponder, Dimensions, TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { CategoryModal, type CategoryData } from '@/components/CategoryModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SUPPORTED_LANGUAGES, changeLanguage, type LanguageCode } from '@/i18n';
import i18n from '@/i18n';
import { Skeleton } from '@/components/ui/Skeleton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M6 12L10 8L6 4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface SettingsRowProps {
  emoji: string;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress?: () => void;
}

function SettingsRow({ emoji, label, value, destructive, onPress }: SettingsRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <TouchableOpacity style={styles.settingsRow} activeOpacity={0.6} onPress={onPress}>
      <Text variant="body" style={{ width: 28 }}>{emoji}</Text>
      <Text variant="callout" style={{ flex: 1 }} color={destructive ? colors.expense : colors.label}>
        {label}
      </Text>
      {value && (
        <Text variant="callout" color={colors.labelSecondary} style={{ marginRight: 4 }}>
          {value}
        </Text>
      )}
      <ChevronRight color={destructive ? colors.expense : colors.labelTertiary} />
    </TouchableOpacity>
  );
}

// ── Language picker bottom sheet ─────────────────────────────────────────────

function LanguageSheet({ visible, current, onClose }: {
  visible: boolean;
  current: LanguageCode;
  onClose: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { t } = useTranslation();
  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  React.useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

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

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={sheetStyles.root}>
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <Animated.View style={[sheetStyles.sheet, { backgroundColor: colors.backgroundGrouped, transform: [{ translateY }] }]}>
          <View style={sheetStyles.handleZone} {...panResponder.panHandlers}>
            <View style={[sheetStyles.handle, { backgroundColor: colors.separator }]} />
          </View>
          <View style={sheetStyles.header}>
            <Text variant="headline">{t('lang.select')}</Text>
          </View>
          <View style={sheetStyles.body}>
            {SUPPORTED_LANGUAGES.map((lang, index) => {
              const selected = current === lang.code;
              return (
                <View key={lang.code}>
                  <TouchableOpacity
                    style={sheetStyles.langRow}
                    activeOpacity={0.6}
                    onPress={async () => {
                      await changeLanguage(lang.code);
                      dismiss();
                    }}
                  >
                    <Text variant="title3" style={{ width: 32 }}>{lang.flag}</Text>
                    <Text variant="callout" style={{ flex: 1 }}>{lang.label}</Text>
                    {selected && (
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path d="M20 6L9 17l-5-5" stroke={colors.tint} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                  </TouchableOpacity>
                  {index < SUPPORTED_LANGUAGES.length - 1 && (
                    <View style={[sheetStyles.divider, { backgroundColor: colors.separator, marginLeft: 48 }]} />
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { paddingHorizontal: Spacing.md, paddingBottom: 12 },
  body: { paddingHorizontal: Spacing.md },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth },
});

// ── Main screen ───────────────────────────────────────────────────────────────

type Stats = { budgets: number; goals: number; transactions: number };

export default function ProfileScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { signOut, user } = useAuth();

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [stats, setStats] = useState<Stats>({ budgets: 0, goals: 0, transactions: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryData | null>(null);
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);

  const currentLang = (i18n.language ?? 'en') as LanguageCode;
  const currentLangLabel = SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.label ?? 'English';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setLoading(false); return; }

    const [catsRes, budgetsRes, goalsRes, txRes] = await Promise.all([
      supabase.from('categories').select('id, label, color, icon').eq('user_id', authUser.id).order('created_at'),
      supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', authUser.id),
      supabase.from('savings_goals').select('id', { count: 'exact', head: true }).eq('user_id', authUser.id),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', authUser.id),
    ]);

    setCategories(catsRes.data ?? []);
    setStats({
      budgets: budgetsRes.count ?? 0,
      goals: goalsRes.count ?? 0,
      transactions: txRes.count ?? 0,
    });
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? 'User';
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Text variant="largeTitle">{t('tabs.profile')}</Text>
        </View>

        {/* Avatar + Name */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            <Text variant="title1" color="#fff" align="center">{initials || '?'}</Text>
          </View>
          <Text variant="title2" style={{ marginTop: Spacing.sm }}>{displayName}</Text>
          <Text variant="callout" color={colors.labelSecondary}>{user?.email ?? ''}</Text>
        </View>

        {/* Stats */}
        <View style={{ paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.sm }}>
          <Card radius={Spacing.radius.lg} padding={0}>
            <View style={styles.statsRow}>
              {loading ? (
                <>
                  {([1, 2, 3] as const).map((i) => (
                    <React.Fragment key={i}>
                      <View style={styles.statItem}>
                        <Skeleton width={40} height={22} radius={6} />
                        <Skeleton width={64} height={12} radius={6} style={{ marginTop: 4 }} />
                      </View>
                      {i < 3 && <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />}
                    </React.Fragment>
                  ))}
                </>
              ) : (
                <>
                  <View style={styles.statItem}>
                    <Text variant="title3" align="center">{stats.budgets}</Text>
                    <Text variant="caption1" color={colors.labelSecondary} align="center">
                      {t('profile.stats.budgets')}
                    </Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
                  <View style={styles.statItem}>
                    <Text variant="title3" align="center">{stats.goals}</Text>
                    <Text variant="caption1" color={colors.labelSecondary} align="center">
                      {t('profile.stats.goals')}
                    </Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
                  <View style={styles.statItem}>
                    <Text variant="title3" align="center">{stats.transactions}</Text>
                    <Text variant="caption1" color={colors.labelSecondary} align="center">
                      {t('profile.stats.transactions')}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Card>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="footnote" color={colors.labelSecondary} style={styles.sectionTitle}>
              {t('profile.categories').toUpperCase()}
            </Text>
            <TouchableOpacity onPress={() => { setEditCategory(null); setCategoryModalVisible(true); }} hitSlop={8}>
              <Text variant="footnote" color={colors.tint} style={{ fontWeight: '600' }}>
                + {t('categories.add')}
              </Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.categoryChips}>
              {([80, 96, 72, 88] as const).map((w) => (
                <Skeleton key={w} width={w} height={30} radius={Spacing.radius.full} />
              ))}
            </View>
          ) : categories.length === 0 ? (
            <Card radius={Spacing.radius.lg} padding={Spacing.md}>
              <Text variant="callout" color={colors.labelSecondary} align="center">
                {t('categories.empty')}
              </Text>
            </Card>
          ) : (
            <View style={styles.categoryChips}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, { backgroundColor: `${cat.color}18`, borderColor: `${cat.color}40` }]}
                  onPress={() => { setEditCategory(cat); setCategoryModalVisible(true); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  <Text variant="caption1" numberOfLines={1}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Tools */}
        <View style={styles.section}>
          <Text variant="footnote" color={colors.labelSecondary} style={styles.sectionTitle}>
            {t('profile.tools').toUpperCase()}
          </Text>
          <Card radius={Spacing.radius.lg} padding={0}>
            <View style={{ paddingHorizontal: Spacing.md }}>
              <SettingsRow emoji="🏦" label={t('profile.accounts')} onPress={() => router.push('/accounts')} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow emoji="📈" label={t('profile.investments')} onPress={() => router.push('/investments')} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow emoji="🔄" label={t('profile.recurring')} onPress={() => router.push('/recurring')} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow emoji="📊" label={t('profile.reports')} onPress={() => router.push('/reports')} />
            </View>
          </Card>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text variant="footnote" color={colors.labelSecondary} style={styles.sectionTitle}>
            {t('profile.preferences').toUpperCase()}
          </Text>
          <Card radius={Spacing.radius.lg} padding={0}>
            <View style={{ paddingHorizontal: Spacing.md }}>
              <SettingsRow
                emoji="🌐"
                label={t('profile.language')}
                value={currentLangLabel}
                onPress={() => setLanguageSheetVisible(true)}
              />
            </View>
          </Card>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <Card radius={Spacing.radius.lg} padding={0}>
            <View style={{ paddingHorizontal: Spacing.md }}>
              <SettingsRow
                emoji="🚪"
                label={t('profile.signOut')}
                destructive
                onPress={() => setSignOutDialogVisible(true)}
              />
            </View>
          </Card>
        </View>

        <Text variant="caption2" color={colors.labelQuaternary} align="center" style={{ marginTop: Spacing.xl }}>
          FlowX v1.0.0
        </Text>
      </ScrollView>

      <CategoryModal
        visible={categoryModalVisible}
        category={editCategory}
        onClose={() => setCategoryModalVisible(false)}
        onSuccess={() => { setCategoryModalVisible(false); fetchData(); }}
      />

      <LanguageSheet
        visible={languageSheetVisible}
        current={currentLang}
        onClose={() => setLanguageSheetVisible(false)}
      />

      <ConfirmDialog
        visible={signOutDialogVisible}
        title={t('profile.signOutTitle')}
        message={t('profile.signOutMessage')}
        confirmLabel={t('profile.signOut')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => { setSignOutDialogVisible(false); signOut(); }}
        onCancel={() => setSignOutDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  profileSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', paddingVertical: Spacing.md },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },
  section: { paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.xl },
  sectionTitle: { letterSpacing: 0.5, marginBottom: Spacing.xs, marginLeft: 2 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm + 2, gap: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.xs, marginLeft: 2, marginRight: 2,
  },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: Spacing.radius.full, borderWidth: 1,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
});
