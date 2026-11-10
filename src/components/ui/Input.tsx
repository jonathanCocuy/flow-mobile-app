import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { FontFamily } from '@/constants/Typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  secureToggle?: boolean;
}

function EyeIcon({ visible, color }: { visible: boolean; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      {visible ? (
        <>
          <Path d="M10 4C5 4 2 10 2 10C2 10 5 16 10 16C15 16 18 10 18 10C18 10 15 4 10 4Z" stroke={color} strokeWidth={1.5} />
          <Path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke={color} strokeWidth={1.5} />
        </>
      ) : (
        <>
          <Path d="M3 3L17 17M10 4C5 4 2 10 2 10C2 10 3.5 12.5 6 14.5M10 16C15 16 18 10 18 10C18 10 16.5 7.5 14 5.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M7.5 7.5C7.5 7.5 7.5 10 10 12.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

export const Input = forwardRef<React.ElementRef<typeof TextInput>, InputProps>(function Input(
  { label, error, hint, secureToggle, style, secureTextEntry, ...props },
  ref,
) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [showPassword, setShowPassword] = useState(false);

  const hasError = !!error;
  const isSecure = secureToggle ? !showPassword : secureTextEntry;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text variant="footnote" color={colors.labelSecondary} style={styles.label}>
          {label.toUpperCase()}
        </Text>
      )}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.fillTertiary,
            borderColor: hasError ? colors.expense : 'transparent',
          },
        ]}
      >
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              color: colors.label,
              fontFamily: FontFamily.aeonikRegular,
              fontSize: 16,
            },
            style,
          ]}
          placeholderTextColor={colors.labelTertiary}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <EyeIcon visible={showPassword} color={colors.labelTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {(error || hint) && (
        <Text
          variant="caption1"
          color={hasError ? colors.expense : colors.labelSecondary}
          style={styles.helperText}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    letterSpacing: 0.5,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 50,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: '100%',
  },
  eyeBtn: {
    paddingLeft: Spacing.xs,
  },
  helperText: {
    marginLeft: 2,
  },
});
