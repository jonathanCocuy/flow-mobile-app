import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from './supabase';

const PROJECT_ID = (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? '';

// Must be called at module level (outside React) so it is set before the first
// notification arrives. Place this at the top of the root _layout.tsx file.
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true, // show floating banner even when app is in foreground
      shouldShowList: true,
    }),
  });
}

/** Request permission, get the Expo push token, and persist it to Supabase. */
export async function registerForPushNotificationsAsync(): Promise<void> {
  // Android 8+: a notification channel must exist before requesting permission.
  // Wrapped in try-catch because the native module can throw a NullPointerException
  // if the Android context hasn't fully initialized yet (e.g. cold start race).
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'FlowX',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch {
      // Channel creation is best-effort; notifications still work without it.
    }
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
    });
    await savePushToken(token);
  } catch {
    // Push token is best-effort — don't block the user if it fails
  }
}

async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('push_tokens').upsert(
    { user_id: user.id, token, platform: Platform.OS, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,token' },
  );
}

/**
 * Attach notification listeners. Returns a cleanup function — call it when the
 * component that owns the listeners unmounts.
 *
 * - `onNotificationReceived`: called when a notification arrives in the foreground.
 *   The OS banner is already handled by setNotificationHandler; use this to
 *   update in-app state (e.g. refresh the unread badge).
 * - Tapping any notification navigates the user to the home tab.
 */
export function addNotificationListeners(
  onNotificationReceived?: () => void,
): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener(() => {
    onNotificationReceived?.();
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
    router.push('/(tabs)' as never);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
