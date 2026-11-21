import React, { useState, useCallback, useMemo } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
  Modal, Animated, PanResponder, Dimensions, TouchableWithoutFeedback,
  Platform, TextInput, Pressable, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { RefreshScrollView } from '@/components/ui/RefreshScrollView';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { CategoryModal, type CategoryData } from '@/components/CategoryModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NotificationsSheet, fetchUnreadCount } from '@/components/NotificationsSheet';
import { ChangePasswordSheet } from '@/components/ChangePasswordSheet';
import { PermissionsSheet } from '@/components/PermissionsSheet';
import { ThemeSheet } from '@/components/ThemeSheet';
import { useThemePreference } from '@/context/ThemeContext';
import { Icon, isKnownIcon } from '@/components/ui/Icon';
import { SUPPORTED_LANGUAGES, changeLanguage, type LanguageCode } from '@/i18n';
import i18n from '@/i18n';
import { Skeleton } from '@/components/ui/Skeleton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Matches the avatars bucket's own file_size_limit, so we fail before uploading. */
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M6 12L10 8L6 4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress?: () => void;
}

function SettingsRow({ icon, label, value, destructive, onPress }: SettingsRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <TouchableOpacity style={styles.settingsRow} activeOpacity={0.6} onPress={onPress}>
      <View style={{ width: 28 }}>
        <Icon name={icon} size={19} color={destructive ? colors.expense : colors.labelSecondary} />
      </View>
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

// ── Delete account modal ──────────────────────────────────────────────────────

function DeleteAccountModal({ visible, loading, onConfirm, onCancel }: {
  visible: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const phrase = t('profile.deleteAccountPhrase');
  const [input, setInput] = useState('');
  const confirmed = input === phrase;

  React.useEffect(() => {
    if (!visible) { setTimeout(() => setInput(''), 0); }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={deleteStyles.backdrop} onPress={onCancel}>
        <Pressable style={[deleteStyles.card, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={deleteStyles.body}>
            <View style={[deleteStyles.iconWrap, { backgroundColor: colors.expense + '18' }]}>
              <Icon name="TriangleAlert" size={24} color={colors.expense} />
            </View>
            <Text variant="headline" align="center">{t('profile.deleteAccountTitle')}</Text>
            <Text variant="callout" color={colors.labelSecondary} align="center" style={deleteStyles.msg}>
              {t('profile.deleteAccountMessage')}
            </Text>
            <TextInput
              style={[deleteStyles.input, {
                backgroundColor: colors.fillPrimary,
                color: colors.label,
                borderColor: input.length > 0 && !confirmed ? colors.expense : colors.separator,
              }]}
              value={input}
              onChangeText={setInput}
              placeholder={t('profile.deleteAccountHint')}
              placeholderTextColor={colors.labelTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={[deleteStyles.divider, { backgroundColor: colors.separator }]} />

          <View style={deleteStyles.actions}>
            <Pressable
              style={({ pressed }) => [deleteStyles.btn, pressed && { opacity: 0.5 }]}
              onPress={onCancel}
            >
              <Text variant="callout" color={colors.label} align="center">{t('common.cancel')}</Text>
            </Pressable>

            <View style={[deleteStyles.vDivider, { backgroundColor: colors.separator }]} />

            <Pressable
              style={({ pressed }) => [deleteStyles.btn, (!confirmed || loading) && { opacity: 0.35 }, pressed && confirmed && { opacity: 0.6 }]}
              onPress={confirmed && !loading ? onConfirm : undefined}
              disabled={!confirmed || loading}
            >
              <Text variant="callout" color={colors.expense} align="center" style={{ fontWeight: '600' }}>
                {loading ? '…' : t('profile.deleteAccountConfirm')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const deleteStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: 10,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  msg: {
    lineHeight: 20,
  },
  input: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: { height: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', height: 48 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vDivider: { width: StyleSheet.hairlineWidth },
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
  const [deleteAccountDialogVisible, setDeleteAccountDialogVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const currentLang = (i18n.language ?? 'en') as LanguageCode;
  const currentLangLabel = SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.label ?? 'English';

  const { preference: themePref } = useThemePreference();
  const themeLabel = t(`theme.${themePref}`);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setLoading(false); return; }

    const [catsRes, budgetsRes, goalsRes, txRes, unreadRes, profileRes] = await Promise.all([
      supabase.from('categories').select('id, label, color, icon').eq('user_id', authUser.id).order('created_at'),
      supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', authUser.id),
      supabase.from('savings_goals').select('id', { count: 'exact', head: true }).eq('user_id', authUser.id),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', authUser.id),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
      supabase.from('profiles').select('avatar_url').eq('id', authUser.id).maybeSingle(),
    ]);

    setAvatarUrl(profileRes.data?.avatar_url ?? null);
    setCategories(catsRes.data ?? []);
    setStats({
      budgets: budgetsRes.count ?? 0,
      goals: goalsRes.count ?? 0,
      transactions: txRes.count ?? 0,
    });
    setUnread(unreadRes.count ?? 0);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await supabase.rpc('delete_my_account');
      await signOut();
    } catch {
      setDeletingAccount(false);
    }
  };

  const handlePickAvatar = async () => {
    setAvatarError(null);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setAvatarError(t('profile.photoPermission')); return; }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset) return;

    setAvatarBusy(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const contentType = asset.mimeType ?? 'image/jpeg';
      const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      // Fresh name per upload so the public URL changes and caches can't win.
      const path = `${authUser.id}/${Date.now()}.${ext}`;

      // Read file as base64 then convert to Uint8Array.
      // fetch().blob() uploads empty objects on React Native; legacy readAsStringAsync is reliable.
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (bytes.byteLength > AVATAR_MAX_BYTES) {
        setAvatarError(t('profile.photoTooLarge'));
        return;
      }

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, { contentType });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);

      const { data: saved, error: saveErr } = await supabase
        .from('profiles')
        .update({ avatar_url: pub.publicUrl })
        .eq('id', authUser.id)
        .select('id');
      if (saveErr) throw saveErr;
      // profiles has no INSERT policy, so a user without a row matches nothing
      // and the update would otherwise succeed while changing nothing.
      if (!saved?.length) throw new Error('No profile row to update');

      setAvatarUrl(pub.publicUrl);
    } catch {
      setAvatarError(t('profile.photoError'));
    } finally {
      setAvatarBusy(false);
    }
  };

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? 'User';
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <RefreshScrollView onRefresh={() => fetchData(true)} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Text variant="largeTitle">{t('tabs.profile')}</Text>
        </View>

        {/* Avatar + Name */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={avatarBusy} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text variant="title1" color={colors.tintForeground} align="center">{initials || '?'}</Text>
              )}
              {avatarBusy && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </View>
            <View style={[styles.avatarBadge, {
              backgroundColor: colors.tint,
              borderColor: colors.backgroundGrouped,
            }]}>
              <Icon name="Camera" size={13} color={colors.tintForeground} />
            </View>
          </TouchableOpacity>
          <Text variant="title2" style={{ marginTop: Spacing.sm }}>{displayName}</Text>
          <Text variant="callout" color={colors.labelSecondary}>{user?.email ?? ''}</Text>
          {avatarError && (
            <Text variant="caption1" color={colors.expense} align="center" style={{ marginTop: 6 }}>
              {avatarError}
            </Text>
          )}
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
              {([80, 96, 72, 88] as const).map((w) => (
                <Skeleton key={w} width={w} height={30} radius={Spacing.radius.full} />
              ))}
            </ScrollView>
          ) : categories.length === 0 ? (
            <Card radius={Spacing.radius.lg} padding={Spacing.md}>
              <Text variant="callout" color={colors.labelSecondary} align="center">
                {t('categories.empty')}
              </Text>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, { backgroundColor: `${cat.color}18`, borderColor: `${cat.color}40` }]}
                  onPress={() => { setEditCategory(cat); setCategoryModalVisible(true); }}
                  activeOpacity={0.7}
                >
                  {isKnownIcon(cat.icon) ? (
                    <Icon name={cat.icon} size={14} color={cat.color} />
                  ) : cat.icon && /[^\x20-\x7E]/.test(cat.icon) ? (
                    // Categories saved before the Lucide switch still hold an emoji.
                    <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                  ) : (
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  )}
                  <Text variant="caption1" numberOfLines={1}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Tools */}
        <View style={styles.section}>
          <Text variant="footnote" color={colors.labelSecondary} style={styles.sectionTitle}>
            {t('profile.tools').toUpperCase()}
          </Text>
          <Card radius={Spacing.radius.lg} padding={0}>
            <View style={{ paddingHorizontal: Spacing.md }}>
              <SettingsRow icon="Landmark" label={t('profile.accounts')} onPress={() => router.push('/accounts')} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow icon="TrendingUp" label={t('profile.investments')} onPress={() => router.push('/investments')} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow icon="RefreshCw" label={t('profile.recurring')} onPress={() => router.push('/recurring')} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow icon="BarChart3" label={t('profile.reports')} onPress={() => router.push('/reports')} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow icon="Users" label={t('profile.split')} onPress={() => router.push('/split')} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow
                icon="Bell"
                label={t('profile.notifications')}
                value={unread > 0 ? String(unread) : undefined}
                onPress={() => setNotifOpen(true)}
              />
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
                icon="Globe"
                label={t('profile.language')}
                value={currentLangLabel}
                onPress={() => setLanguageSheetVisible(true)}
              />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow
                icon="Sun"
                label={t('theme.title')}
                value={themeLabel}
                onPress={() => setThemeSheetOpen(true)}
              />
            </View>
          </Card>
        </View>

        {/* Security & Privacy */}
        <View style={styles.section}>
          <Text variant="footnote" color={colors.labelSecondary} style={styles.sectionTitle}>
            {t('security.title').toUpperCase()}
          </Text>
          <Card radius={Spacing.radius.lg} padding={0}>
            <View style={{ paddingHorizontal: Spacing.md }}>
              <SettingsRow
                icon="Lock"
                label={t('security.changePassword')}
                onPress={() => setChangePasswordOpen(true)}
              />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow
                icon="ShieldCheck"
                label={t('security.permissions')}
                onPress={() => setPermissionsOpen(true)}
              />
            </View>
          </Card>
        </View>

        {/* Sign Out / Delete Account */}
        <View style={styles.section}>
          <Card radius={Spacing.radius.lg} padding={0}>
            <View style={{ paddingHorizontal: Spacing.md }}>
              <SettingsRow
                icon="LogOut"
                label={t('profile.signOut')}
                destructive
                onPress={() => setSignOutDialogVisible(true)}
              />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 36 }} />
              <SettingsRow
                icon="Trash2"
                label={t('profile.deleteAccount')}
                destructive
                onPress={() => setDeleteAccountDialogVisible(true)}
              />
            </View>
          </Card>
        </View>

        <Text variant="caption2" color={colors.labelQuaternary} align="center" style={{ marginTop: Spacing.xl }}>
          FlowX v1.0.0
        </Text>
      </RefreshScrollView>

      <CategoryModal
        visible={categoryModalVisible}
        category={editCategory}
        onClose={() => setCategoryModalVisible(false)}
        onSuccess={() => { setCategoryModalVisible(false); fetchData(); }}
      />

      <NotificationsSheet
        visible={notifOpen}
        onClose={() => { setNotifOpen(false); fetchUnreadCount().then(setUnread); }}
        onChanged={() => { fetchUnreadCount().then(setUnread); }}
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

      <DeleteAccountModal
        visible={deleteAccountDialogVisible}
        loading={deletingAccount}
        onConfirm={() => { setDeleteAccountDialogVisible(false); handleDeleteAccount(); }}
        onCancel={() => setDeleteAccountDialogVisible(false)}
      />

      <ChangePasswordSheet
        visible={changePasswordOpen}
        userEmail={user?.email ?? ''}
        onClose={() => setChangePasswordOpen(false)}
      />

      <PermissionsSheet
        visible={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
      />

      <ThemeSheet
        visible={themeSheetOpen}
        onClose={() => setThemeSheetOpen(false)}
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
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: 80, height: 80, resizeMode: 'cover' },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  avatarBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
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
  categoryChips: { flexDirection: 'row', gap: 8, paddingVertical: 2, paddingHorizontal: 2 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: Spacing.radius.full, borderWidth: 1,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
});
