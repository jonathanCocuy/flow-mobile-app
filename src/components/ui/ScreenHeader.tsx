import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing } from '@/constants/Spacing';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  largeTitle?: boolean;
}

export function ScreenHeader({ title, subtitle, right, largeTitle = true }: ScreenHeaderProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (largeTitle ? 8 : 12),
          paddingHorizontal: Spacing.screenHorizontal,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          {subtitle && (
            <Text variant="footnote" color={colors.labelSecondary} style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
          <Text variant={largeTitle ? 'largeTitle' : 'title2'} style={styles.title}>
            {title}
          </Text>
        </View>
        {right && <View style={styles.right}>{right}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    flexShrink: 1,
  },
  subtitle: {
    marginBottom: 2,
  },
  right: {
    flexShrink: 0,
    marginLeft: Spacing.sm,
  },
});
