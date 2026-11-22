import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Keyboard, Platform, ScrollView, Animated, PanResponder,
  Dimensions, useColorScheme, ActivityIndicator,
} from 'react-native';
import { useKeyboardShift } from '@/hooks/useKeyboardShift';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Mode = 'known' | 'forgot';

interface Props {
  visible: boolean;
  userEmail: string;
  onClose: () => void;
}

export function ChangePasswordSheet({ visible, userEmail, onClose }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [mode, setMode] = useState<Mode>('known');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);
  const { shift: kbShift, onFocus: onKbFocus } = useKeyboardShift(visible);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

  function resetState() {
    setMode('known');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setError(null);
    setSuccess(false);
    setRecoverySent(false);
    setLoading(false);
  }

  function dismissSheet() {
    Keyboard.dismiss();
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(() => {
      resetState();
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
          resetState();
          onClose();
        });
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  const handleChangePassword = async () => {
    setError(null);
    if (!currentPw) { setError(t('changePassword.error.currentRequired')); return; }
    if (newPw.length < 8) { setError(t('changePassword.error.newShort')); return; }
    if (newPw !== confirmPw) { setError(t('changePassword.error.mismatch')); return; }
    if (newPw === currentPw) { setError(t('changePassword.error.samePassword')); return; }

    setLoading(true);
    // Re-authenticate to verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPw,
    });
    if (signInErr) {
      setLoading(false);
      setError(t('changePassword.error.wrongPassword'));
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
    } else {
      setSuccess(true);
    }
  };

  const handleSendRecovery = async () => {
    setError(null);
    setLoading(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: 'flowx://reset-password',
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
    } else {
      setRecoverySent(true);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setSuccess(false);
    setRecoverySent(false);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={dismissSheet}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

          <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundGrouped, transform: [{ translateY: Animated.subtract(translateY, kbShift) }] }]}>
            {/* Handle */}
            <View style={styles.handleZone} {...panResponder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: colors.fillPrimary }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text variant="headline">{t('changePassword.title')}</Text>
              <TouchableOpacity onPress={dismissSheet} hitSlop={12}>
                <Icon name="X" size={20} color={colors.labelSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
            >
              {success ? (
                // ── Success state ──────────────────────────────────────────
                <View style={styles.feedbackState}>
                  <View style={[styles.iconCircle, { backgroundColor: `${colors.income}18` }]}>
                    <Icon name="CheckCircle" size={40} color={colors.income} strokeWidth={1.5} />
                  </View>
                  <Text variant="title3" align="center">{t('changePassword.successTitle')}</Text>
                  <Text variant="callout" color={colors.labelSecondary} align="center" style={{ lineHeight: 22 }}>
                    {t('changePassword.successDesc')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.tint }]}
                    onPress={dismissSheet}
                    activeOpacity={0.85}
                  >
                    <Text variant="headline" color={colors.tintForeground}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              ) : recoverySent ? (
                // ── Recovery sent ──────────────────────────────────────────
                <View style={styles.feedbackState}>
                  <View style={[styles.iconCircle, { backgroundColor: `${colors.tint}18` }]}>
                    <Icon name="Mail" size={40} color={colors.tint} strokeWidth={1.5} />
                  </View>
                  <Text variant="title3" align="center">{t('changePassword.sentTitle')}</Text>
                  <Text variant="callout" color={colors.labelSecondary} align="center" style={{ lineHeight: 22 }}>
                    {t('changePassword.sentDesc', { email: userEmail })}
                  </Text>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.tint }]}
                    onPress={dismissSheet}
                    activeOpacity={0.85}
                  >
                    <Text variant="headline" color={colors.tintForeground}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Mode tabs */}
                  <View style={[styles.tabRow, { backgroundColor: colors.fillPrimary }]}>
                    {(['known', 'forgot'] as Mode[]).map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.tab, mode === m && { backgroundColor: colors.backgroundGrouped, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 }]}
                        onPress={() => switchMode(m)}
                        activeOpacity={0.7}
                      >
                        <Text
                          variant="footnote"
                          style={{ fontWeight: mode === m ? '600' : '400' }}
                          color={mode === m ? colors.label : colors.labelSecondary}
                        >
                          {t(m === 'known' ? 'changePassword.tabKnown' : 'changePassword.tabForgot')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {mode === 'known' ? (
                    // ── Known password form ──────────────────────────────
                    <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
                      <Input
                        label={t('changePassword.current')}
                        value={currentPw}
                        onChangeText={(v) => { setCurrentPw(v); setError(null); }}
                        onFocus={onKbFocus}
                        secureToggle
                        placeholder={t('changePassword.currentPh')}
                        textContentType="password"
                        autoComplete="current-password"
                        returnKeyType="next"
                      />
                      <Input
                        label={t('changePassword.new')}
                        value={newPw}
                        onChangeText={(v) => { setNewPw(v); setError(null); }}
                        onFocus={onKbFocus}
                        secureToggle
                        placeholder={t('changePassword.newPh')}
                        textContentType="newPassword"
                        autoComplete="new-password"
                        returnKeyType="next"
                      />
                      <Input
                        label={t('changePassword.confirm')}
                        value={confirmPw}
                        onChangeText={(v) => { setConfirmPw(v); setError(null); }}
                        onFocus={onKbFocus}
                        secureToggle
                        placeholder={t('changePassword.confirmPh')}
                        textContentType="newPassword"
                        autoComplete="new-password"
                        returnKeyType="done"
                        onSubmitEditing={handleChangePassword}
                        error={confirmPw && newPw !== confirmPw ? t('changePassword.error.mismatch') : undefined}
                      />

                      {error && (
                        <View style={[styles.errorBox, { backgroundColor: `${colors.expense}14`, borderColor: `${colors.expense}30` }]}>
                          <Icon name="AlertTriangle" size={14} color={colors.expense} />
                          <Text variant="footnote" color={colors.expense} style={{ flex: 1 }}>{error}</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1, marginTop: Spacing.xs }]}
                        onPress={handleChangePassword}
                        disabled={loading}
                        activeOpacity={0.85}
                      >
                        {loading
                          ? <ActivityIndicator color={colors.tintForeground} />
                          : <Text variant="headline" color={colors.tintForeground}>{t('changePassword.submit')}</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  ) : (
                    // ── Forgot password form ─────────────────────────────
                    <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
                      <View style={[styles.recoveryCard, { backgroundColor: colors.backgroundGroupedSecondary, borderColor: colors.separator }]}>
                        <Icon name="Info" size={18} color={colors.labelSecondary} strokeWidth={1.5} />
                        <Text variant="callout" color={colors.labelSecondary} style={{ flex: 1, lineHeight: 20 }}>
                          {t('changePassword.recoveryDesc', { email: userEmail })}
                        </Text>
                      </View>

                      {error && (
                        <View style={[styles.errorBox, { backgroundColor: `${colors.expense}14`, borderColor: `${colors.expense}30` }]}>
                          <Icon name="AlertTriangle" size={14} color={colors.expense} />
                          <Text variant="footnote" color={colors.expense} style={{ flex: 1 }}>{error}</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
                        onPress={handleSendRecovery}
                        disabled={loading}
                        activeOpacity={0.85}
                      >
                        {loading
                          ? <ActivityIndicator color={colors.tintForeground} />
                          : <Text variant="headline" color={colors.tintForeground}>{t('changePassword.sendLink')}</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
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
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  body: { paddingHorizontal: Spacing.md, paddingBottom: 8 },
  tabRow: {
    flexDirection: 'row',
    borderRadius: Spacing.radius.md,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: Spacing.radius.sm,
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  btn: {
    height: 52,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackState: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  recoveryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Spacing.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
