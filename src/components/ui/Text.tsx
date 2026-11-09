import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { TextStyles } from '@/constants/Typography';
import { useThemeColors } from '@/hooks/useThemeColors';

type Variant = keyof typeof TextStyles;

interface ThemedTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function Text({
  variant = 'body',
  color,
  align,
  style,
  ...props
}: ThemedTextProps) {
  const colors = useThemeColors();

  return (
    <RNText
      style={[
        TextStyles[variant],
        { color: color ?? colors.label },
        align && { textAlign: align },
        style,
      ]}
      {...props}
    />
  );
}
