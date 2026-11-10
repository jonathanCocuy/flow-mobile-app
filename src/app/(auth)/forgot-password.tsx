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
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';

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
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }

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
                <Text variant="headline" color="#fff">Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── Form state ────────────────────────────────────────────────────
            <>
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
                  ? <ActivityIndicator color="#fff" />
                  : <Text variant="headline" color="#fff">Send Reset Link</Text>
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
    marginBottom: Spacing.xl,
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
