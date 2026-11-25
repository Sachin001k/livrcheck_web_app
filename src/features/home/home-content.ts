// Port of lib/data/home_content.dart — Home page content: food cards,
// health suggestions and FAQs. Generated from the Dart file; keep in sync.
//
// DUMMY DATA — placeholder text to shape the UI. Replace it with content
// reviewed by a doctor or dietitian before release.
//
// Every text field holds a TRANSLATION KEY (prefix `hm_`), not the text
// itself; show it with t(key). Numbers with units (e.g. '3 g') are plain
// data and shown as they are.

export interface Nutrient {
  /** Translation key of the nutrient's name. */
  nameKey: string;
  /** Amount shown as-is (e.g. '3 g'); null when the amount is words. */
  amount: string | null;
  /** Translation key for an amount in words (e.g. "High"). */
  amountKey: string | null;
}

/** Food detail age groups (distinct from the Guide's AgeGroup). */
export type FoodAgeGroup = "children" | "adults" | "elders";

export interface IntakeGuide {
  group: FoodAgeGroup;
  agesKey: string;
  amountKey: string;
  noteKey?: string;
}

/** One benefit or risk: an emoji, what it affects, and why (both keys). */
export interface HealthPoint {
  emoji: string;
  titleKey: string;
  bodyKey: string;
}

/** Everything shown in a food's pop-up. */
export interface FoodDetail {
  /** Key of the portion the calories and nutrients refer to. */
  servingKey: string;
  kcal: number;
  nutrients: Nutrient[];
  /** Safe daily amount for children, adults and elders. */
  intake: IntakeGuide[];
  /** Positives. Hidden when empty. */
  benefits?: HealthPoint[];
  /** Negatives: which organs too much of it can affect. */
  overconsumption: HealthPoint[];
  /** Healthier alternatives, mainly for "limit" foods. Hidden when empty. */
  swaps?: HealthPoint[];
  precautionKeys: string[];
}

export interface FoodTip {
  emoji: string;
  nameKey: string;
  whyKey: string;
  /** True for "eat more", false for "limit". */
  recommended: boolean;
  /** Full information shown when the card is tapped. */
  detail?: FoodDetail;
}

export interface HealthTip {
  emoji: string;
  titleKey: string;
  bodyKey: string;
}

export interface Faq {
  questionKey: string;
  answerKey: string;
}

const nut = (nameKey: string, amount: string): Nutrient => ({ nameKey, amount, amountKey: null });
const nutWords = (nameKey: string, amountKey: string): Nutrient => ({ nameKey, amount: null, amountKey });
const hp = (emoji: string, titleKey: string, bodyKey: string): HealthPoint => ({ emoji, titleKey, bodyKey });

