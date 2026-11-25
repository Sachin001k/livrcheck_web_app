// Port of the logic parts of test/guide_test.dart.
import { beforeEach, describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import { ageGroupFor } from "./age-group";
import { allGuideKeys, faqFor, findTopic, guideChapters, guideTopicHref, guideTips } from "./guide-content";
import { ChallengeWeek, loadPlan, loadWeek, savePlan, saveWeek, weekStart } from "./guide-store";

describe("guide content", () => {
  it("every guide text key has English text", () => {
    const missing = [...new Set(allGuideKeys())].filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it("has 6 chapters and 27 topics with unique ids", () => {
    expect(guideChapters).toHaveLength(6);
    const ids = guideChapters.flatMap((c) => c.topics.map((t) => t.id));
    expect(ids).toHaveLength(27);
    expect(new Set(ids).size).toBe(27);
  });

  it("links to topics and finds the FAQ", () => {
    expect(guideTopicHref("faq")).toBe("/guide/5/faq");
    expect(guideTopicHref("nope")).toBe("/guide");
    expect(findTopic("fib4")?.chapter.number).toBe(3);
    expect(faqFor("older").map((i) => i.titleKey)).toEqual(["gd_fqO1T", "gd_fqO2T", "gd_fqO3T"]);
    expect(guideTips).toHaveLength(11);
  });
});

describe("age groups", () => {
  it("map to the guidebook groups", () => {
    expect(ageGroupFor(10)).toBe("children");
    expect(ageGroupFor(17)).toBe("children");
    expect(ageGroupFor(18)).toBe("adults");
    expect(ageGroupFor(64)).toBe("adults");
    expect(ageGroupFor(65)).toBe("older");
    expect(ageGroupFor(null)).toBe("adults");
  });
});

describe("guide store", () => {
  beforeEach(() => {
    const mem = new Map<string, string>();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => void mem.set(k, v),
        removeItem: (k: string) => void mem.delete(k),
      },
    };
  });

  it("challenge week survives a save round trip", () => {
    const w = ChallengeWeek.empty();
    w.toggle(0, 2);
    w.toggle(3, 2);
    w.toggle(3, 6);
    w.success = "Walked daily";
    const back = ChallengeWeek.fromJson(JSON.parse(JSON.stringify(w.toJson())));
    expect(back.isTicked(0, 2)).toBe(true);
    expect(back.doneOn(2)).toBe(2);
    expect(back.total).toBe(3);
    expect(back.success).toBe("Walked daily");
    expect(weekStart(new Date(2026, 10, 19))).toEqual(new Date(2026, 10, 16));
    expect(weekStart(new Date(2026, 10, 22))).toEqual(new Date(2026, 10, 16)); // Sunday
  });

  it("saves the week and plan per user", () => {
    const monday = new Date(2026, 10, 16);
    const w = ChallengeWeek.empty();
    w.toggle(1, 0);
    saveWeek("u1", monday, w);
    expect(loadWeek("u1", monday).isTicked(1, 0)).toBe(true);
    expect(loadWeek("u2", monday).total).toBe(0);
    savePlan("u1", { gd_pl1T: "Walk more" });
    expect(loadPlan("u1")).toEqual({ gd_pl1T: "Walk more" });
  });
});
