// Supabase Edge Function — called by the notifications table trigger.
// Sends a push notification via the Expo Push API to every registered device
// of the notification's target user.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  try {
    const { notification_id } = await req.json() as { notification_id: string };
    if (!notification_id) {
      return new Response(JSON.stringify({ error: 'notification_id required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load the notification
    const { data: notification, error: nErr } = await supabase
      .from('notifications')
      .select('user_id, title, body, data, type')
      .eq('id', notification_id)
      .single();

    if (nErr || !notification) {
      return new Response(JSON.stringify({ error: 'notification not found' }), { status: 404 });
    }

    // Load all registered push tokens for this user
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', notification.user_id);

    if (!tokens?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
    }

    // Build Expo push messages
    const messages = tokens.map(({ token }: { token: string }) => ({
      to: token,
      sound: 'default',
      title: notification.title as string,
      body: notification.body as string,
      data: (notification.data as Record<string, unknown>) ?? {},
      channelId: 'default',
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });

    const result = await expoRes.json();
    return new Response(JSON.stringify({ ok: true, sent: tokens.length, result }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
