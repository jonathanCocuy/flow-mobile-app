import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface DividerProps {
  inset?: number;
}

export function Divider({ inset = 0 }: DividerProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.line,
        { backgroundColor: colors.separator, marginLeft: inset },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
  },
});
