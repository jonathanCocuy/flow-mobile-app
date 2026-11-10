import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';

function validate(password: string, confirm: string) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

export default function ResetPasswordScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { height } = useWindowDimensions();

  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Extract tokens from the deep link hash and establish a session
  useEffect(() => {
    const handleUrl = async (url: string) => {
      const hash = url.split('#')[1];
      if (!hash) return;
      const params = Object.fromEntries(new URLSearchParams(hash));
      if (params.access_token && params.refresh_token) {
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        setReady(true);
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    const timeout = setTimeout(() => setTimedOut(true), 15000);
    return () => { sub.remove(); clearTimeout(timeout); };
  }, []);

  const handleSave = async () => {
    setError(null);
    const validationError = validate(password, confirm);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.income}18` }]}>
            <Text variant="displayLarge" align="center">🔑</Text>
          </View>
          <Text variant="title1" align="center">Password Updated</Text>
          <Text variant="callout" color={colors.labelSecondary} align="center" style={{ lineHeight: 24 }}>
            Your new password is set. You can sign in now.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.tint }]}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text variant="headline" color={colors.tintForeground}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!ready) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          {timedOut ? (
            <>
              <Text variant="displayLarge" align="center">⚠️</Text>
              <Text variant="title2" align="center">Link Invalid or Expired</Text>
              <Text variant="callout" color={colors.labelSecondary} align="center" style={{ lineHeight: 24 }}>
                The reset link didn't work. It may have expired or already been used. Request a new one.
              </Text>
              <View style={{ gap: Spacing.xs, alignSelf: 'stretch' }}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.tint }]}
                  onPress={() => router.replace('/(auth)/forgot-password')}
                >
                  <Text variant="headline" color={colors.tintForeground}>Request New Link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.backgroundGroupedSecondary, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.separator }]}
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <Text variant="headline" color={colors.label}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.tint} />
              <Text variant="callout" color={colors.labelSecondary} style={{ marginTop: Spacing.md }}>
                Verifying link…
              </Text>
              <Text variant="footnote" color={colors.labelTertiary} align="center">
                Wait a moment, this may take a few seconds.
              </Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.backgroundGroupedSecondary, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.separator, alignSelf: 'stretch' }]}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text variant="headline" color={colors.label}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: height * 0.08 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Wordmark */}
          <View style={styles.wordmark}>
            <View style={[styles.logoBox, { backgroundColor: colors.tint }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill={colors.tintForeground} stroke={colors.tintForeground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" />
                <Path d="M7 14h.01" />
                <Path d="M9 5v2" />
                <Path d="M15 5v2" />
              </Svg>
            </View>
            <Text variant="title3" style={{ letterSpacing: -0.5 }}>FlowX</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text variant="largeTitle">New Password</Text>
            <Text variant="callout" color={colors.labelSecondary} style={{ marginTop: 4 }}>
              Choose a strong password for your account.
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: colors.backgroundGroupedSecondary, borderColor: colors.separator }]}>
            <Input
              label="New Password"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              secureToggle
              returnKeyType="next"
              placeholder="Min. 8 characters"
              textContentType="newPassword"
              autoComplete="new-password"
              autoFocus
            />
            <View style={[styles.sep, { backgroundColor: colors.separator }]} />
            <Input
              label="Confirm Password"
              value={confirm}
              onChangeText={(t) => { setConfirm(t); setError(null); }}
              secureToggle
              returnKeyType="done"
              onSubmitEditing={handleSave}
              placeholder="Repeat your password"
              textContentType="newPassword"
              autoComplete="new-password"
              error={confirm && password !== confirm ? 'Passwords do not match' : undefined}
            />
          </View>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: `${colors.expense}14`, borderColor: `${colors.expense}30` }]}>
              <Text variant="footnote" color={colors.expense}>⚠ {error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.tint, opacity: loading ? 0.75 : 1 }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.tintForeground} />
              : <Text variant="headline" color={colors.tintForeground}>Save New Password</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing.xxxl,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: Spacing.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  formCard: {
    borderRadius: Spacing.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -Spacing.md,
  },
  errorBox: {
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  btn: {
    height: 54,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: Spacing.md,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});
