import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

type DeepMutable<T> = { -readonly [K in keyof T]: T[K] };
export type ThemeColors = DeepMutable<typeof Colors.light>;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme] as unknown as ThemeColors;
}
