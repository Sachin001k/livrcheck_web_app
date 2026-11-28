-- LivrCheck — full database setup for a new (empty) Supabase project.
-- Generated from supabase/migrations/ in date order. Paste the whole file into
-- Supabase dashboard → SQL Editor → New query → Run. Safe to run more than once.


-- ════════════════════════════════════════════════════════════════════
-- 20260929120000_initial_schema.sql
-- ════════════════════════════════════════════════════════════════════
-- LivrCheck — migration 1: initial schema.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. It is safe to run more than once.
--
-- After running, check Table Editor: you should see profiles, assessments,
-- daily_activity and survey_responses. Every new sign-up then gets a row in
-- `profiles` automatically (name + email).
--
-- Every table has Row Level Security (RLS) on, so a signed-in user can only
-- ever read and write their own rows — even though the app ships with the
-- public anon key.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: one row per user, created automatically on sign-up.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text,
  phone              text,
  full_name          text,
  age                int check (age between 1 and 120),
  gender             text check (gender in ('male', 'female', 'other', 'prefer_not')),
  height_cm          numeric check (height_cm > 0),
  weight_kg          numeric check (weight_kg > 0),
  preferred_language text not null default 'en',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check ((select auth.uid()) = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using ((select auth.uid()) = id);

-- Older copies of this file had no email/phone columns.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;

-- Create a profile whenever a new user signs up, copying their email/phone
-- and the name entered on the sign-up form (or from Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email / phone in sync if the user changes them.
create or replace function public.handle_user_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = new.email, phone = new.phone, updated_at = now()
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_contact_changed on auth.users;
create trigger on_auth_user_contact_changed
  after update of email, phone on auth.users
  for each row execute function public.handle_user_contact_change();

-- Accounts created before this migration ran get a profile too.
insert into public.profiles (id, email, phone, full_name)
select u.id,
       u.email,
       u.phone,
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
  from auth.users u
on conflict (id) do update
  set email = excluded.email,
      phone = excluded.phone,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

-- ─────────────────────────────────────────────────────────────────────────
-- assessments: every FIB-4 check a user runs.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.assessments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  age            numeric not null,
  ast            numeric not null,
  alt            numeric not null,
  platelets      numeric not null,
  fib4_score     numeric not null,
  risk_tier      text not null check (risk_tier in ('low', 'intermediate', 'high')),
  height_cm      numeric,
  weight_kg      numeric,
  bmi            numeric,
  has_diabetes   text check (has_diabetes in ('yes', 'no', 'notSure')),
  family_history text check (family_history in ('yes', 'no', 'notSure')),
  created_at     timestamptz not null default now()
);

create index if not exists assessments_user_created_idx
  on public.assessments (user_id, created_at desc);

alter table public.assessments enable row level security;

drop policy if exists "assessments: read own" on public.assessments;
create policy "assessments: read own" on public.assessments
  for select using ((select auth.uid()) = user_id);

drop policy if exists "assessments: insert own" on public.assessments;
create policy "assessments: insert own" on public.assessments
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "assessments: delete own" on public.assessments;
create policy "assessments: delete own" on public.assessments
  for delete using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- daily_activity: one row per user per day they opened the app. Powers the
-- streak and the activity grid on the profile screen.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.daily_activity (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_date date not null,
  primary key (user_id, activity_date)
);

alter table public.daily_activity enable row level security;

drop policy if exists "daily_activity: read own" on public.daily_activity;
create policy "daily_activity: read own" on public.daily_activity
  for select using ((select auth.uid()) = user_id);

drop policy if exists "daily_activity: insert own" on public.daily_activity;
create policy "daily_activity: insert own" on public.daily_activity
  for insert with check ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- survey_responses: ready for the upcoming survey. `answers` is JSON so the
-- questions can change without a schema change; bump `survey_version` when
-- they do.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.survey_responses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  survey_version text not null default 'v1',
  answers        jsonb not null,
  score          numeric,
  created_at     timestamptz not null default now()
);

