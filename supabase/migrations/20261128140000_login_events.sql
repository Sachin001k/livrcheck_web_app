-- LivrCheck — login history: one row every time someone signs in
-- (email + password, email link, Google or phone), on the website or the app.
--
-- How to apply: Supabase dashboard → SQL Editor → paste → Run.
-- Needs the initial schema first. Safe to run more than once.
--
-- Account details themselves (email, phone, name, sign-up date) are already
-- in public.profiles, created automatically on sign-up. Passwords are never
-- stored here: Supabase Auth keeps only a secure hash in auth.users.
--
-- Rows are written by a trigger on auth.sessions (a new session = a sign-in),
-- so no app code is needed. Users can read their own history; nobody can
-- write to it through the API. Rows are deleted with the account.

create table if not exists public.login_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  email        text,
  phone        text,
  provider     text,        -- 'email', 'google', 'phone', …
  ip_address   inet,
  user_agent   text,        -- browser / device
  signed_in_at timestamptz not null default now()
);

create index if not exists login_events_user_time_idx
  on public.login_events (user_id, signed_in_at desc);
create index if not exists login_events_time_idx
  on public.login_events (signed_in_at desc);

alter table public.login_events enable row level security;

revoke all on table public.login_events from anon, authenticated;
grant select on table public.login_events to authenticated;

drop policy if exists "login_events: read own" on public.login_events;
create policy "login_events: read own" on public.login_events
  for select to authenticated using ((select auth.uid()) = user_id);

-- Records the sign-in. Any failure here is swallowed so it can never block
-- someone from logging in.
create or replace function public.record_login_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.login_events (user_id, email, phone, provider, ip_address, user_agent, signed_in_at)
    select u.id,
           u.email,
           u.phone,
           coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
           new.ip,
           left(new.user_agent, 500),
           coalesce(new.created_at, now())
      from auth.users u
     where u.id = new.user_id;
  exception when others then
    raise warning 'record_login_event failed: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.record_login_event() from public, anon, authenticated;

drop trigger if exists on_auth_session_created on auth.sessions;
create trigger on_auth_session_created
  after insert on auth.sessions
  for each row execute function public.record_login_event();

-- Handy queries (run in the SQL editor, which bypasses RLS):
--   Latest sign-ins:
--     select signed_in_at, email, provider, user_agent
--       from public.login_events order by signed_in_at desc limit 100;
--   Sign-ins per day:
--     select date_trunc('day', signed_in_at) as day, count(*), count(distinct user_id) as people
--       from public.login_events group by 1 order by 1 desc;
--   Everyone who has an account:
--     select p.full_name, p.email, p.phone, p.created_at, u.last_sign_in_at
--       from public.profiles p join auth.users u on u.id = p.id order by p.created_at desc;
