import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing } from '@/constants/Spacing';

interface CardProps extends ViewProps {
  padding?: number;
  radius?: number;
}

export function Card({ padding = Spacing.md, radius = Spacing.radius.lg, style, ...props }: CardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius,
          padding,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.cardBorder,
        },
        style,
      ]}
      {...props}
    />
  );
}
