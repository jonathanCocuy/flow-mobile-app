import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity, useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { AddGoalSheet } from '@/components/AddGoalSheet';
import { ContributeGoalSheet } from '@/components/ContributeGoalSheet';
import type { DashboardAccount } from '@/types/finance';

type SavingsGoal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
};

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function GoalsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [accounts, setAccounts] = useState<DashboardAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [goalsRes, accountsRes] = await Promise.all([
        supabase
          .from('savings_goals')
          .select('id, name, target_amount, current_amount, deadline, icon')
          .eq('user_id', user.id)
          .order('created_at'),
        supabase
          .from('accounts')
          .select('id, name, balance, initial_balance, color')
          .eq('user_id', user.id),
      ]);

      setGoals(goalsRes.data ?? []);
      setAccounts(accountsRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const totalSaved = goals.reduce((s, g) => s + (g.current_amount ?? 0), 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Text variant="largeTitle">{t('tabs.goals')}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.fillPrimary }]}
            onPress={() => setAddSheetVisible(true)}
            activeOpacity={0.7}
          >
            <PlusIcon color={colors.tint} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.labelSecondary} />
          </View>
        ) : goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text variant="callout" align="center" color={colors.labelSecondary}>
              {t('goals.empty')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
              onPress={() => setAddSheetVisible(true)}
              activeOpacity={0.85}
            >
              <Text variant="callout" color={colors.tintForeground}>{t('goal.add')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary row */}
            <View style={[styles.section, { marginTop: Spacing.sm }]}>
              <View style={styles.summaryRow}>
                <Card style={{ flex: 1 }} radius={Spacing.radius.lg} padding={Spacing.md}>
                  <Text variant="caption1" color={colors.labelSecondary}>{t('goals.saved')}</Text>
                  <Text variant="title3" style={{ marginTop: 4 }}>
                    ${totalSaved.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                </Card>
                <Card style={{ flex: 1 }} radius={Spacing.radius.lg} padding={Spacing.md}>
                  <Text variant="caption1" color={colors.labelSecondary}>{t('goal.targetAmount')}</Text>
                  <Text variant="title3" style={{ marginTop: 4 }}>
                    ${totalTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                </Card>
              </View>
            </View>

            {/* Goals list */}
            <View style={[styles.section, { marginTop: Spacing.xl }]}>
              {goals.map(goal => {
                const current = goal.current_amount ?? 0;
                const pct = goal.target_amount > 0
                  ? Math.min((current / goal.target_amount) * 100, 100)
                  : 0;
                const isComplete = pct >= 100;
                const fillColor = isComplete ? colors.income : colors.savings;

                let deadlineText = t('goals.noDeadline');
                let deadlineIsOverdue = false;
                if (goal.deadline) {
                  const days = daysUntil(goal.deadline);
                  deadlineIsOverdue = days < 0;
                  deadlineText = deadlineIsOverdue
                    ? t('goals.overdue')
                    : t('goals.daysLeft', { count: days });
                }

                return (
                  <Card key={goal.id} radius={Spacing.radius.lg} padding={Spacing.md} style={{ marginBottom: Spacing.sm }}>
                    {/* Header row — tap to edit */}
                    <TouchableOpacity
                      style={styles.goalHeader}
                      onPress={() => setEditGoal(goal)}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.goalEmoji, { backgroundColor: `${fillColor}18` }]}>
                        <Text variant="title3" align="center">{goal.icon ?? '🎯'}</Text>
                      </View>
                      <View style={styles.goalInfo}>
                        <Text variant="headline">{goal.name}</Text>
                        <Text
                          variant="caption1"
                          color={deadlineIsOverdue ? colors.expense : colors.labelSecondary}
                        >
                          {deadlineText}
                        </Text>
                      </View>
                      <View style={styles.goalActions}>
                        <Text variant="footnote" color={fillColor} style={{ fontWeight: '700' }}>
                          {Math.round(pct)}%
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Progress bar */}
                    <View style={{ marginTop: Spacing.sm, gap: 4 }}>
                      <View style={[styles.progressTrack, { backgroundColor: colors.fillPrimary }]}>
                        <View
                          style={[styles.progressFill, { width: `${pct}%`, backgroundColor: fillColor }]}
                        />
                      </View>
                      <View style={styles.amountRow}>
                        <Text variant="caption1" color={colors.labelSecondary}>
                          ${current.toLocaleString('en-US', { maximumFractionDigits: 0 })} {t('goals.saved')}
                        </Text>
                        <Text variant="caption1" color={colors.labelSecondary}>
                          ${Math.max(0, goal.target_amount - current).toLocaleString('en-US', { maximumFractionDigits: 0 })} {t('goals.toGo')}
                        </Text>
                      </View>
                    </View>

                    {/* Contribute button */}
                    {!isComplete && (
                      <TouchableOpacity
                        style={[styles.contributeBtn, { backgroundColor: `${fillColor}14`, borderColor: `${fillColor}33` }]}
                        onPress={() => setContributeGoal(goal)}
                        activeOpacity={0.75}
                      >
                        <Text variant="footnote" color={fillColor} style={{ fontWeight: '600' }}>
                          + {t('goals.contribute')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <AddGoalSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onSuccess={() => { setAddSheetVisible(false); fetchData(); }}
      />

      <AddGoalSheet
        visible={editGoal !== null}
        initialGoal={editGoal}
        onClose={() => setEditGoal(null)}
        onSuccess={() => { setEditGoal(null); fetchData(); }}
        onDelete={async (id) => {
          await supabase.from('savings_goals').delete().eq('id', id);
          setEditGoal(null);
          fetchData();
        }}
      />

      <ContributeGoalSheet
        visible={contributeGoal !== null}
        goal={contributeGoal}
        accounts={accounts}
        onClose={() => setContributeGoal(null)}
        onSuccess={() => { setContributeGoal(null); fetchData(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  centered: { padding: 40, alignItems: 'center' },
  emptyState: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: 60, alignItems: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyBtn: { marginTop: 16, paddingHorizontal: Spacing.lg, paddingVertical: 12, borderRadius: Spacing.radius.full },
  section: { paddingHorizontal: Spacing.screenHorizontal },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalEmoji: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  goalInfo: { flex: 1, gap: 2 },
  goalActions: { alignItems: 'flex-end', gap: 6 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  contributeBtn: {
    marginTop: 12, paddingVertical: 8,
    borderRadius: Spacing.radius.md, alignItems: 'center', borderWidth: 1,
  },
});
