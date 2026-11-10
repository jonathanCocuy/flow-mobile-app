import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Disable Supabase trace propagation — no OTel runtime in this app.
// The extractor key is what supabase-js checks before injecting traceparent headers.
delete (globalThis as Record<symbol, unknown>)[
  Symbol.for('@supabase/supabase-js.traceContextExtractor')
];

// ── Storage adapter ───────────────────────────────────────────────────────────
// Native: iOS Keychain / Android Keystore via expo-secure-store
// Web:    localStorage (SecureStore is not available outside native)
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
      return;
    }
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};

// ── Supabase client ────────────────────────────────────────────────────────────
// Replace these with your project's URL and anon key from supabase.com/dashboard
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  tracePropagation: false,
});
