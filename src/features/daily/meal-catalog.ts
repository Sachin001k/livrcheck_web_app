// Port of lib/daily/meal_catalog.dart — foods for the meal picker, with typical
// home portions and approximate calories (ICMR-NIN / IFCT 2017 averages for
// common Indian recipes). DRAFT values — portions and oil vary between homes.
import { tr, type Lang } from "@/lib/i18n";

export type MealCategory = "breakfast" | "mains" | "snacks" | "drinksSweets";
export const mealCategories: MealCategory[] = ["breakfast", "mains", "snacks", "drinksSweets"];

/** Emoji and translation key for each group's heading. */
export const mealCategoryLabels: Record<MealCategory, { emoji: string; key: string }> = {
  breakfast: { emoji: "🌅", key: "ml_catBreakfast" },
  mains: { emoji: "🍛", key: "ml_catMains" },
  snacks: { emoji: "🥨", key: "ml_catSnacks" },
  drinksSweets: { emoji: "🥤", key: "ml_catDrinksSweets" },
};

/** Heading for the category, e.g. "🌅 Breakfast". */
export function mealCategoryLabel(category: MealCategory, lang: Lang): string {
  const l = mealCategoryLabels[category];
  return `${l.emoji} ${tr(lang, l.key)}`;
}

export interface MealFood {
  /** Saved in logs, so names can change without breaking old logs. */
  id: string;
  emoji: string;
  nameKey: string;
  portionKey: string;
  kcal: number;
  category: MealCategory;
  /** Counts as one serving of fruit or vegetables. */
  fruitVeg: boolean;
  /** Counts as one sweet / sugary item. */
  sweet: boolean;
}

function f(id: string, emoji: string, nameKey: string, portionKey: string, kcal: number, category: MealCategory,
  opts: { fruitVeg?: boolean; sweet?: boolean } = {}): MealFood {
  return { id, emoji, nameKey, portionKey, kcal, category, fruitVeg: !!opts.fruitVeg, sweet: !!opts.sweet };
}

export const foodName = (food: MealFood, lang: Lang) => tr(lang, food.nameKey);
export const foodPortion = (food: MealFood, lang: Lang) => tr(lang, food.portionKey);

/** True if query (lower case) is in the name in lang or in English. */
export function foodMatches(food: MealFood, query: string, lang: Lang): boolean {
  return query.length === 0 ||
    foodName(food, lang).toLowerCase().includes(query) ||
    foodName(food, "en").toLowerCase().includes(query);
}

export const mealFoods: MealFood[] = [
  // Breakfast
  f("poha", "🍚", "ml_poha", "ml_pPlate", 250, "breakfast"),
  f("upma", "🥣", "ml_upma", "ml_pPlate", 250, "breakfast"),
  f("idli", "⚪", "ml_idli", "ml_pPiece", 60, "breakfast"),
  f("dosa", "🫓", "ml_dosa", "ml_pDosa", 170, "breakfast"),
  f("paratha", "🫓", "ml_paratha", "ml_pPiece", 200, "breakfast"),
  f("aloo_paratha", "🥔", "ml_alooParatha", "ml_pPiece", 300, "breakfast"),
  f("bread", "🍞", "ml_bread", "ml_pSlice", 70, "breakfast"),
  f("oats", "🥣", "ml_oats", "ml_pBowl", 150, "breakfast"),
  f("egg", "🥚", "ml_egg", "ml_pEgg", 75, "breakfast"),
  f("omelette", "🍳", "ml_omelette", "ml_pTwoEggs", 190, "breakfast"),
  // Lunch & dinner
  f("roti", "🫓", "ml_roti", "ml_pRoti", 100, "mains"),
  f("rice", "🍚", "ml_rice", "ml_pKatori", 200, "mains"),
  f("dal", "🥣", "ml_dal", "ml_pKatori", 150, "mains"),
  f("rajma", "🫘", "ml_rajma", "ml_pKatori", 200, "mains"),
  f("sabzi", "🥬", "ml_sabzi", "ml_pKatori", 120, "mains", { fruitVeg: true }),
  f("paneer", "🧀", "ml_paneer", "ml_pKatori", 280, "mains"),
  f("chicken", "🍗", "ml_chicken", "ml_pKatori", 250, "mains"),
  f("fish", "🐟", "ml_fish", "ml_pKatori", 200, "mains"),
  f("curd", "🥛", "ml_curd", "ml_pKatori", 100, "mains"),
  f("salad", "🥗", "ml_salad", "ml_pBowl", 40, "mains", { fruitVeg: true }),
  f("khichdi", "🍲", "ml_khichdi", "ml_pBowl", 250, "mains"),
  f("biryani", "🍛", "ml_biryani", "ml_pPlate", 500, "mains"),
  f("thali", "🍱", "ml_thali", "ml_pThali", 700, "mains", { fruitVeg: true }),
  // Snacks & fruit
  f("fruit", "🍎", "ml_fruit", "ml_pMedium", 70, "snacks", { fruitVeg: true }),
  f("nuts", "🥜", "ml_nuts", "ml_pHandful", 180, "snacks"),
  f("sprouts", "🌱", "ml_sprouts", "ml_pBowl", 150, "snacks", { fruitVeg: true }),
  f("makhana", "🍿", "ml_makhana", "ml_pBowl", 100, "snacks"),
  f("samosa", "🥟", "ml_samosa", "ml_pPiece", 250, "snacks"),
  f("pakora", "🍤", "ml_pakora", "ml_pFourPieces", 200, "snacks"),
  f("biscuits", "🍪", "ml_biscuits", "ml_pFourBiscuits", 120, "snacks"),
  f("namkeen", "🥨", "ml_namkeen", "ml_pHandful", 160, "snacks"),
  // Drinks & sweets
  f("chai", "🍵", "ml_chai", "ml_pCup", 80, "drinksSweets", { sweet: true }),
  f("coffee_milk", "☕", "ml_coffeeMilk", "ml_pCup", 90, "drinksSweets", { sweet: true }),
  f("black_tea", "🫖", "ml_blackTea", "ml_pCup", 5, "drinksSweets"),
  f("cold_drink", "🥤", "ml_coldDrink", "ml_pGlass", 130, "drinksSweets", { sweet: true }),
  f("juice", "🧃", "ml_juice", "ml_pGlass", 100, "drinksSweets", { sweet: true }),
  f("lassi", "🥛", "ml_lassi", "ml_pGlass", 220, "drinksSweets", { sweet: true }),
  f("mithai", "🍬", "ml_mithai", "ml_pPiece", 150, "drinksSweets", { sweet: true }),
  f("ice_cream", "🍨", "ml_iceCream", "ml_pScoop", 140, "drinksSweets", { sweet: true }),
  f("chocolate", "🍫", "ml_chocolate", "ml_pSmallBar", 200, "drinksSweets", { sweet: true }),
];

export const mealFoodsById: Record<string, MealFood> = Object.fromEntries(mealFoods.map((x) => [x.id, x]));

/** Totals for picked foods ({food id: number of portions}). */
export function mealTotals(picked: Record<string, number>): { kcal: number; fruitVeg: number; sweets: number; items: number } {
  let kcal = 0, fruitVeg = 0, sweets = 0, items = 0;
  for (const [id, count] of Object.entries(picked)) {
    const food = mealFoodsById[id];
    if (!food || count <= 0) continue;
    kcal += food.kcal * count;
    items += count;
    if (food.fruitVeg) fruitVeg += count;
    if (food.sweet) sweets += count;
  }
  return { kcal, fruitVeg, sweets, items };
}
