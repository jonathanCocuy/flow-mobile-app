import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';

function validate(name: string, email: string, password: string, confirm: string) {
  if (!name.trim() || name.trim().length < 2) return 'Enter your full name.';
  if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

function PasswordStrength({ password }: { password: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  if (!password) return null;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const barColors = [colors.expense, colors.tintOrange, colors.tintGreen, colors.income];

  return (
    <View style={pwStyles.container}>
      <View style={pwStyles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              pwStyles.bar,
              {
                backgroundColor: i < score ? barColors[score - 1] : colors.fillPrimary,
                flex: 1,
              },
            ]}
          />
        ))}
      </View>
      {score > 0 && (
        <Text variant="caption2" color={barColors[score - 1]} style={{ marginTop: 4 }}>
          {labels[score - 1]}
        </Text>
      )}
    </View>
  );
}

const pwStyles = StyleSheet.create({
  container: { gap: 4 },
  bars: { flexDirection: 'row', gap: 4, height: 3 },
  bar: { borderRadius: 2 },
});

// ── Success screen ────────────────────────────────────────────────────────────
function ConfirmEmailScreen({ email }: { email: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
      <View style={[successStyles.container, { backgroundColor: colors.backgroundGrouped }]}>
        <View style={[successStyles.iconBox, { backgroundColor: `${colors.income}18` }]}>
          <Text variant="displayLarge" align="center">✉️</Text>
        </View>
        <Text variant="title1" align="center">Check your inbox</Text>
        <Text variant="callout" color={colors.labelSecondary} align="center" style={successStyles.sub}>
          We sent a confirmation link to{'\n'}
          <Text variant="callout" style={{ fontWeight: '600' }}>{email}</Text>
          {'\n\n'}Click it to activate your account.
        </Text>
        <TouchableOpacity
          style={[successStyles.btn, { backgroundColor: colors.tint }]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text variant="headline" color={colors.tintForeground}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const successStyles = StyleSheet.create({
  container: {
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
  sub: { lineHeight: 24, marginTop: 4 },
  btn: {
    width: '100%',
    height: 54,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
});

// ── Register screen ───────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { height } = useWindowDimensions();
  const { signUp, signInWithApple, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);
  const [registered, setRegistered] = useState(false);

  const handleApple = async () => {
    setError(null);
    setSocialLoading('apple');
    const { error: e } = await signInWithApple();
    setSocialLoading(null);
    if (e) setError(e.message);
  };

  const handleGoogle = async () => {
    setError(null);
    setSocialLoading('google');
    const { error: e } = await signInWithGoogle();
    setSocialLoading(null);
    if (e) setError(e.message);
  };

  const emailRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const confirmRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const clearError = () => setError(null);

  const handleRegister = async () => {
    setError(null);
    const validationError = validate(name, email, password, confirm);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    const { error: authError, needsConfirmation } = await signUp(
      email.trim().toLowerCase(),
      password,
      name.trim(),
    );
    setLoading(false);

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('This email is already registered. Try signing in.');
      } else {
        setError(authError.message);
      }
      return;
    }

    if (needsConfirmation) {
      setRegistered(true);
    }
    // If !needsConfirmation → Supabase returned a session → AuthGate redirects to (tabs)
  };

  if (registered) {
    return <ConfirmEmailScreen email={email} />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: height * 0.06 }]}
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
            <Text variant="largeTitle">Create Account</Text>
            <Text variant="callout" color={colors.labelSecondary} style={{ marginTop: 4 }}>
              Start tracking your finances today.
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: colors.backgroundGroupedSecondary, borderColor: colors.separator }]}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={(t) => { setName(t); clearError(); }}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              placeholder="Jonathan Smith"
              textContentType="name"
              autoComplete="name"
              autoCapitalize="words"
            />

            <View style={[styles.sep, { backgroundColor: colors.separator }]} />

            <Input
              ref={emailRef}
              label="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="you@example.com"
              textContentType="emailAddress"
              autoComplete="email"
            />

            <View style={[styles.sep, { backgroundColor: colors.separator }]} />

            <Input
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              secureToggle
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              placeholder="Min. 8 characters"
              textContentType="newPassword"
              autoComplete="new-password"
            />
            {password.length > 0 && <PasswordStrength password={password} />}

            <View style={[styles.sep, { backgroundColor: colors.separator }]} />

            <Input
              ref={confirmRef}
              label="Confirm Password"
              value={confirm}
              onChangeText={(t) => { setConfirm(t); clearError(); }}
              secureToggle
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              placeholder="Repeat your password"
              textContentType="newPassword"
              autoComplete="new-password"
              error={confirm && password !== confirm ? 'Passwords do not match' : undefined}
            />
          </View>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: `${colors.expense}14`, borderColor: `${colors.expense}30` }]}>
              <Text variant="footnote" color={colors.expense}>⚠ {error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: loading ? 0.75 : 1 }]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.tintForeground} />
              : <Text variant="headline" color={colors.tintForeground}>Create Account</Text>
            }
          </TouchableOpacity>

          {/* OR divider */}
          <View style={styles.orDivider}>
            <View style={[styles.orLine, { backgroundColor: colors.separator }]} />
            <Text variant="footnote" color={colors.labelTertiary} style={{ paddingHorizontal: Spacing.sm }}>or</Text>
            <View style={[styles.orLine, { backgroundColor: colors.separator }]} />
          </View>

          {/* Social auth */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: colorScheme === 'dark' ? '#fff' : '#000' }]}
              onPress={handleApple}
              activeOpacity={0.85}
              disabled={!!socialLoading || loading}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#000' : '#fff'} />
              ) : (
                <View style={styles.socialBtnContent}>
                  <Svg width={15} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.4.07 2.38.74 3.2.8 1.22-.24 2.39-.93 3.68-.84 1.57.12 2.74.76 3.51 1.9-3.22 1.95-2.47 5.9.6 7.11-.65 1.63-1.46 3.24-3 3.9zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill={colorScheme === 'dark' ? '#000' : '#fff'} />
                  </Svg>
                  <Text variant="subheadline" color={colorScheme === 'dark' ? '#000' : '#fff'}>Apple</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: colors.backgroundGroupedSecondary, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.separator }]}
              onPress={handleGoogle}
              activeOpacity={0.85}
              disabled={!!socialLoading || loading}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator size="small" color={colors.label} />
              ) : (
                <View style={styles.socialBtnContent}>
                  <Svg width={15} height={15} viewBox="0 0 24 24">
                    <Path d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" fill="#4285F4" />
                    <Path d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z" fill="#34A853" />
                    <Path d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z" fill="#FBBC05" />
                    <Path d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" fill="#EA4335" />
                  </Svg>
                  <Text variant="subheadline" color={colors.label}>Google</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Terms note */}
          <Text variant="caption1" color={colors.labelTertiary} align="center" style={styles.termsNote}>
            By creating an account you agree to our{' '}
            <Text variant="caption1" color={colors.tint}>Terms of Service</Text>
            {' '}and{' '}
            <Text variant="caption1" color={colors.tint}>Privacy Policy</Text>.
          </Text>

          {/* Switch to login */}
          <View style={styles.switchRow}>
            <Text variant="callout" color={colors.labelSecondary}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text variant="callout" color={colors.tint} style={{ fontWeight: '600' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
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
  submitBtn: {
    height: 54,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  termsNote: {
    marginTop: Spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  socialBtn: {
    flex: 1,
    height: 44,
    borderRadius: Spacing.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    flexWrap: 'wrap',
  },
});
