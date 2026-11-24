import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { RefreshScrollView } from '@/components/ui/RefreshScrollView';
import { supabase } from '@/lib/supabase';
import { Icon, isKnownIcon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryModal, type CategoryData } from '@/components/CategoryModal';

type AppColors = typeof Colors[keyof typeof Colors];

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CategoriesSkeleton({ colors }: { colors: AppColors }) {
  return (
    <View style={{ paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.md }}>
      <Card radius={Spacing.radius.lg} padding={0}>
        {([1, 2, 3, 4] as const).map((i) => (
          <View key={i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, gap: Spacing.sm }}>
              <Skeleton width={36} height={36} radius={18} />
              <Skeleton width={120} height={14} radius={7} />
            </View>
            {i < 4 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 60 }} />}
          </View>
        ))}
      </Card>
    </View>
  );
}

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryData | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('categories')
        .select('id, label, color, icon')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      setCategories(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleAdd = () => {
    setEditCategory(null);
    setModalVisible(true);
  };

  const handleEdit = (cat: CategoryData) => {
    setEditCategory(cat);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundGrouped }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <BackIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="headline" style={{ flex: 1 }} align="center">{t('profile.categories')}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.fillPrimary }]}
          onPress={handleAdd}
          activeOpacity={0.7}
        >
          <PlusIcon color={colors.tint} />
        </TouchableOpacity>
      </View>

      <RefreshScrollView onRefresh={() => fetchData(true)} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {loading ? (
          <CategoriesSkeleton colors={colors} />
        ) : categories.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyEmoji}>
              <Icon name="Tag" size={40} color={colors.labelTertiary} strokeWidth={1.4} />
            </View>
            <Text variant="callout" align="center" color={colors.labelSecondary}>
              {t('categories.empty')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
              onPress={handleAdd}
              activeOpacity={0.85}
            >
              <Text variant="callout" color={colors.tintForeground}>{t('categories.add')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: Spacing.screenHorizontal, marginTop: Spacing.md }}>
            <Card radius={Spacing.radius.lg} padding={0}>
              {categories.map((cat, index) => (
                <View key={cat.id}>
                  <TouchableOpacity
                    style={[styles.catRow, { paddingHorizontal: Spacing.md }]}
                    onPress={() => handleEdit(cat)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.catIcon, { backgroundColor: `${cat.color}20` }]}>
                      {isKnownIcon(cat.icon) ? (
                        <Icon name={cat.icon} size={18} color={cat.color} />
                      ) : cat.icon && /[^\x20-\x7E]/.test(cat.icon) ? (
                        <Text style={{ fontSize: 18, lineHeight: 22, textAlign: 'center' }}>{cat.icon}</Text>
                      ) : (
                        <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      )}
                    </View>
                    <Text variant="callout" style={{ flex: 1, fontWeight: '500' }}>{cat.label}</Text>
                    <Icon name="ChevronRight" size={16} color={colors.labelTertiary} />
                  </TouchableOpacity>
                  {index < categories.length - 1 && (
                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 60 }} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}
      </RefreshScrollView>

      <CategoryModal
        visible={modalVisible}
        category={editCategory}
        onClose={() => setModalVisible(false)}
        onSuccess={() => { setModalVisible(false); fetchData(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  backBtn: { width: 32 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  emptyState: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: 60, alignItems: 'center' },
  emptyEmoji: { marginBottom: 8 },
  emptyBtn: { marginTop: 16, paddingHorizontal: Spacing.lg, paddingVertical: 12, borderRadius: Spacing.radius.full },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: Spacing.sm },
  catIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catDot: { width: 10, height: 10, borderRadius: 5 },
});
