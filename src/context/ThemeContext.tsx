import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// RN 0.76 supports null to reset to the OS scheme; TS types are incomplete.
type SetSchemeFn = (scheme: 'light' | 'dark' | null) => void;
const setAppearanceScheme = Appearance.setColorScheme.bind(Appearance) as SetSchemeFn;

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@flowx_theme';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  setPreference: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Restore saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setPreferenceState(saved);
        setAppearanceScheme(saved === 'system' ? null : saved);
      }
    });
  }, []);

  const setPreference = useCallback(async (p: ThemePreference) => {
    setPreferenceState(p);
    setAppearanceScheme(p === 'system' ? null : p);
    await AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemeContext);
}
