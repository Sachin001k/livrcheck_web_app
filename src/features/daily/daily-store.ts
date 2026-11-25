// Port of lib/daily/daily_store.dart — daily check-ins, logs and coins in
// Supabase (tables daily_checkins and coin_events, view coin_balances).
// The award_coins trigger sets each amount from reward_rules and rejects
// unearned coins; the amounts sent here are only what the app expects.
import { supabase } from "@/lib/supabase";
import { bumpChanges, check, fetchAllRows } from "@/lib/data";
import { dateOnly, parseDateOnly } from "@/lib/dates";
import {
  bonusScore, coinsForBonus, coinsForCheckin, coinsForLog, isLogEmpty,
  logFromMap, logToMap, scoreDay, type DailyLog, type DailyTargets,
} from "./daily-targets";

/** 'yyyy-mm-dd' in local time (dayKey in progress_store.dart). */
export const dayKey = (d: Date) => dateOnly(d);

/** One day in the "Every day" history. */
export interface DailyEntry {
  day: Date;
  checkedIn: boolean;
  log: DailyLog | null;
  score: number | null;
  coins: number;
}

export const entryLogged = (e: DailyEntry | null | undefined): boolean =>
  !!e && e.log !== null && !isLogEmpty(e.log);

export interface DailySummary {
  /** Keyed by 'yyyy-mm-dd'. */
  days: Record<string, DailyEntry>;
  totalCoins: number;
}

export const summaryToday = (s: DailySummary): DailyEntry | undefined => s.days[dayKey(new Date())];

/** Result of saving a day's log: the score and the coins newly earned. */
export interface LogOutcome { score: number; coinsEarned: number }

/** Adds up coin rows ({day, amount}) into a total and per-day totals.
 * Special survey coins have no day: they count towards the total only. */
export function sumCoins(rows: { day?: string | null; amount: number | string }[]): { byDay: Record<string, number>; total: number } {
  const byDay: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const amount = Math.trunc(Number(row.amount));
    total += amount;
    const day = row.day ?? null;
    if (day !== null) byDay[day] = (byDay[day] ?? 0) + amount;
  }
  return { byDay, total };
}

const db = () => supabase();

async function uid(): Promise<string> {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

/** Inserts a coin event; false if it was already earned (or rejected silently). */
async function award(userId: string, day: string, reason: string, amount: number): Promise<boolean> {
  const rows = check(await db().from("coin_events")
    .upsert({ user_id: userId, day, reason, amount }, { onConflict: "user_id,day,reason", ignoreDuplicates: true })
    .select("id")) as unknown[] | null;
  return (rows?.length ?? 0) > 0;
}

export const DailyStore = {
  /** All coins ever earned, from the coin_balances view (none yet → 0). */
  async fetchCoinTotal(): Promise<number> {
    const row = check(await db().from("coin_balances").select("total").maybeSingle()) as { total?: number | string } | null;
    return row?.total == null ? 0 : Math.trunc(Number(row.total));
  },

  async load(days = 120): Promise<DailySummary> {
    const since = dayKey(new Date(Date.now() - days * 86400000));
    const [checkins, coinRows, total] = await Promise.all([
      fetchAllRows(() => db().from("daily_checkins").select().gte("day", since).order("day", { ascending: true })),
      // Per-day coins for the loaded window only (paged and ordered); the
      // total comes from coin_balances.
      fetchAllRows(() => db().from("coin_events").select("day, amount").gte("day", since)
        .order("day", { ascending: true }).order("id", { ascending: true })),
      DailyStore.fetchCoinTotal(),
    ]);
    const { byDay } = sumCoins(coinRows as { day: string | null; amount: number }[]);
    const entries: Record<string, DailyEntry> = {};
    for (const row of checkins) {
      const day = row.day as string;
      entries[day] = {
        day: parseDateOnly(day),
        checkedIn: true,
        log: row.logged_at == null ? null : logFromMap(row),
        score: row.score == null ? null : Math.trunc(Number(row.score)),
        coins: byDay[day] ?? 0,
      };
    }
    return { days: entries, totalCoins: total };
  },

  /** "Check in" for today: +1 coin, once a day. True if newly earned. */
  async checkIn(): Promise<boolean> {
    const userId = await uid();
    const today = dayKey(new Date());
    check(await db().from("daily_checkins").upsert(
      { user_id: userId, day: today },
      { onConflict: "user_id,day", ignoreDuplicates: true },
    ));
    const earned = await award(userId, today, "checkin", coinsForCheckin);
    bumpChanges();
    return earned;
  },

  /** Saves today's log and awards coins the first time each is earned. */
  async saveLog(log: DailyLog, targets: DailyTargets): Promise<LogOutcome> {
    const userId = await uid();
    const today = dayKey(new Date());
    const score = scoreDay(log, targets).score;
    const now = new Date().toISOString();
    check(await db().from("daily_checkins").upsert(
      { user_id: userId, day: today, ...logToMap(log), score, logged_at: now, updated_at: now },
      { onConflict: "user_id,day" },
    ));
    let coins = 0;
    // Logging counts as checking in too.
    if (await award(userId, today, "checkin", coinsForCheckin)) coins += coinsForCheckin;
    if (await award(userId, today, "daily_log", coinsForLog)) coins += coinsForLog;
    if (score >= bonusScore && (await award(userId, today, "daily_bonus", coinsForBonus))) coins += coinsForBonus;
    bumpChanges();
    return { score, coinsEarned: coins };
  },
};
