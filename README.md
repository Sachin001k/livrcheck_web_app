# LivrCheck — web app

The web version of LivrCheck: a free fatty-liver (NAFLD/MASLD) screening,
daily healthy-habit tracker and liver guide for people in India, in 9 languages.

It is a port of the Flutter app (`livercheck-app_shreya`) to **Next.js 16 +
TypeScript + Tailwind 4**, and talks to the **same Supabase project**. Accounts,
health checks, daily logs, coins and badges are shared between this site and the
Android app. There is no custom backend: Row Level Security and the database
triggers (migrations 1–7 in the Flutter repo) police the data, exactly as they
do for the app.

> LivrCheck is a screening tool, not a diagnosis. All medical text, targets and
> translations are drafts pending doctor, dietitian and native-speaker review.

## Run it locally

```bash
cp .env.example .env.local   # then fill in the two values below
npm install
npm run dev                  # http://localhost:3000
```

`.env.local` needs the same values as the Flutter app's `env.json`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `SUPABASE_URL` from env.json |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` from env.json (the anon / publishable key) |

Only the anon key goes here. It ends up in public JavaScript and RLS protects the
data. **Never** use the `service_role` key in this app. `.env*` files are
git-ignored.

### Supabase settings for the web app

In Supabase → Authentication → URL Configuration, add every origin the site runs
on to **Redirect URLs** (sign-up confirmation and password-reset links come back
to the site, e.g. `/dashboard`): `http://localhost:3000/**`, and your production
domain, e.g. `https://<your-domain>/**`. The `/**` matters: without it Supabase
only allows the bare origin and sends people to the Site URL instead.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests (scoring, FIB-4, targets, coins, badges, Guide) — ports of the Flutter tests |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `python3 scripts/convert_translations.py <flutter-app-path>` | Regenerates `src/i18n/*.json` from the Flutter app's `lib/translations/*.dart` |

## Deploy (Vercel)

1. Import this repo in Vercel (framework: Next.js; no build settings to change).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under
   Project → Settings → Environment Variables.
3. Add the production URL to Supabase Redirect URLs (above).

Unlike the Flutter web build, pushes to `main` deploy automatically once the repo
is connected, because Vercel builds Next.js natively.

`public/privacy.html` and `public/delete-account.html` are the same static pages
as the Flutter app's, so they work as the Play Store privacy-policy and
account-deletion URLs.

## Code map

```
src/
  app/                    routes (App Router)
    (site)/               public website (header + footer, no login needed)
      page.tsx            landing page (/)
      guide/…             the full liver guide, free to read
    login/  signup/       auth pages (?next= returns to the page that sent you)
    (app)/                signed-in area, behind the auth gate (→ /login if signed out)
      dashboard/          the app's Home tab   check/      Health check
      rewards/…           Rewards + special surveys
      profile/            Profile              settings/   Settings
    privacy/              privacy policy (public)
  components/
    session.tsx           session + profile state (AuthGate's data)
    gate.tsx              welcome → login → consent → profile setup → app
    shell.tsx             site header (Log in / Sign up, or the 5 app sections), footer, phone tab bar
    ui.tsx                SurfaceCard, BigButton, Sheet, Dialog, toasts, skeletons…
  lib/
    supabase.ts  data.ts  auth.ts  i18n.tsx  streak.ts  dates.ts  storage.ts
  features/               one folder per Flutter feature folder
    onboarding/ check/ daily/ home/ guide/ rewards/ profile/
  features/site/          the landing page
  i18n/                   9 languages, generated from the Flutter app
  i18n/web/               website-only text (en + hi; others fall back to English)
```

Each `features/*` file is a port of the Dart file with the same name
(`daily_store.dart` → `daily-store.ts`) and keeps its public names, so a change
in one app can be mirrored in the other. Coin amounts live in the
`reward_rules` table and are mirrored in `features/daily/daily-targets.ts` for
display, the same as in the app; keep them in sync.

## Keeping the two apps in step

- Database changes go in the Flutter repo's `supabase/migrations/` (single source of truth).
- Translation changes: edit the Dart files, then re-run the converter script.
- Bump `currentConsentVersion` in `src/lib/data.ts` together with the app's.