create index if not exists survey_responses_user_created_idx
  on public.survey_responses (user_id, created_at desc);

alter table public.survey_responses enable row level security;

drop policy if exists "survey_responses: read own" on public.survey_responses;
create policy "survey_responses: read own" on public.survey_responses
  for select using ((select auth.uid()) = user_id);

drop policy if exists "survey_responses: insert own" on public.survey_responses;
create policy "survey_responses: insert own" on public.survey_responses
  for insert with check ((select auth.uid()) = user_id);


-- ════════════════════════════════════════════════════════════════════
-- 20260930120000_survey_results_and_habits.sql
-- ════════════════════════════════════════════════════════════════════
-- LivrCheck — migration 2: health check results and daily habits.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. Run migration 1 first. Safe to run more than once.

-- ─────────────────────────────────────────────────────────────────────────
-- survey_responses: keep the full result so past checks can be reopened.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.survey_responses add column if not exists tier text;
alter table public.survey_responses add column if not exists result jsonb;

drop policy if exists "survey_responses: delete own" on public.survey_responses;
create policy "survey_responses: delete own" on public.survey_responses
  for delete using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- daily_habits: which healthy habits the user ticked on each day. Powers
-- the streak (3+ habits = a streak day), XP and the activity grid.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.daily_habits (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day        date not null,
  habits     text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_habits enable row level security;

drop policy if exists "daily_habits: read own" on public.daily_habits;
create policy "daily_habits: read own" on public.daily_habits
  for select using ((select auth.uid()) = user_id);

drop policy if exists "daily_habits: insert own" on public.daily_habits;
create policy "daily_habits: insert own" on public.daily_habits
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "daily_habits: update own" on public.daily_habits;
create policy "daily_habits: update own" on public.daily_habits
  for update using ((select auth.uid()) = user_id);


-- ════════════════════════════════════════════════════════════════════
-- 20260930150000_daily_checkins_and_coins.sql
-- ════════════════════════════════════════════════════════════════════
-- LivrCheck — migration 3: daily check-in log and coins.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. Run migrations 1 and 2 first. Safe to run more than once.

-- ─────────────────────────────────────────────────────────────────────────
-- daily_checkins: one row per user per day with that day's log (water,
-- food, exercise…) and the score it earned. A row with no log yet means
-- the user only tapped "Check in".
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.daily_checkins (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day            date not null,
  water_ml       int  check (water_ml between 0 and 10000),
  calories       int  check (calories between 0 and 10000),
  exercise_min   int  check (exercise_min between 0 and 600),
  steps          int  check (steps between 0 and 100000),
  sleep_hours    numeric check (sleep_hours between 0 and 24),
  fruit_veg      int  check (fruit_veg between 0 and 30),
  sugary_items   int  check (sugary_items between 0 and 30),
  score          int  check (score between 0 and 100),
  logged_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_checkins enable row level security;

drop policy if exists "daily_checkins: read own" on public.daily_checkins;
create policy "daily_checkins: read own" on public.daily_checkins
  for select using ((select auth.uid()) = user_id);

drop policy if exists "daily_checkins: insert own" on public.daily_checkins;
create policy "daily_checkins: insert own" on public.daily_checkins
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "daily_checkins: update own" on public.daily_checkins;
create policy "daily_checkins: update own" on public.daily_checkins
  for update using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- coin_events: every coin a user earns. The balance is the sum of amount.
-- The unique key means each reward can only be earned once per day, and
-- the check fixes the amount per reason, so the app can't over-award.
--   checkin       +1   tapped "Check in" today
--   daily_log     +10  filled in today's log
--   daily_bonus   +20  today's log scored 90 or more
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.coin_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day        date not null,
  reason     text not null check (reason in ('checkin', 'daily_log', 'daily_bonus')),
  amount     int  not null,
  created_at timestamptz not null default now(),
  unique (user_id, day, reason),
  check (
    (reason = 'checkin'     and amount = 1)  or
    (reason = 'daily_log'   and amount = 10) or
    (reason = 'daily_bonus' and amount = 20)
  )
);

