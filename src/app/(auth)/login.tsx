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
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';

function validate(email: string, password: string) {
  if (!email.trim()) return 'Email is required.';
  if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address.';
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { height } = useWindowDimensions();
  const { signIn, signInWithApple, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);

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

  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const handleSignIn = async () => {
    setError(null);
    const validationError = validate(email, password);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    const { error: authError } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (authError.message.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in.');
      } else {
        setError(authError.message);
      }
    }
    // On success, AuthGate in _layout.tsx redirects to (tabs)
  };

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
            <Text variant="largeTitle">Welcome backó</Text>
            <Text variant="callout" color={colors.labelSecondary} style={{ marginTop: 4 }}>
              Sign in to your FlowX account
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: colors.backgroundGroupedSecondary, borderColor: colors.separator }]}>
            <Input
              label="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="you@example.com"
              textContentType="emailAddress"
              autoComplete="email"
            />

            <View style={[styles.inputDivider, { backgroundColor: colors.separator }]} />

            <Input
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              secureToggle
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              placeholder="••••••••"
              textContentType="password"
              autoComplete="password"
            />
          </View>

          {/* Forgot password link */}
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text variant="callout" color={colors.tint}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: `${colors.expense}14`, borderColor: `${colors.expense}30` }]}>
              <Text variant="footnote" color={colors.expense}>⚠ {error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: loading ? 0.75 : 1 }]}
            onPress={handleSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.tintForeground} />
              : <Text variant="headline" color={colors.tintForeground}>Sign In</Text>
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

          {/* Switch to register */}
          <View style={styles.switchRow}>
            <Text variant="callout" color={colors.labelSecondary}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
              <Text variant="callout" color={colors.tint} style={{ fontWeight: '600' }}>Create one</Text>
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
    paddingBottom: Spacing.xxl,
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
  inputDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -Spacing.md,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
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
