import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from './Text';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing } from '@/constants/Spacing';

type Variant = 'filled' | 'tinted' | 'plain' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  size?: Size;
  label: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

const sizeStyles = {
  sm: { height: 36, paddingHorizontal: 14, borderRadius: 10 },
  md: { height: 44, paddingHorizontal: 20, borderRadius: 12 },
  lg: { height: 52, paddingHorizontal: 24, borderRadius: 14 },
};

export function Button({
  variant = 'filled',
  size = 'md',
  label,
  loading = false,
  icon,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const colors = useThemeColors();

  const bgColor = {
    filled: colors.tint,
    tinted: `${colors.tint}1A`,
    plain: 'transparent',
    destructive: colors.tintRed,
  }[variant];

  const textColor = {
    filled: '#FFFFFF',
    tinted: colors.tint,
    plain: colors.tint,
    destructive: '#FFFFFF',
  }[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled || loading}
      style={[
        styles.base,
        sizeStyles[size],
        { backgroundColor: bgColor, opacity: disabled ? 0.4 : 1 },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon}
          <Text
            variant={size === 'sm' ? 'subheadline' : 'headline'}
            color={textColor}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