alter table public.coin_events enable row level security;

drop policy if exists "coin_events: read own" on public.coin_events;
create policy "coin_events: read own" on public.coin_events
  for select using ((select auth.uid()) = user_id);

drop policy if exists "coin_events: insert own" on public.coin_events;
create policy "coin_events: insert own" on public.coin_events
  for insert with check ((select auth.uid()) = user_id);


-- ════════════════════════════════════════════════════════════════════
-- 20260930180000_rewards_and_special_surveys.sql
-- ════════════════════════════════════════════════════════════════════
-- LivrCheck — migration 4: reward rules, server-checked coins, special surveys.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. Run migrations 1–3 first. Safe to run more than once.
--
-- What this adds
--   reward_rules              one row per way to earn coins (edit amounts here)
--   coin_events (changed)     amount is now set and checked by the server
--   special_surveys           surveys you announce later, each with its own reward
--   special_survey_responses  users' answers to those surveys
--   coin_balances (view)      each user's total coins, split by source
--
-- To add a new way to earn coins later: insert a row into reward_rules and
-- add its check to award_coins() below.

-- ─────────────────────────────────────────────────────────────────────────
-- reward_rules
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.reward_rules (
  reason      text primary key,
  amount      int  not null check (amount >= 0),
  description text not null,
  active      boolean not null default true
);

insert into public.reward_rules (reason, amount, description) values
  ('checkin',        1,  'Tapped Check in on the Home page (once a day)'),
  ('daily_log',      10, 'Filled in the daily health log (once a day)'),
  ('daily_bonus',    20, 'Daily log scored 90 or more (once a day)'),
  ('special_survey', 0,  'Completed a special survey (amount comes from the survey)')
on conflict (reason) do update
  set description = excluded.description;

alter table public.reward_rules enable row level security;

drop policy if exists "reward_rules: anyone signed in can read" on public.reward_rules;
create policy "reward_rules: anyone signed in can read" on public.reward_rules
  for select to authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- special_surveys: created by you in the Table Editor (or SQL). `questions`
