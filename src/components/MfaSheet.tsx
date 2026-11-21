import React, { useState, useMemo } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Animated, PanResponder, Platform, TextInput, ActivityIndicator,
  Dimensions, ScrollView, useColorScheme,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Step = 'idle' | 'enrolling' | 'verifying' | 'disabling' | 'success';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MfaSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  const [step, setStep] = useState<Step>('idle');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  async function checkMfaStatus() {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.filter(f => f.status === 'verified') ?? [];
    setMfaEnabled(verified.length > 0);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { if (visible) { setStep('idle'); setError(''); setCode(''); setQrSvg(null); setSecret(''); translateY.setValue(SCREEN_HEIGHT); Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start(); checkMfaStatus(); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleEnable() {
    setLoading(true);
    setError('');
    try {
      // Clean up any unverified factors first
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (err || !data) throw err ?? new Error('enroll failed');
      setFactorId(data.id);
      setSecret(data.totp.secret);
      const qrCode = data.totp.qr_code;
      const PREFIX = 'data:image/svg+xml;base64,';
      if (qrCode.startsWith(PREFIX)) {
        setQrSvg(atob(qrCode.slice(PREFIX.length)));
      } else {
        setQrSvg(null);
      }
      setStep('enrolling');
    } catch {
      setError(t('mfa.error.generic'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (err) {
        setError(t('mfa.error.invalidCode'));
        return;
      }
      setMfaEnabled(true);
      setStep('success');
    } catch {
      setError(t('mfa.error.generic'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setShowDisableConfirm(false);
    setLoading(true);
    setError('');
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      setMfaEnabled(false);
    } catch {
      setError(t('mfa.error.generic'));
    } finally {
      setLoading(false);
    }
  }

  function renderContent() {
    if (step === 'success') {
      return (
        <View style={inner.centeredBlock}>
          <View style={[inner.iconCircle, { backgroundColor: colors.income + '18' }]}>
            <Icon name="ShieldCheck" size={28} color={colors.income} />
          </View>
          <Text variant="title3" align="center" style={{ marginTop: Spacing.md }}>{t('mfa.successTitle')}</Text>
          <Text variant="callout" color={colors.labelSecondary} align="center" style={{ marginTop: 6, lineHeight: 20 }}>
            {t('mfa.successDesc')}
          </Text>
          <TouchableOpacity
            style={[inner.btn, { backgroundColor: colors.tint, marginTop: Spacing.xl }]}
            onPress={dismiss}
            activeOpacity={0.8}
          >
            <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>{t('mfa.done')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'enrolling') {
      return (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="headline" align="center" style={{ marginBottom: 6 }}>{t('mfa.scanTitle')}</Text>
          <Text variant="callout" color={colors.labelSecondary} align="center" style={{ marginBottom: Spacing.lg, lineHeight: 20 }}>
            {t('mfa.scanDesc')}
          </Text>
          {qrSvg ? (
            <View style={inner.qrWrap}>
              <View style={[inner.qrBox, { backgroundColor: '#fff' }]}>
                <SvgXml xml={qrSvg} width={180} height={180} />
              </View>
            </View>
          ) : null}
          <Text variant="footnote" color={colors.labelTertiary} align="center" style={{ marginTop: Spacing.md }}>
            {t('mfa.orEnterSecret')}
          </Text>
          <View style={[inner.secretBox, { backgroundColor: colors.fillPrimary }]}>
            <Text variant="footnote" color={colors.label} align="center" style={{ letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
              {secret}
            </Text>
          </View>
          <TouchableOpacity
            style={[inner.btn, { backgroundColor: colors.tint, marginTop: Spacing.xl }]}
            onPress={() => setStep('verifying')}
            activeOpacity={0.8}
          >
            <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>{t('mfa.next')}</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    if (step === 'verifying') {
      return (
        <View style={inner.centeredBlock}>
          <Text variant="headline" align="center" style={{ marginBottom: 6 }}>{t('mfa.verifyTitle')}</Text>
          <Text variant="callout" color={colors.labelSecondary} align="center" style={{ marginBottom: Spacing.lg, lineHeight: 20 }}>
            {t('mfa.verifyDesc')}
          </Text>
          <TextInput
            style={[inner.codeInput, { backgroundColor: colors.fillPrimary, color: colors.label, borderColor: error ? colors.expense : colors.separator }]}
            value={code}
            onChangeText={v => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            placeholder={t('mfa.codePh')}
            placeholderTextColor={colors.labelTertiary}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            autoFocus
          />
          {!!error && <Text variant="footnote" color={colors.expense} align="center" style={{ marginTop: 6 }}>{error}</Text>}
          <TouchableOpacity
            style={[inner.btn, { backgroundColor: colors.tint, marginTop: Spacing.lg, opacity: code.length === 6 ? 1 : 0.4 }]}
            onPress={handleVerify}
            disabled={code.length !== 6 || loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color={colors.tintForeground} /> : (
              <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>{t('mfa.verify')}</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // idle
    return (
      <View style={inner.centeredBlock}>
        <View style={[inner.iconCircle, { backgroundColor: (mfaEnabled ? colors.income : colors.tint) + '18' }]}>
          <Icon name="Smartphone" size={28} color={mfaEnabled ? colors.income : colors.tint} />
        </View>
        <Text variant="title3" align="center" style={{ marginTop: Spacing.md }}>
          {t('mfa.title')}
        </Text>
        <Text variant="callout" color={colors.labelSecondary} align="center" style={{ marginTop: 6, lineHeight: 20 }}>
          {mfaEnabled ? t('mfa.status.enabled') : t('mfa.desc')}
        </Text>
        {!!error && <Text variant="footnote" color={colors.expense} align="center" style={{ marginTop: 6 }}>{error}</Text>}
        {mfaEnabled ? (
          <>
            <View style={[inner.enabledBadge, { backgroundColor: colors.income + '18' }]}>
              <Icon name="ShieldCheck" size={15} color={colors.income} />
              <Text variant="footnote" color={colors.income} style={{ fontWeight: '700' }}>{t('mfa.status.enabled')}</Text>
            </View>
            <TouchableOpacity
              style={[inner.btn, { backgroundColor: colors.expense + '18', marginTop: Spacing.xl }]}
              onPress={() => setShowDisableConfirm(true)}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color={colors.expense} /> : (
                <Text variant="callout" color={colors.expense} style={{ fontWeight: '700' }}>{t('mfa.disable')}</Text>
              )}
            </TouchableOpacity>
            {showDisableConfirm && (
              <View style={[inner.confirmBox, { backgroundColor: colors.fillPrimary }]}>
                <Text variant="callout" align="center" style={{ marginBottom: 8 }}>{t('mfa.disableConfirmTitle')}</Text>
                <Text variant="footnote" color={colors.labelSecondary} align="center" style={{ marginBottom: Spacing.md, lineHeight: 18 }}>
                  {t('mfa.disableConfirmMsg')}
                </Text>
                <View style={inner.confirmActions}>
                  <TouchableOpacity style={inner.confirmBtn} onPress={() => setShowDisableConfirm(false)} activeOpacity={0.7}>
                    <Text variant="callout" color={colors.label}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={inner.confirmBtn} onPress={handleDisable} activeOpacity={0.7}>
                    <Text variant="callout" color={colors.expense} style={{ fontWeight: '700' }}>{t('mfa.disableConfirm')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={[inner.btn, { backgroundColor: colors.tint, marginTop: Spacing.xl }]}
            onPress={handleEnable}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color={colors.tintForeground} /> : (
              <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>{t('mfa.enable')}</Text>
            )}
          </TouchableOpacity>
        )}
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
    minHeight: 320,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
});

const inner = StyleSheet.create({
  centeredBlock: { alignItems: 'center', paddingTop: Spacing.sm },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  enabledBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Spacing.radius.full,
    marginTop: Spacing.md,
  },
  btn: {
    width: '100%', height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  qrWrap: { alignItems: 'center', marginVertical: Spacing.sm },
  qrBox: { padding: 12, borderRadius: 12 },
  secretBox: {
    width: '100%', borderRadius: 10, padding: Spacing.md, marginTop: Spacing.sm,
  },
  codeInput: {
    width: '100%', height: 56, borderRadius: 14, borderWidth: 1,
    fontSize: 24, fontWeight: '700', letterSpacing: 6,
  },
  confirmBox: { width: '100%', borderRadius: 12, padding: Spacing.md, marginTop: Spacing.lg },
  confirmActions: { flexDirection: 'row', justifyContent: 'space-around' },
  confirmBtn: { paddingVertical: 8, paddingHorizontal: Spacing.md },
});
