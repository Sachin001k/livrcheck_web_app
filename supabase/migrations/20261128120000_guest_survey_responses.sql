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
