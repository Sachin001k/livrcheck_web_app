// Port of lib/learn/guide_store.dart — saves the 7-day challenge and the
// personal action plan.
//
// PREVIEW: stored on this device only (per user), like the app. Moves to
// Supabase (migration 8, with coins) once the UI is approved.
import { storage } from "@/lib/storage";

/** Monday of the week containing `day` (local date, no time). */
export function weekStart(day: Date): Date {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const weekday = (d.getDay() + 6) % 7; // 0 = Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekday);
}

/** Same key format as the app: guide_challenge_<user>_<y>-<m>-<d> (no padding). */
function weekKey(userId: string, monday: Date): string {
  return `guide_challenge_${userId}_${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
}

/** One week of the 7-day challenge. */
export class ChallengeWeek {
  /** habit index → weekday indexes ticked (0 = Monday … 6 = Sunday). */
  ticks: Map<number, Set<number>>;
  success: string;
  improve: string;

  constructor(ticks: Map<number, Set<number>> = new Map(), success = "", improve = "") {
    this.ticks = ticks;
    this.success = success;
    this.improve = improve;
  }

  static empty(): ChallengeWeek {
    return new ChallengeWeek();
  }

  isTicked(habit: number, day: number): boolean {
    return this.ticks.get(habit)?.has(day) ?? false;
  }

  toggle(habit: number, day: number): void {
    let set = this.ticks.get(habit);
    if (!set) this.ticks.set(habit, (set = new Set()));
    if (set.has(day)) set.delete(day);
    else set.add(day);
  }

  doneOn(day: number): number {
    let n = 0;
    for (const s of this.ticks.values()) if (s.has(day)) n++;
    return n;
  }

  get total(): number {
    let n = 0;
    for (const s of this.ticks.values()) n += s.size;
    return n;
  }

  /** A copy, so React sees a new object after a change. */
  clone(): ChallengeWeek {
    return new ChallengeWeek(
      new Map([...this.ticks].map(([k, v]) => [k, new Set(v)])),
      this.success,
      this.improve,
    );
  }

  toJson(): Record<string, unknown> {
    const ticks: Record<string, number[]> = {};
    for (const [k, v] of this.ticks) ticks[String(k)] = [...v].sort((a, b) => a - b);
    return { ticks, success: this.success, improve: this.improve };
  }

  static fromJson(j: Record<string, unknown>): ChallengeWeek {
    const ticks = new Map<number, Set<number>>();
    const raw = (j.ticks as Record<string, unknown> | undefined) ?? {};
    for (const [k, v] of Object.entries(raw)) {
      ticks.set(parseInt(k, 10), new Set((v as unknown[]).map((d) => Math.trunc(Number(d)))));
    }
    return new ChallengeWeek(ticks, String(j.success ?? ""), String(j.improve ?? ""));
  }
}

export function loadWeek(userId: string, monday: Date): ChallengeWeek {
  const j = storage.getJson<Record<string, unknown>>(weekKey(userId, monday));
  if (!j) return ChallengeWeek.empty();
  try {
    return ChallengeWeek.fromJson(j);
  } catch {
    return ChallengeWeek.empty();
  }
}

export function saveWeek(userId: string, monday: Date, w: ChallengeWeek): void {
  storage.setJson(weekKey(userId, monday), w.toJson());
}

const planKey = (userId: string) => `guide_plan_${userId}`;

/** Plan field values by key (`gd_pl1T` … plus `date` and `ask`). */
export function loadPlan(userId: string): Record<string, string> {
  const j = storage.getJson<Record<string, unknown>>(planKey(userId));
  if (!j || typeof j !== "object") return {};
  return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v)]));
}

export function savePlan(userId: string, plan: Record<string, string>): void {
  storage.setJson(planKey(userId), plan);
}
