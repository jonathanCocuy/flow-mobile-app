import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { LanguagePicker } from '@/components/ui/LanguagePicker';

const { width } = Dimensions.get('window');

function FlowXLogo({ size = 40, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" />
      <Path d="M7 14h.01" />
      <Path d="M9 5v2" />
      <Path d="M15 5v2" />
    </Svg>
  );
}

function FeatureRow({ emoji, label }: { emoji: string; label: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <View style={styles.featureRow}>
      <Text variant="body">{emoji}</Text>
      <Text variant="callout" color={colors.labelSecondary}>{label}</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top decorative blob */}
      <View style={[styles.blob, { backgroundColor: colors.fillQuaternary }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Language picker — top right */}
        <View style={styles.topBar}>
          <LanguagePicker />
        </View>

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Logo + Brand */}
          <View style={styles.hero}>
            <View style={[styles.logoBox, { backgroundColor: colors.tint }]}>
              <FlowXLogo size={40} color={colors.tintForeground} />
            </View>
            <Text variant="largeTitle" style={styles.brandName}>FlowX</Text>
            <Text
              variant="title3"
              color={colors.labelSecondary}
              align="center"
              style={styles.tagline}
            >
              {t('welcome.tagline')}
            </Text>
          </View>

          {/* Features */}
          <View style={[styles.featuresBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.separator }]}>
            <FeatureRow emoji="💰" label={t('welcome.feat1')} />
            <View style={[styles.featureDivider, { backgroundColor: colors.separator }]} />
            <FeatureRow emoji="📊" label={t('welcome.feat2')} />
            <View style={[styles.featureDivider, { backgroundColor: colors.separator }]} />
            <FeatureRow emoji="🎯" label={t('welcome.feat3')} />
          </View>

          {/* CTAs */}
          <View style={styles.ctas}>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.tint }]}
              activeOpacity={0.85}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text variant="headline" color={colors.tintForeground}>{t('welcome.createAccount')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: colors.separator }]}
              activeOpacity={0.7}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text variant="headline" color={colors.label}>{t('welcome.signIn')}</Text>
            </TouchableOpacity>
          </View>

          <Text variant="caption2" color={colors.labelQuaternary} align="center" style={styles.legalNote}>
            {t('welcome.legal')}
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blob: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
  },
  safe: { flex: 1 },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.screenHorizontal + 4,
    paddingTop: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal + 4,
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: Spacing.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandName: {
    letterSpacing: -1,
  },
  tagline: {
    marginTop: Spacing.xs,
    lineHeight: 28,
  },
  featuresBox: {
    borderRadius: Spacing.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
  },
  featureDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 36,
  },
  ctas: {
    gap: Spacing.sm,
  },
  btnPrimary: {
    height: 54,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    height: 54,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  legalNote: {
    marginTop: Spacing.xs,
  },
});
