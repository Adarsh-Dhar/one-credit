import { MULTIPLIER_DEFAULTS } from './constants';

export const CARD_TYPE_COLORS: Record<string, string> = {
  travel: 'from-blue-500 to-cyan-600',
  dining: 'from-orange-500 to-amber-600',
  fuel: 'from-green-500 to-emerald-600',
  shopping: 'from-violet-500 to-purple-700',
  crypto: 'from-yellow-400 to-amber-600',
  general: 'from-cyan-500 to-blue-600',
  business: 'from-slate-600 to-slate-800',
  student: 'from-pink-500 to-rose-700',
  cashback: 'from-teal-500 to-green-600',
};

interface CategoryMatcher {
  patterns: string[];
  targetField: keyof {
    flights: number;
    hotel: number;
    dining: number;
    electronics: number;
    groceries: number;
    fuel: number;
    shopping: number;
  };
}

const CATEGORY_MATCHERS: CategoryMatcher[] = [
  { patterns: ['travel', 'flight'], targetField: 'flights' },
  { patterns: ['hotel', 'lodging'], targetField: 'hotel' },
  { patterns: ['dining', 'restaurant'], targetField: 'dining' },
  { patterns: ['electronics', 'tech'], targetField: 'electronics' },
  { patterns: ['grocer', 'supermarket'], targetField: 'groceries' },
  { patterns: ['gas', 'fuel', 'station'], targetField: 'fuel' },
  { patterns: ['shop', 'online', 'retail'], targetField: 'shopping' },
];

function applyCategoryMultiplier(
  category: string,
  multiplier: number,
  earnRates: {
    flights: number;
    hotel: number;
    dining: number;
    electronics: number;
    groceries: number;
    fuel: number;
    shopping: number;
  }
): void {
  const lowerCategory = category.toLowerCase();
  for (const matcher of CATEGORY_MATCHERS) {
    if (matcher.patterns.some(pattern => lowerCategory.includes(pattern))) {
      earnRates[matcher.targetField] = multiplier;
      break;
    }
  }
}

export function buildEarnRates(
  fixedCategories: Array<{ category: string; multiplier: number }>,
  baseMultiplier: number
): {
  flights: number;
  hotel: number;
  dining: number;
  electronics: number;
  groceries: number;
  fuel: number;
  shopping: number;
  pharmacy: number;
  streaming: number;
  crypto: number;
  general: number;
} {
  const earnRates = {
    flights: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    hotel: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    dining: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    electronics: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    groceries: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    fuel: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    shopping: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    pharmacy: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    streaming: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    crypto: MULTIPLIER_DEFAULTS.BASE_MULTIPLIER,
    general: baseMultiplier,
  };

  const categories = getFixedCategoriesOrDefault(fixedCategories);
  if (categories.length === 0) {
    return earnRates;
  }

  for (const cat of categories) {
    applyCategoryMultiplier(cat.category, cat.multiplier, earnRates);
  }

  return earnRates;
}

function getFixedCategoriesOrDefault(
  categories: Array<{ category: string; multiplier: number }> | undefined
): Array<{ category: string; multiplier: number }> {
  return categories || [];
}
