import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from '@/i18n';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SplashView } from '@/components/SplashView';

SplashScreen.preventAutoHideAsync();

// ── Auth guard: redirect to (auth), onboarding, or (tabs) ────────────────────
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      if (!inAuthGroup) router.replace('/(auth)/welcome');
      return;
    }

    // User is authenticated
    if (inAuthGroup) {
      if (user.user_metadata?.onboarding_done) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, segments]);

  return <>{children}</>;
}

// ── Font + splash loader ──────────────────────────────────────────────────────
function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if ((!fontsLoaded && !fontError) || !i18nReady) {
    return <SplashView />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="accounts" />
          <Stack.Screen name="split" />
          <Stack.Screen name="split-detail" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Not Found' }} />
        </Stack>
      </AuthGate>
    </I18nextProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
