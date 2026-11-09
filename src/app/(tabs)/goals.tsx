import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

const GOALS = [
  { id: '1', name: 'Emergency Fund', emoji: '🛡️', saved: 3500, target: 5000, deadline: 'Dec 2026', color: '#007AFF' },
  { id: '2', name: 'MacBook Pro', emoji: '💻', saved: 1200, target: 2499, deadline: 'Mar 2027', color: '#AF52DE' },
  { id: '3', name: 'Vacation', emoji: '✈️', saved: 800, target: 3000, deadline: 'Jun 2027', color: '#FF9500' },
  { id: '4', name: 'Car Down Payment', emoji: '🚗', saved: 5000, target: 10000, deadline: 'Jan 2028', color: '#34C759' },
];

function daysLeft(deadline: string): number {
  const [month, year] = deadline.split(' ');
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const target = new Date(parseInt(year), months[month], 1);
  const now = new Date();
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function GoalsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const totalSaved = GOALS.reduce((s, g) => s + g.saved, 0);
  const totalTarget = GOALS.reduce((s, g) => s + g.target, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Text variant="largeTitle">Goals</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.fillPrimary }]}>
            <Text variant="headline" color={colors.tint}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={[styles.section, { marginTop: Spacing.sm }]}>
          <View style={styles.summaryRow}>
            <Card style={{ flex: 1 }} radius={Spacing.radius.lg} padding={Spacing.md}>
              <Text variant="caption1" color={colors.labelSecondary}>Total Saved</Text>
              <Text variant="title3" style={{ marginTop: 4 }}>${totalSaved.toLocaleString()}</Text>
            </Card>
            <Card style={{ flex: 1 }} radius={Spacing.radius.lg} padding={Spacing.md}>
              <Text variant="caption1" color={colors.labelSecondary}>Total Target</Text>
              <Text variant="title3" style={{ marginTop: 4 }}>${totalTarget.toLocaleString()}</Text>
            </Card>
          </View>
        </View>

        {/* Goals */}
        <View style={[styles.section, { marginTop: Spacing.xl }]}>
          <Text variant="title3" style={{ marginBottom: Spacing.sm }}>All Goals</Text>
          <View style={styles.goalsList}>
            {GOALS.map((goal) => {
              const pct = (goal.saved / goal.target) * 100;
              const days = daysLeft(goal.deadline);
              return (
                <TouchableOpacity key={goal.id} activeOpacity={0.75}>
                  <Card radius={Spacing.radius.lg} padding={Spacing.md}>
                    <View style={styles.goalHeader}>
                      <View style={[styles.goalEmoji, { backgroundColor: `${goal.color}18` }]}>
                        <Text variant="title3" align="center">{goal.emoji}</Text>
                      </View>
                      <View style={styles.goalInfo}>
                        <Text variant="headline">{goal.name}</Text>
                        <Text variant="caption1" color={colors.labelSecondary}>
                          {days} days left · {goal.deadline}
                        </Text>
                      </View>
                      <View style={styles.goalPct}>
                        <Text variant="footnote" color={goal.color} style={{ fontWeight: '700' }}>
                          {Math.round(pct)}%
                        </Text>
                      </View>
                    </View>

                    <View style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
                      <View style={[styles.progressTrack, { backgroundColor: colors.fillPrimary }]}>
                        <View
                          style={[
                            styles.progressFill,
                            { backgroundColor: goal.color, width: `${pct}%` },
                          ]}
                        />
                      </View>
                      <View style={styles.goalAmounts}>
                        <Text variant="caption1" color={colors.labelSecondary}>
                          ${goal.saved.toLocaleString()} saved
                        </Text>
                        <Text variant="caption1" color={colors.labelSecondary}>
                          ${(goal.target - goal.saved).toLocaleString()} to go
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  addBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Spacing.radius.full,
  },
  section: { paddingHorizontal: Spacing.screenHorizontal },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  goalsList: { gap: Spacing.sm },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: { flex: 1, gap: 2 },
  goalPct: { alignItems: 'flex-end' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  goalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
