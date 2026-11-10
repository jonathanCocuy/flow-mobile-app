import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';

function Wordmark({ colors, colorScheme }: { colors: typeof Colors[keyof typeof Colors]; colorScheme: 'light' | 'dark' }) {
  return (
    <View style={wordmarkStyles.row}>
      <View style={[wordmarkStyles.box, { backgroundColor: colors.tint }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill={colors.tintForeground} stroke={colors.tintForeground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" />
          <Path d="M7 14h.01" />
          <Path d="M9 5v2" />
          <Path d="M15 5v2" />
        </Svg>
      </View>
      <Text variant="title3" style={{ letterSpacing: -0.5 }}>FlowX</Text>
    </View>
  );
}

const wordmarkStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xxl },
  box: { width: 36, height: 36, borderRadius: Spacing.radius.sm, alignItems: 'center', justifyContent: 'center' },
});

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    setLoading(true);
    const { error: authError } = await resetPassword(email.trim().toLowerCase());
    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.separator }]} />

          {sent ? (
            // ── Success state ─────────────────────────────────────────────────
            <View style={styles.successContent}>
              <View style={[styles.iconBox, { backgroundColor: `${colors.tint}18` }]}>
                <Text variant="displayLarge" align="center">📬</Text>
              </View>
              <Text variant="title2" align="center">Email Sent</Text>
              <Text variant="callout" color={colors.labelSecondary} align="center" style={styles.successSub}>
                Check <Text variant="callout" style={{ fontWeight: '600' }}>{email}</Text> for a link to reset your password.
              </Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.tint }]}
                onPress={() => router.back()}
              >
                <Text variant="headline" color={colors.tintForeground}>Back to Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.backgroundGroupedSecondary, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.separator }]}
                onPress={() => router.push('/(auth)/reset-password')}
              >
                <Text variant="headline" color={colors.label}>Go to Reset Password</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── Form state ────────────────────────────────────────────────────
            <>
              <Wordmark colors={colors} colorScheme={colorScheme} />
              <View style={styles.header}>
                <Text variant="title1">Forgot Password?</Text>
                <Text variant="callout" color={colors.labelSecondary} style={{ marginTop: 6 }}>
                  Enter your email and we'll send you a reset link.
                </Text>
              </View>

              <View style={[styles.formCard, { backgroundColor: colors.backgroundGroupedSecondary, borderColor: colors.separator }]}>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  keyboardType="email-address"
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                  placeholder="you@example.com"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoFocus
                />
              </View>

              {error && (
                <View style={[styles.errorBox, { backgroundColor: `${colors.expense}14`, borderColor: `${colors.expense}30` }]}>
                  <Text variant="footnote" color={colors.expense}>⚠ {error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.tint, opacity: loading ? 0.75 : 1 }]}
                onPress={handleSend}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.tintForeground} />
                  : <Text variant="headline" color={colors.tintForeground}>Send Reset Link</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                <Text variant="callout" color={colors.labelSecondary}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xxxl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  formCard: {
    borderRadius: Spacing.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
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
    alignSelf: 'stretch',
    marginTop: Spacing.xl,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  // success
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successSub: {
    lineHeight: 24,
    marginTop: 4,
  },
});
