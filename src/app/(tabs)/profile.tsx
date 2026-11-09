import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import Svg, { Path } from 'react-native-svg';

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
}

function SettingsRow({ emoji, label, value, destructive }: SettingsRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity style={styles.settingsRow} activeOpacity={0.6}>
      <Text variant="body" style={{ width: 28 }}>{emoji}</Text>
      <Text
        variant="callout"
        style={{ flex: 1 }}
        color={destructive ? colors.expense : colors.label}
      >
        {label}
      </Text>
      {value && (
        <Text variant="callout" color={colors.labelSecondary} style={{ marginRight: 4 }}>
          {value}
        </Text>
      )}
      <ChevronRight color={colors.labelTertiary} />
    </TouchableOpacity>
  );
}

const SECTIONS = [
  {
    title: 'Account',
    rows: [
      { emoji: '👤', label: 'Personal Information' },
      { emoji: '🔐', label: 'Security' },
      { emoji: '📱', label: 'Connected Accounts' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { emoji: '🌍', label: 'Currency', value: 'USD' },
      { emoji: '🌐', label: 'Language', value: 'English' },
      { emoji: '🔔', label: 'Notifications' },
      { emoji: '🎨', label: 'Appearance', value: 'System' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { emoji: '❓', label: 'Help Center' },
      { emoji: '💬', label: 'Send Feedback' },
      { emoji: '⭐', label: 'Rate FlowX' },
    ],
  },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Text variant="largeTitle">Profile</Text>
        </View>

        {/* Avatar + Name */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            <Text variant="title1" color="#fff" align="center">J</Text>
          </View>
          <Text variant="title2" style={{ marginTop: Spacing.sm }}>Jonathan</Text>
          <Text variant="callout" color={colors.labelSecondary}>jonathancp145@gmail.com</Text>
        </View>

        {/* Stats */}
        <View style={{ paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.sm }}>
          <Card radius={Spacing.radius.lg} padding={0}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="title3" align="center">8</Text>
                <Text variant="caption1" color={colors.labelSecondary} align="center">Budgets</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
              <View style={styles.statItem}>
                <Text variant="title3" align="center">4</Text>
                <Text variant="caption1" color={colors.labelSecondary} align="center">Goals</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
              <View style={styles.statItem}>
                <Text variant="title3" align="center">142</Text>
                <Text variant="caption1" color={colors.labelSecondary} align="center">Transactions</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Settings */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.settingsSection}>
            <Text
              variant="footnote"
              color={colors.labelSecondary}
              style={styles.sectionTitle}
            >
              {section.title.toUpperCase()}
            </Text>
            <Card radius={Spacing.radius.lg} padding={0}>
              {section.rows.map((row, index) => (
                <View key={row.label}>
                  <View style={{ paddingHorizontal: Spacing.md }}>
                    <SettingsRow {...row} />
                  </View>
                  {index < section.rows.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: 52 }]} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}

        {/* Sign out */}
        <View style={styles.settingsSection}>
          <Card radius={Spacing.radius.lg} padding={0}>
            <View style={{ paddingHorizontal: Spacing.md }}>
              <SettingsRow emoji="🚪" label="Sign Out" destructive />
            </View>
          </Card>
        </View>

        <Text variant="caption2" color={colors.labelQuaternary} align="center" style={{ marginTop: Spacing.xl }}>
          FlowX v1.0.0
        </Text>
      </ScrollView>
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
  settingsSection: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs,
  },
  divider: { height: StyleSheet.hairlineWidth },
});
