-- ─────────────────────────────────────────────────────────────────────────────
-- Push notifications support
-- Run this in the Supabase SQL editor (dashboard > SQL Editor > New query).
-- After running, also set the two database settings shown at the bottom.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. pg_net lets triggers make outbound HTTP calls
create extension if not exists pg_net with schema extensions;

-- 2. Table that stores each user's registered Expo push tokens
create table if not exists public.push_tokens (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  token       text        not null,
  platform    text        not null check (platform in ('ios', 'android', 'web')),
  updated_at  timestamptz not null default now(),
  unique(user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "Users manage own push tokens"
  on public.push_tokens for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Trigger function: invokes the Edge Function when a notification row is inserted
create or replace function public.on_notification_insert()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
  _key text := current_setting('app.service_role_key', true);
begin
  -- Skip silently if the settings haven't been configured yet
  if _url is null or _key is null then
    return new;
  end if;

  perform extensions.http_post(
    url        := _url || '/functions/v1/send-push-notification',
    headers    := jsonb_build_object(
                    'Content-Type',  'application/json',
                    'Authorization', 'Bearer ' || _key
                  ),
    body       := jsonb_build_object('notification_id', new.id)::text,
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

create trigger send_push_on_notification
  after insert on public.notifications
  for each row execute function public.on_notification_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- REQUIRED: run these two lines once to configure the trigger.
-- Replace the placeholder values with your actual project ref and service role key
-- (found in Supabase dashboard > Project Settings > API).
-- ─────────────────────────────────────────────────────────────────────────────
-- alter database postgres set app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
-- alter database postgres set app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
