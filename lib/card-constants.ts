// lib/card-constants.ts
//
// Shared card constants to avoid duplication across the codebase

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
  crypto: number;
  general: number;
} {
  const earnRates = {
    flights: 1.0,
    hotel: 1.0,
    dining: 1.0,
    electronics: 1.0,
    groceries: 1.0,
    fuel: 1.0,
    shopping: 1.0,
    pharmacy: 1.0,
    streaming: 1.0,
    crypto: 1.0,
    general: baseMultiplier,
  };

  if (!fixedCategories) {
    return earnRates;
  }

  for (const cat of fixedCategories) {
    const category = cat.category.toLowerCase();
    const multiplier = cat.multiplier;

    if (category.includes('travel') || category.includes('flight')) {
      earnRates.flights = multiplier;
    }
    if (category.includes('hotel') || category.includes('lodging')) {
      earnRates.hotel = multiplier;
    }
    if (category.includes('dining') || category.includes('restaurant')) {
      earnRates.dining = multiplier;
    }
    if (category.includes('electronics') || category.includes('tech')) {
      earnRates.electronics = multiplier;
    }
    if (category.includes('grocer') || category.includes('supermarket')) {
      earnRates.groceries = multiplier;
    }
    if (category.includes('gas') || category.includes('fuel') || category.includes('station')) {
      earnRates.fuel = multiplier;
    }
    if (category.includes('shop') || category.includes('online') || category.includes('retail')) {
      earnRates.shopping = multiplier;
    }
  }

  return earnRates;
}
