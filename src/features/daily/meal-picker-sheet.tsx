"use client";
// Port of lib/daily/meal_picker_sheet.dart — pick foods eaten today to fill
// in calories (and fruit & veg / sweets).
import { useState } from "react";
import { BigButton, Button, CountUp, ProgressBar, Sheet, SurfaceCard, cx, haptic } from "@/components/ui";
import { useT } from "@/lib/i18n";
import {
  foodMatches, foodName, foodPortion, mealCategories, mealCategoryLabel, mealFoods, mealTotals, type MealFood,
} from "./meal-catalog";

const kHigh = "#c4513a";
const kLow = "#3e8e6b";
const tealDark = "#1f5e55";
const tealLight = "#5fa79a";

/**
 * The meal picker. `onDone` gets the picked foods ({id: portions}; empty when
 * the user cleared earlier picks). Closing without saving calls only `onClose`.
 */
export function MealPickerSheet({ open, initial, targetKcal, onClose, onDone }: {
  open: boolean;
  initial: Record<string, number>;
  targetKcal: number;
  onClose: () => void;
  onDone: (picked: Record<string, number>) => void;
}) {
  const { t } = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("ml_whatDidYouEat")} maxWidth={640}>
      {/* Remounted on each open so it starts from `initial`. */}
      {open && <MealPicker initial={initial} targetKcal={targetKcal} onDone={onDone} />}
    </Sheet>
  );
}

function MealPicker({ initial, targetKcal, onDone }: {
  initial: Record<string, number>; targetKcal: number; onDone: (picked: Record<string, number>) => void;
}) {
  const { t, tf, lang } = useT();
  const [picked, setPicked] = useState<Record<string, number>>({ ...initial });
  const [query, setQuery] = useState("");
  const totals = mealTotals(picked);
  const q = query.trim().toLowerCase();
  const shown = mealFoods.filter((f) => foodMatches(f, q, lang));
  const ratio = totals.kcal / targetKcal;
  const pickedAny = Object.keys(picked).length > 0;
  const hadInitial = Object.keys(initial).length > 0;

  const change = (food: MealFood, delta: number) => {
    haptic();
    setPicked((p) => {
      const next = (p[food.id] ?? 0) + delta;
      const copy = { ...p };
      if (next <= 0) delete copy[food.id];
      else copy[food.id] = Math.min(20, next);
      return copy;
    });
  };

  return (
    <div className="flex flex-col">
      {/* Running total, progress and search stay on top while the list scrolls. */}
      <div className="sticky top-0 z-10 -mx-5 bg-white px-5 pb-2">
        <div className="flex items-baseline justify-end">
          <span className="text-lg font-extrabold" style={{ color: ratio > 1.1 ? kHigh : tealDark }}>
            <CountUp value={totals.kcal} duration={400} /> {t("dl_unitKcal")}
          </span>
        </div>
        <ProgressBar
          className="mt-1"
          value={ratio}
          color={ratio > 1.1 ? kHigh : ratio >= 0.9 ? kLow : tealLight}
        />
        <div className="mt-1 flex gap-2 text-xs text-muted">
          <span className="min-w-0 flex-1 truncate">{tf("dl_goalCalories", { n: targetKcal })}</span>
          {totals.items > 0 && (
            <span>{tf(totals.items === 1 ? "ml_oneItem" : "ml_itemsCount", { n: totals.items })}</span>
          )}
        </div>
        <label className="relative mt-2.5 block">
          <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("ml_searchFoods")}
            aria-label={t("ml_searchFoods")}
            className="w-full rounded-[14px] border border-line bg-white py-2.5 pr-3 pl-10 text-base outline-none focus:border-teal-dark"
          />
        </label>
      </div>

      <div className="pb-2">
        {mealCategories.map((category) => {
          const foods = shown.filter((f) => f.category === category);
          if (foods.length === 0) return null;
          return (
            <section key={category}>
              <h3 className="px-1 pt-3 pb-2 text-[15px] font-bold">{mealCategoryLabel(category, lang)}</h3>
              <SurfaceCard className="p-0! overflow-hidden">
                {foods.map((food) => (
                  <FoodRow key={food.id} food={food} count={picked[food.id] ?? 0} onChange={(d) => change(food, d)} />
                ))}
              </SurfaceCard>
            </section>
          );
        })}
        {shown.length === 0 && <p className="p-8 text-center">{tf("ml_noFoodFound", { q: query })}</p>}
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-6 flex items-center gap-2 border-t border-line/60 bg-white px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
        {pickedAny && <Button variant="text" onClick={() => setPicked({})}>{t("ml_clear")}</Button>}
        {/* An empty selection can still be applied when foods were picked
            before, so the user can clear them all. */}
        <BigButton
          className="flex-1"
          disabled={!pickedAny && !hadInitial}
          onClick={() => onDone({ ...picked })}
        >
          {pickedAny ? tf("ml_useKcal", { n: totals.kcal }) : hadInitial ? t("save") : t("ml_pickAtLeastOne")}
        </BigButton>
      </div>
    </div>
  );
}

function FoodRow({ food, count, onChange }: { food: MealFood; count: number; onChange: (delta: number) => void }) {
  const { t, tf, lang } = useT();
  const picked = count > 0;
  const name = foodName(food, lang);
  return (
    <div className={cx("flex items-center gap-3 px-3 py-1 transition-colors duration-200", picked && "bg-mint/70")}>
      <span className="text-2xl" aria-hidden>{food.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{name}</div>
        <div className="text-xs text-muted">{foodPortion(food, lang)} · {food.kcal} {t("dl_unitKcal")}</div>
      </div>
      {picked ? (
        <button
          onClick={() => onChange(-1)}
          aria-label={tf("ml_less", { food: name })}
          title={tf("ml_less", { food: name })}
          className="flex size-11 items-center justify-center rounded-full text-2xl text-muted hover:bg-white animate-fade-up"
        >
          ⊖
        </button>
      ) : (
        <span className="w-11" />
      )}
      <span className="w-6 text-center text-base font-extrabold" aria-live="polite">{picked ? count : ""}</span>
      <button
        onClick={() => onChange(1)}
        aria-label={tf("ml_more", { food: name })}
        title={tf("ml_more", { food: name })}
        className="flex size-11 items-center justify-center rounded-full text-2xl font-bold text-teal-dark hover:bg-white"
      >
        ⊕
      </button>
    </div>
  );
}