export const foodTips: FoodTip[] = [
  {
    emoji: '🥬',
    nameKey: 'hm_greensName',
    whyKey: 'hm_greensWhy',
    recommended: true,
    detail: {
      servingKey: 'hm_greensServing',
      kcal: 23,
      nutrients: [
        // Boiled spinach, per 100 g (USDA FoodData Central).
        nut('hm_nutProtein', '3 g'),
        nut('hm_nutFibre', '2.4 g'),
        nut('hm_nutIron', '3.6 mg'),
        nut('hm_nutFolate', '146 µg'),
        nut('hm_nutVitaminK', '494 µg'),
        nut('hm_nutVitaminC', '10 mg'),
      ],
      intake: [
        {
          group: "children",
          agesKey: 'hm_ages1to9',
          amountKey: 'hm_greensKidsAmt',
          noteKey: 'hm_greensKidsNote',
        },
        {
          group: "adults",
          agesKey: 'hm_ages18to59',
          amountKey: 'hm_greensAdultAmt',
          noteKey: 'hm_greensAdultNote',
        },
        {
          group: "elders",
          agesKey: 'hm_ages60plus',
          amountKey: 'hm_greensAdultAmt',
          noteKey: 'hm_greensElderNote',
        },
      ],
      benefits: [
        hp('🍃', 'hm_ptLiver', 'hm_greensBen1'),
        hp('❤️', 'hm_ptHeartDisease', 'hm_greensBen2'),
        hp('🩸', 'hm_ptAnaemia', 'hm_greensBen3'),
        hp('🦴', 'hm_ptWeakBones', 'hm_greensBen4'),
        hp('👁️', 'hm_ptEyeProblems', 'hm_greensBen5'),
        hp('🍬', 'hm_ptDiabetes2', 'hm_greensBen6'),
      ],
      overconsumption: [
        hp('🫘', 'hm_ptKidneys', 'hm_greensRisk1'),
        hp('🩸', 'hm_ptBloodClotting', 'hm_greensRisk2'),
        hp('🤢', 'hm_ptDigestion', 'hm_greensRisk3'),
      ],
      precautionKeys: [
        'hm_greensPrec1',
        'hm_greensPrec2',
        'hm_greensPrec3',
        'hm_greensPrec4',
        'hm_greensPrec5',
        'hm_greensPrec6',
      ],
    },
  },
  {
    emoji: '🌾',
    nameKey: 'hm_milletName',
    whyKey: 'hm_milletWhy',
    recommended: true,
    detail: {
      servingKey: 'hm_milletServing',
      kcal: 96,
      nutrients: [
        // Ragi flour, scaled from per-100 g values (IFCT 2017).
        nut('hm_nutCarbs', '20 g'),
        nut('hm_nutFibre', '3.4 g'),
        nut('hm_nutProtein', '2.2 g'),
        nut('hm_nutCalcium', '109 mg'),
        nut('hm_nutIron', '1.4 mg'),
        nut('hm_nutMagnesium', '44 mg'),
      ],
      intake: [
        {
          group: "children",
          agesKey: 'hm_ages1to9',
          amountKey: 'hm_milletKidsAmt',
          noteKey: 'hm_milletKidsNote',
        },
        {
          group: "adults",
          agesKey: 'hm_ages18to59',
          amountKey: 'hm_milletAdultAmt',
          noteKey: 'hm_milletAdultNote',
        },
        {
          group: "elders",
          agesKey: 'hm_ages60plus',
          amountKey: 'hm_milletElderAmt',
          noteKey: 'hm_milletElderNote',
        },
      ],
      benefits: [
        hp('🍃', 'hm_ptLiver', 'hm_milletBen1'),
        hp('🍬', 'hm_ptDiabetes2', 'hm_milletBen2'),
        hp('❤️', 'hm_ptHeartDisease', 'hm_milletBen3'),
        hp('🦴', 'hm_ptWeakBones', 'hm_milletBen4'),
        hp('🩸', 'hm_ptAnaemia', 'hm_milletBen5'),
        hp('🚽', 'hm_ptConstipation', 'hm_milletBen6'),
      ],
      overconsumption: [
        hp('🍬', 'hm_ptBloodSugar', 'hm_milletRisk1'),
        hp('🤢', 'hm_ptDigestion', 'hm_milletRisk2'),
        hp('🦋', 'hm_ptThyroid', 'hm_milletRisk3'),
        hp('🫘', 'hm_ptKidneys', 'hm_milletRisk4'),
      ],
      precautionKeys: [
        'hm_milletPrec1',
        'hm_milletPrec2',
        'hm_milletPrec3',
        'hm_milletPrec4',
        'hm_milletPrec5',
        'hm_milletPrec6',
      ],
    },
  },
  {
    emoji: '🫘',
    nameKey: 'hm_dalName',
    whyKey: 'hm_dalWhy',
    recommended: true,
    detail: {
      servingKey: 'hm_dalServing',
      kcal: 106,
      nutrients: [
        // Masoor dal, scaled from per-100 g raw values (IFCT 2017).
        nut('hm_nutProtein', '7 g'),
        nut('hm_nutFibre', '3.2 g'),
        nut('hm_nutIron', '2 mg'),
        nut('hm_nutFolate', '144 µg'),
        nut('hm_nutPotassium', '203 mg'),
        nut('hm_nutZinc', '1.4 mg'),
      ],
      intake: [
        {
          group: "children",
          agesKey: 'hm_ages1to9',
          amountKey: 'hm_dalKidsAmt',
          noteKey: 'hm_dalKidsNote',
        },
        {
          group: "adults",
          agesKey: 'hm_ages18to59',
          amountKey: 'hm_dalAdultAmt',
          noteKey: 'hm_dalAdultNote',
        },
        {
          group: "elders",
          agesKey: 'hm_ages60plus',
          amountKey: 'hm_dalElderAmt',
          noteKey: 'hm_dalElderNote',
        },
      ],
      benefits: [
        hp('🍃', 'hm_ptLiver', 'hm_dalBen1'),
        hp('❤️', 'hm_ptHeartDisease', 'hm_dalBen2'),
        hp('🍬', 'hm_ptDiabetes2', 'hm_dalBen3'),
        hp('💪', 'hm_ptMuscleLoss', 'hm_dalBen4'),
        hp('🩸', 'hm_ptAnaemia', 'hm_dalBen5'),
      ],
      overconsumption: [
        hp('🤢', 'hm_ptDigestion', 'hm_dalRisk1'),
        hp('🫘', 'hm_ptKidneys', 'hm_dalRisk2'),
        hp('⚖️', 'hm_ptWeight', 'hm_dalRisk3'),
      ],
      precautionKeys: [
        'hm_dalPrec1',
        'hm_dalPrec2',
        'hm_dalPrec3',
        'hm_dalPrec4',
        'hm_dalPrec5',
        'hm_dalPrec6',
      ],
    },
  },
  {
    emoji: '🥜',
    nameKey: 'hm_nutsName',
    whyKey: 'hm_nutsWhy',
    recommended: true,
    detail: {
      servingKey: 'hm_nutsServing',
      kcal: 181,
      nutrients: [
        // 20 g almonds + 10 g walnuts (USDA FoodData Central).
        nut('hm_nutHealthyFats', '16 g'),
        nut('hm_nutProtein', '5.7 g'),
        nut('hm_nutFibre', '3.2 g'),
        nut('hm_nutVitaminE', '5 mg'),
        nut('hm_nutMagnesium', '70 mg'),
        nut('hm_nutOmega3', '0.9 g'),
      ],
      intake: [
        {
          group: "children",
          agesKey: 'hm_ages1to9',
          amountKey: 'hm_nutsKidsAmt',
          noteKey: 'hm_nutsKidsNote',
        },
        {
          group: "adults",
          agesKey: 'hm_ages18to59',
          amountKey: 'hm_nutsAdultAmt',
        },
        {
          group: "elders",
          agesKey: 'hm_ages60plus',
          amountKey: 'hm_nutsElderAmt',
          noteKey: 'hm_nutsElderNote',
        },
      ],
      benefits: [
        hp('🍃', 'hm_ptLiver', 'hm_nutsBen1'),
        hp('❤️', 'hm_ptHeartDisease', 'hm_nutsBen2'),
        hp('🧠', 'hm_ptMemoryLoss', 'hm_nutsBen3'),
        hp('🍬', 'hm_ptDiabetes2', 'hm_nutsBen4'),
      ],
      overconsumption: [
        hp('⚖️', 'hm_ptWeight', 'hm_nutsRisk1'),
        hp('🤢', 'hm_ptDigestion', 'hm_nutsRisk2'),
        hp('🫘', 'hm_ptKidneys', 'hm_nutsRisk3'),
        hp('🤧', 'hm_ptAllergy', 'hm_nutsRisk4'),
      ],
      precautionKeys: [
        'hm_nutsPrec1',
        'hm_nutsPrec2',
        'hm_nutsPrec3',
        'hm_nutsPrec4',
        'hm_nutsPrec5',
        'hm_nutsPrec6',
      ],
    },
  },
  {
    emoji: '☕',
    nameKey: 'hm_coffeeName',
    whyKey: 'hm_coffeeWhy',
    recommended: true,
    detail: {
      servingKey: 'hm_coffeeServing',
      kcal: 2,
      nutrients: [
        nut('hm_nutCaffeine', '≈95 mg'),
        nut('hm_nutPotassium', '116 mg'),
        nut('hm_nutMagnesium', '7 mg'),
        nut('hm_nutSugar', '0 g'),
        nut('hm_nutFat', '0 g'),
        nutWords('hm_nutPolyphenols', 'hm_nutAmtHigh'),
      ],
      intake: [
        {
          group: "children",
          agesKey: 'hm_ages1to9',
          amountKey: 'hm_amtAvoid',
          noteKey: 'hm_coffeeKidsNote',
        },
        {
          group: "adults",
          agesKey: 'hm_ages18to59',
          amountKey: 'hm_coffeeAdultAmt',
          noteKey: 'hm_coffeeAdultNote',
        },
        {
          group: "elders",
          agesKey: 'hm_ages60plus',
          amountKey: 'hm_coffeeElderAmt',
          noteKey: 'hm_coffeeElderNote',
        },
      ],
      benefits: [
        hp('🍃', 'hm_ptLiverFibrosis', 'hm_coffeeBen1'),
        hp('🎗️', 'hm_ptLiverCancer', 'hm_coffeeBen2'),
        hp('🍬', 'hm_ptDiabetes2', 'hm_coffeeBen3'),
        hp('🧠', 'hm_ptParkinsons', 'hm_coffeeBen4'),
      ],
      overconsumption: [
        hp('😴', 'hm_ptSleepNerves', 'hm_coffeeRisk1'),
        hp('❤️', 'hm_ptHeart', 'hm_coffeeRisk2'),
        hp('🔥', 'hm_ptStomach', 'hm_coffeeRisk3'),
        hp('🦴', 'hm_ptBones', 'hm_coffeeRisk4'),
      ],
      precautionKeys: [
        'hm_coffeePrec1',
        'hm_coffeePrec2',
        'hm_coffeePrec3',
        'hm_coffeePrec4',
        'hm_coffeePrec5',
        'hm_coffeePrec6',
      ],
    },
  },
  {
    emoji: '🥤',
    nameKey: 'hm_drinksName',
    whyKey: 'hm_drinksWhy',
    recommended: false,
    detail: {
      servingKey: 'hm_drinksServing',
      kcal: 139,
      nutrients: [
        nutWords('hm_nutSugar', 'hm_nutAmtColaSugar'),
        nut('hm_nutCarbs', '35 g'),
        nut('hm_nutCaffeine', '≈34 mg'),
        nut('hm_nutFibre', '0 g'),
        nut('hm_nutProtein', '0 g'),
        nutWords('hm_nutVitamins', 'hm_nutAmtNone'),
      ],
      intake: [
        {
          group: "children",
          agesKey: 'hm_ages1to9',
          amountKey: 'hm_amtAvoid',
          noteKey: 'hm_drinksKidsNote',
        },
        {
          group: "adults",
          agesKey: 'hm_ages18to59',
          amountKey: 'hm_drinksAdultAmt',
          noteKey: 'hm_drinksAdultNote',
        },
        {
          group: "elders",
          agesKey: 'hm_ages60plus',
          amountKey: 'hm_amtAvoid',
          noteKey: 'hm_drinksElderNote',
        },
      ],
      benefits: [
        hp('🆘', 'hm_ptHypo', 'hm_drinksBen1'),
      ],
      overconsumption: [
        hp('🍃', 'hm_ptLiver', 'hm_drinksRisk1'),
        hp('🍬', 'hm_ptPancreasSugar', 'hm_drinksRisk2'),
        hp('❤️', 'hm_ptHeart', 'hm_drinksRisk3'),
        hp('🦷', 'hm_ptTeeth', 'hm_drinksRisk4'),
        hp('⚖️', 'hm_ptWeight', 'hm_drinksRisk5'),
      ],
      swaps: [
        hp('🍋', 'hm_drinksSwap1Title', 'hm_drinksSwap1Body'),
        hp('🥛', 'hm_drinksSwap2Title', 'hm_drinksSwap2Body'),
        hp('🥥', 'hm_drinksSwap3Title', 'hm_drinksSwap3Body'),
        hp('🍊', 'hm_drinksSwap4Title', 'hm_drinksSwap4Body'),
      ],
      precautionKeys: [
        'hm_drinksPrec1',
        'hm_drinksPrec2',
        'hm_drinksPrec3',
        'hm_drinksPrec4',
        'hm_drinksPrec5',
      ],
    },
  },
  {
    emoji: '🍟',
    nameKey: 'hm_friedName',
    whyKey: 'hm_friedWhy',
    recommended: false,
    detail: {
      servingKey: 'hm_friedServing',
      kcal: 240,
      nutrients: [
        // Approximate: varies a lot with size, filling and oil.
        nut('hm_nutFat', '≈14 g'),
        nut('hm_nutCarbs', '≈25 g'),
        nut('hm_nutProtein', '≈4 g'),
        nut('hm_nutFibre', '≈2 g'),
        nut('hm_nutSodium', '≈350 mg'),
        nutWords('hm_nutTransFat', 'hm_nutAmtHighIfReused'),
      ],
      intake: [
        {
          group: "children",
          agesKey: 'hm_ages1to9',
          amountKey: 'hm_friedKidsAmt',
          noteKey: 'hm_friedKidsNote',
        },
        {
          group: "adults",
          agesKey: 'hm_ages18to59',
          amountKey: 'hm_friedAdultAmt',
          noteKey: 'hm_friedAdultNote',
        },
        {
          group: "elders",
          agesKey: 'hm_ages60plus',
          amountKey: 'hm_friedElderAmt',
          noteKey: 'hm_friedElderNote',
        },
      ],
      overconsumption: [
        hp('🍃', 'hm_ptLiver', 'hm_friedRisk1'),
        hp('❤️', 'hm_ptHeart', 'hm_friedRisk2'),
        hp('🩺', 'hm_ptBloodPressure', 'hm_friedRisk3'),
        hp('🔥', 'hm_ptStomach', 'hm_friedRisk4'),
        hp('⚖️', 'hm_ptWeight', 'hm_friedRisk5'),
      ],
      swaps: [
        hp('🫘', 'hm_friedSwap1Title', 'hm_friedSwap1Body'),
        hp('🍿', 'hm_friedSwap2Title', 'hm_friedSwap2Body'),
        hp('🥗', 'hm_friedSwap3Title', 'hm_friedSwap3Body'),
        hp('🍥', 'hm_friedSwap4Title', 'hm_friedSwap4Body'),
      ],
      precautionKeys: [
        'hm_friedPrec1',
        'hm_friedPrec2',
        'hm_friedPrec3',
        'hm_friedPrec4',
        'hm_friedPrec5',
      ],
    },
  },
  {
    emoji: '🍞',
    nameKey: 'hm_maidaName',
    whyKey: 'hm_maidaWhy',
    recommended: false,
    detail: {
      servingKey: 'hm_maidaServing',
      kcal: 133,
      nutrients: [
        // White bread, per 50 g (USDA FoodData Central).
        nut('hm_nutCarbs', '25 g'),
        nut('hm_nutFibre', '1.4 g'),
        nut('hm_nutProtein', '4.4 g'),
        nut('hm_nutSugar', '2.5 g'),
        nut('hm_nutSodium', '245 mg'),
        nutWords('hm_nutGlycaemicIndex', 'hm_nutAmtHighGi'),
      ],
      intake: [
        {
          group: "children",
          agesKey: 'hm_ages1to9',
          amountKey: 'hm_amtOccasionally',
          noteKey: 'hm_maidaKidsNote',
        },
        {
          group: "adults",
          agesKey: 'hm_ages18to59',
          amountKey: 'hm_maidaAdultAmt',
          noteKey: 'hm_maidaAdultNote',
        },
        {
          group: "elders",
          agesKey: 'hm_ages60plus',
          amountKey: 'hm_amtOccasionally',
          noteKey: 'hm_maidaElderNote',
        },
      ],
      benefits: [
        hp('🤒', 'hm_ptUpsetStomach', 'hm_maidaBen1'),
      ],
      overconsumption: [
        hp('🍃', 'hm_ptLiver', 'hm_maidaRisk1'),
        hp('🍬', 'hm_ptBloodSugar', 'hm_maidaRisk2'),
        hp('🚽', 'hm_ptGut', 'hm_maidaRisk3'),
        hp('❤️', 'hm_ptHeart', 'hm_maidaRisk4'),
        hp('⚖️', 'hm_ptWeight', 'hm_maidaRisk5'),
      ],
      swaps: [
        hp('🫓', 'hm_maidaSwap1Title', 'hm_maidaSwap1Body'),
        hp('🍞', 'hm_maidaSwap2Title', 'hm_maidaSwap2Body'),
        hp('🌾', 'hm_maidaSwap3Title', 'hm_maidaSwap3Body'),
        hp('🥣', 'hm_maidaSwap4Title', 'hm_maidaSwap4Body'),
      ],
      precautionKeys: [
        'hm_maidaPrec1',
        'hm_maidaPrec2',
        'hm_maidaPrec3',
        'hm_maidaPrec4',
        'hm_maidaPrec5',
      ],
    },
  },
];

export const healthTips: HealthTip[] = [
  {emoji: '🚶', titleKey: 'hm_tip1Title', bodyKey: 'hm_tip1Body'},
  {emoji: '⚖️', titleKey: 'hm_tip2Title', bodyKey: 'hm_tip2Body'},
  {emoji: '😴', titleKey: 'hm_tip3Title', bodyKey: 'hm_tip3Body'},
  {emoji: '🩸', titleKey: 'hm_tip4Title', bodyKey: 'hm_tip4Body'},
  {emoji: '💊', titleKey: 'hm_tip5Title', bodyKey: 'hm_tip5Body'},
];

export const faqs: Faq[] = [
  {questionKey: 'hm_faq1Q', answerKey: 'hm_faq1A'},
  {questionKey: 'hm_faq2Q', answerKey: 'hm_faq2A'},
  {questionKey: 'hm_faq3Q', answerKey: 'hm_faq3A'},
  {questionKey: 'hm_faq4Q', answerKey: 'hm_faq4A'},
  {questionKey: 'hm_faq5Q', answerKey: 'hm_faq5A'},
  {questionKey: 'hm_faq6Q', answerKey: 'hm_faq6A'},
];