-- is JSON so each survey can have its own questions.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.special_surveys (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  questions    jsonb not null default '[]'::jsonb,
  reward_coins int  not null default 50 check (reward_coins >= 0),
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.special_surveys enable row level security;

drop policy if exists "special_surveys: read live ones" on public.special_surveys;
create policy "special_surveys: read live ones" on public.special_surveys
  for select to authenticated
  using (is_active and starts_at <= now() and (ends_at is null or ends_at > now()));

create table if not exists public.special_survey_responses (
  id         uuid primary key default gen_random_uuid(),
  survey_id  uuid not null references public.special_surveys (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  answers    jsonb not null,
  created_at timestamptz not null default now(),
  unique (survey_id, user_id)
);

alter table public.special_survey_responses enable row level security;

drop policy if exists "special_survey_responses: read own" on public.special_survey_responses;
create policy "special_survey_responses: read own" on public.special_survey_responses
  for select using ((select auth.uid()) = user_id);

drop policy if exists "special_survey_responses: insert own" on public.special_survey_responses;
create policy "special_survey_responses: insert own" on public.special_survey_responses
  for insert with check ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- coin_events: generalise for special surveys and let the server set the
-- amount. Day-based rewards stay unique per day; special surveys are
-- unique per survey.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.coin_events add column if not exists ref_id uuid;
alter table public.coin_events alter column day drop not null;
alter table public.coin_events drop constraint if exists coin_events_check;
alter table public.coin_events drop constraint if exists coin_events_reason_check;
alter table public.coin_events drop constraint if exists coin_events_reason_fkey;
alter table public.coin_events
  add constraint coin_events_reason_fkey foreign key (reason) references public.reward_rules (reason);

create unique index if not exists coin_events_special_survey_once
  on public.coin_events (user_id, ref_id) where reason = 'special_survey';

-- Runs before every coin insert: sets the amount from the rules and refuses
-- rewards that weren't actually earned.
create or replace function public.award_coins()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule public.reward_rules%rowtype;
begin
  select * into rule from public.reward_rules where reason = new.reason and active;
  if not found then
    raise exception 'No active reward for %', new.reason;
  end if;

  if new.reason = 'special_survey' then
    select s.reward_coins into new.amount
      from public.special_surveys s
     where s.id = new.ref_id
       and s.is_active and s.starts_at <= now()
       and (s.ends_at is null or s.ends_at > now());
    if not found then
      raise exception 'That survey is not open';
    end if;
    if not exists (select 1 from public.special_survey_responses r
                    where r.survey_id = new.ref_id and r.user_id = new.user_id) then
      raise exception 'Answer the survey first';
    end if;
    new.day := null;
  else
    -- Day-based rewards: only for about today (allowing for time zones).
    if new.day is null or new.day not between current_date - 1 and current_date + 1 then
      raise exception 'Rewards can only be claimed for today';
    end if;
    new.amount := rule.amount;

    if new.reason = 'checkin' and not exists (
         select 1 from public.daily_checkins c
          where c.user_id = new.user_id and c.day = new.day) then
      raise exception 'Check in first';
    end if;
    if new.reason = 'daily_log' and not exists (
         select 1 from public.daily_checkins c
          where c.user_id = new.user_id and c.day = new.day and c.logged_at is not null) then
      raise exception 'Save the daily log first';
    end if;
    if new.reason = 'daily_bonus' and not exists (
         select 1 from public.daily_checkins c
          where c.user_id = new.user_id and c.day = new.day and c.score >= 90) then
      raise exception 'The bonus needs a daily score of 90 or more';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists coin_events_award on public.coin_events;
create trigger coin_events_award
  before insert on public.coin_events
  for each row execute function public.award_coins();

-- ─────────────────────────────────────────────────────────────────────────
-- coin_balances: totals per user, split by source. Handy in the Table
-- Editor; each user can only see their own row.
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.coin_balances
with (security_invoker = true) as
select
  user_id,
  coalesce(sum(amount), 0)::int                                        as total,
  coalesce(sum(amount) filter (where reason = 'checkin'), 0)::int        as from_checkins,
  coalesce(sum(amount) filter (where reason = 'daily_log'), 0)::int      as from_daily_logs,
  coalesce(sum(amount) filter (where reason = 'daily_bonus'), 0)::int    as from_bonuses,
  coalesce(sum(amount) filter (where reason = 'special_survey'), 0)::int as from_special_surveys
from public.coin_events
group by user_id;


-- ════════════════════════════════════════════════════════════════════
-- 20261001120000_consent_and_meals.sql
-- ════════════════════════════════════════════════════════════════════
-- LivrCheck — migration 5: user consent and meal details.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. Run migrations 1–4 first. Safe to run more than once.

-- When the user agreed to the terms, and which version they saw. The app
-- asks again if consent_version is older than the current one.
alter table public.profiles add column if not exists consent_at timestamptz;
alter table public.profiles add column if not exists consent_version text;

-- Foods picked in the daily log's meal picker, e.g. {"roti": 3, "dal": 1}.
-- The calories column still holds the total.
alter table public.daily_checkins add column if not exists meals jsonb;


-- ════════════════════════════════════════════════════════════════════
-- 20261001150000_delete_my_account.sql
-- ════════════════════════════════════════════════════════════════════
-- LivrCheck — migration 6: let users delete their own account.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. Run migrations 1–5 first. Safe to run more than once.
--
-- The app calls this with supabase.rpc('delete_my_account'). It deletes the
-- signed-in user from auth.users; every LivrCheck table references
-- auth.users with ON DELETE CASCADE, so all of their rows go with it:
-- profiles, assessments, survey_responses, daily_checkins, coin_events,
-- daily_activity, daily_habits, special_survey_responses.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

-- Only signed-in users may call it, and it only ever deletes themselves.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- ════════════════════════════════════════════════════════════════════
-- 20261024120000_integrity_fixes.sql
-- ════════════════════════════════════════════════════════════════════
-- LivrCheck — migration 7: integrity fixes.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. Run migrations 1–6 first. Safe to run more than once.
--
-- What this changes
--   award_coins()          refuses coins for another user (no probing of
--                          other users' check-ins / surveys through errors)
--   daily_checkins         new trigger: day must be about today, a "logged"
--                          row needs at least one item, score kept in 0–100
--   special_surveys        users can still read surveys they answered after
--                          the survey closes (completed list, "Survey star")
--
-- RLS stays on for every table; no policy is loosened beyond the user's
-- own answered surveys.

-- ─────────────────────────────────────────────────────────────────────────
-- award_coins(): same as migration 4, plus the user check at the top.
-- Callers through the API (anon / authenticated) may only award
-- themselves; the SQL editor and service role (admin backfills) are not
-- affected.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.award_coins()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule public.reward_rules%rowtype;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated')
     and new.user_id is distinct from auth.uid() then
    raise exception 'Coins can only be claimed for yourself';
  end if;

  select * into rule from public.reward_rules where reason = new.reason and active;
  if not found then
    raise exception 'No active reward for %', new.reason;
  end if;

  if new.reason = 'special_survey' then
    select s.reward_coins into new.amount
      from public.special_surveys s
     where s.id = new.ref_id
       and s.is_active and s.starts_at <= now()
       and (s.ends_at is null or s.ends_at > now());
    if not found then
      raise exception 'That survey is not open';
    end if;
    if not exists (select 1 from public.special_survey_responses r
                    where r.survey_id = new.ref_id and r.user_id = new.user_id) then
      raise exception 'Answer the survey first';
    end if;
    new.day := null;
  else
    -- Day-based rewards: only for about today (allowing for time zones).
    if new.day is null or new.day not between current_date - 1 and current_date + 1 then
      raise exception 'Rewards can only be claimed for today';
    end if;
    new.amount := rule.amount;

    if new.reason = 'checkin' and not exists (
         select 1 from public.daily_checkins c
          where c.user_id = new.user_id and c.day = new.day) then
      raise exception 'Check in first';
    end if;
    if new.reason = 'daily_log' and not exists (
         select 1 from public.daily_checkins c
          where c.user_id = new.user_id and c.day = new.day and c.logged_at is not null) then
      raise exception 'Save the daily log first';
    end if;
    -- Known limitation: `score` is computed by the app, so the 90+ bonus
    -- still trusts it (it is only clamped to 0–100 below). Fix by scoring
    -- the day on the server.
    if new.reason = 'daily_bonus' and not exists (
         select 1 from public.daily_checkins c
          where c.user_id = new.user_id and c.day = new.day and c.score >= 90) then
      raise exception 'The bonus needs a daily score of 90 or more';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists coin_events_award on public.coin_events;
create trigger coin_events_award
  before insert on public.coin_events
  for each row execute function public.award_coins();

-- ─────────────────────────────────────────────────────────────────────────
-- daily_checkins: sanity checks on every write.
--   The app writes (lib/daily/daily_store.dart):
--     check in  → insert {user_id, day = today}            (logged_at null)
--     save log  → upsert today's items, score, meals, logged_at, updated_at
--   Both are for "today" in the user's time zone, which is within
--   current_date ± 1 on the server.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.check_daily_checkin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- New rows, and updates that change the day or the logged data, must
  -- be for about today. (Updates that change nothing logged — e.g.
  -- updated_at only — are allowed on older rows.)
  if tg_op = 'INSERT'
     or new.day is distinct from old.day
     or (new.water_ml, new.calories, new.exercise_min, new.steps,
         new.sleep_hours, new.fruit_veg, new.sugary_items, new.score,
         new.logged_at, new.meals)
        is distinct from
        (old.water_ml, old.calories, old.exercise_min, old.steps,
         old.sleep_hours, old.fruit_veg, old.sugary_items, old.score,
         old.logged_at, old.meals) then
    if new.day is null or new.day not between current_date - 1 and current_date + 1 then
      raise exception 'Daily logs can only be saved for today';
    end if;

    -- A saved log must have at least one item filled in (the app only
    -- enables Save when one is).
    if new.logged_at is not null and num_nonnulls(
         new.water_ml, new.calories, new.exercise_min, new.steps,
         new.sleep_hours, new.fruit_veg, new.sugary_items) = 0 then
      raise exception 'A daily log needs at least one item';
    end if;
  end if;

  -- Known limitation: the score is still computed by the app, so the 90+
  -- bonus trusts it; here it is only kept within 0–100.
  if new.score is not null then
    new.score := least(100, greatest(0, new.score));
  end if;
  return new;
end;
$$;

drop trigger if exists daily_checkins_check on public.daily_checkins;
create trigger daily_checkins_check
  before insert or update on public.daily_checkins
  for each row execute function public.check_daily_checkin();

-- ─────────────────────────────────────────────────────────────────────────
-- special_surveys: also let users read surveys they have answered, so the
-- completed list and the "Survey star" badge survive the survey closing.
-- (Policies are OR-ed with "read live ones" from migration 4.)
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "special_surveys: read answered ones" on public.special_surveys;
create policy "special_surveys: read answered ones" on public.special_surveys
  for select to authenticated
  using (exists (
    select 1 from public.special_survey_responses r
     where r.survey_id = special_surveys.id
       and r.user_id = (select auth.uid())
  ));


-- ════════════════════════════════════════════════════════════════════
-- 20261128120000_guest_survey_responses.sql
-- ════════════════════════════════════════════════════════════════════
-- Health checks taken on the website without an account.
-- Visitors (anon) and signed-in users may INSERT only; nobody can read rows
-- back through the API. View them in the Supabase dashboard (service role).

create table if not exists public.guest_survey_responses (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null check (char_length(btrim(full_name)) between 1 and 100),
  email          text check (
                   email is null
                   or (char_length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
                 ),
  survey_version text not null default 'v1',
  answers        jsonb not null check (pg_column_size(answers) < 20000),
  score          numeric check (score is null or score between 0 and 100),
  tier           text check (tier is null or char_length(tier) <= 20),
  result         jsonb check (result is null or pg_column_size(result) < 60000),
  language       text check (language is null or char_length(language) <= 5),
  created_at     timestamptz not null default now()
);

create index if not exists guest_survey_responses_created_idx
  on public.guest_survey_responses (created_at desc);
create index if not exists guest_survey_responses_email_idx
  on public.guest_survey_responses (lower(email)) where email is not null;

alter table public.guest_survey_responses enable row level security;

-- Only the listed columns can be written; id and created_at are set here.
revoke all on table public.guest_survey_responses from anon, authenticated;
grant insert (full_name, email, survey_version, answers, score, tier, result, language)
  on table public.guest_survey_responses to anon, authenticated;

drop policy if exists "guest_survey_responses: anyone can insert" on public.guest_survey_responses;
create policy "guest_survey_responses: anyone can insert" on public.guest_survey_responses
  for insert to anon, authenticated
  with check (true);


-- ════════════════════════════════════════════════════════════════════
-- 20261128140000_login_events.sql
-- ════════════════════════════════════════════════════════════════════
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

