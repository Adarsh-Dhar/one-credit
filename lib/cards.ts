// lib/cards.ts

export type CardKey =
  | 'skyward'
  | 'goldFork'
  | 'clearCash'
  | 'apexTravel'
  | 'neoPoints'
  | 'urbanDine'
  | 'fuelMax'
  | 'shopElite'
  | 'globePass'
  | 'cryptoEdge';

export interface CardDefinition {
  key: CardKey;
  name: string;
  issuer: string;
  type: 'travel' | 'dining' | 'cashback' | 'fuel' | 'shopping' | 'crypto' | 'general';
  color: string;          // gradient CSS string
  currency: string;       // what it earns — "miles", "points", "cash", etc.
  defaultBalance: number; // starting balance for demo users
  opRate: number;         // how many OP per 1 unit of currency
  // Earn rates per category (OP per $1 spent)
  earnRates: {
    flights: number;
    hotel: number;
    dining: number;
    electronics: number;
    groceries: number;
    fuel: number;
    shopping: number;
    crypto: number;
    general: number;
  };
  annualFee: number;
  perks: string[];
}

export const CARDS: CardDefinition[] = [
  {
    key: 'skyward',
    name: 'Skyward Elite',
    issuer: 'SkyBank',
    type: 'travel',
    color: 'from-blue-600 to-indigo-800',
    currency: 'miles',
    defaultBalance: 60000,
    opRate: 1.5,
    earnRates: { flights: 5.0, hotel: 3.0, dining: 2.0, electronics: 1.0, groceries: 1.0, fuel: 1.0, shopping: 1.0, crypto: 0.5, general: 1.0 },
    annualFee: 550,
    perks: ['Airport lounge access', '2x miles on all travel', 'No foreign transaction fees'],
  },
  {
    key: 'goldFork',
    name: 'GoldFork Dining',
    issuer: 'Culinary Credit',
    type: 'dining',
    color: 'from-yellow-500 to-orange-600',
    currency: 'points',
    defaultBalance: 30000,
    opRate: 1.5,
    earnRates: { flights: 1.0, hotel: 1.5, dining: 4.0, electronics: 1.125, groceries: 2.0, fuel: 1.0, shopping: 1.5, crypto: 0.5, general: 1.125 },
    annualFee: 95,
    perks: ['4x on dining worldwide', '2x on groceries', 'Monthly dining credits'],
  },
  {
    key: 'clearCash',
    name: 'ClearCash',
    issuer: 'ClearBank',
    type: 'cashback',
    color: 'from-emerald-500 to-teal-700',
    currency: 'cash',
    defaultBalance: 150,
    opRate: 100,
    earnRates: { flights: 2.0, hotel: 2.0, dining: 2.0, electronics: 3.0, groceries: 2.0, fuel: 3.0, shopping: 2.0, crypto: 1.0, general: 2.0 },
    annualFee: 0,
    perks: ['3% on electronics & fuel', '2% on everything else', 'No annual fee'],
  },
  {
    key: 'apexTravel',
    name: 'Apex World Travel',
    issuer: 'Apex Financial',
    type: 'travel',
    color: 'from-purple-600 to-pink-600',
    currency: 'points',
    defaultBalance: 80000,
    opRate: 1.2,
    earnRates: { flights: 4.0, hotel: 4.0, dining: 2.0, electronics: 1.0, groceries: 1.0, fuel: 1.0, shopping: 1.0, crypto: 0.5, general: 1.0 },
    annualFee: 695,
    perks: ['4x on flights & hotels', 'Global Entry credit', '$300 annual travel credit'],
  },
  {
    key: 'neoPoints',
    name: 'Neo Rewards',
    issuer: 'NeoBank',
    type: 'general',
    color: 'from-cyan-500 to-blue-600',
    currency: 'points',
    defaultBalance: 45000,
    opRate: 2.0,
    earnRates: { flights: 2.0, hotel: 2.0, dining: 2.0, electronics: 2.0, groceries: 2.0, fuel: 2.0, shopping: 2.0, crypto: 2.0, general: 2.0 },
    annualFee: 195,
    perks: ['Flat 2x on everything', 'Points never expire', 'Transfer to 15+ partners'],
  },
  {
    key: 'urbanDine',
    name: 'Urban Dine & Shop',
    issuer: 'Metro Credit Union',
    type: 'dining',
    color: 'from-rose-500 to-red-700',
    currency: 'points',
    defaultBalance: 20000,
    opRate: 1.8,
    earnRates: { flights: 1.0, hotel: 1.0, dining: 5.0, electronics: 1.5, groceries: 3.0, fuel: 1.0, shopping: 3.0, crypto: 0.5, general: 1.0 },
    annualFee: 0,
    perks: ['5x on dining', '3x on groceries & shopping', 'No annual fee'],
  },
  {
    key: 'fuelMax',
    name: 'FuelMax Commuter',
    issuer: 'Drive Financial',
    type: 'fuel',
    color: 'from-orange-500 to-red-600',
    currency: 'points',
    defaultBalance: 12000,
    opRate: 2.5,
    earnRates: { flights: 1.0, hotel: 1.0, dining: 1.5, electronics: 1.0, groceries: 2.0, fuel: 5.0, shopping: 1.0, crypto: 0.5, general: 1.0 },
    annualFee: 49,
    perks: ['5x at gas stations', '2x on groceries', 'Roadside assistance included'],
  },
  {
    key: 'shopElite',
    name: 'ShopElite Rewards',
    issuer: 'Retail Bank Corp',
    type: 'shopping',
    color: 'from-violet-500 to-purple-700',
    currency: 'points',
    defaultBalance: 35000,
    opRate: 1.6,
    earnRates: { flights: 1.0, hotel: 1.0, dining: 2.0, electronics: 4.0, groceries: 2.0, fuel: 1.0, shopping: 5.0, crypto: 0.5, general: 1.5 },
    annualFee: 99,
    perks: ['5x on online shopping', '4x on electronics', 'Price protection on purchases'],
  },
  {
    key: 'globePass',
    name: 'GlobePass International',
    issuer: 'WorldTrust Bank',
    type: 'travel',
    color: 'from-teal-500 to-green-700',
    currency: 'miles',
    defaultBalance: 55000,
    opRate: 1.4,
    earnRates: { flights: 3.0, hotel: 3.0, dining: 2.0, electronics: 1.0, groceries: 1.0, fuel: 1.0, shopping: 1.5, crypto: 0.5, general: 1.0 },
    annualFee: 250,
    perks: ['No foreign transaction fees', '3x on international travel', 'Travel insurance included'],
  },
  {
    key: 'cryptoEdge',
    name: 'CryptoEdge Card',
    issuer: 'BlockFi Credit',
    type: 'crypto',
    color: 'from-yellow-400 to-amber-600',
    currency: 'points',
    defaultBalance: 8000,
    opRate: 3.0,
    earnRates: { flights: 1.5, hotel: 1.5, dining: 1.5, electronics: 2.0, groceries: 1.5, fuel: 1.5, shopping: 2.0, crypto: 6.0, general: 1.5 },
    annualFee: 0,
    perks: ['6x on crypto purchases', '2x on tech & shopping', 'No annual fee'],
  },
];

// Helper: get a card by key
export const getCard = (key: CardKey) => CARDS.find((c) => c.key === key)!;

// Helper: compute totalOp from a balances object
export const computeTotalOp = (balances: Record<string, number>): number =>
  CARDS.reduce((sum, card) => sum + (balances[card.key] ?? 0) * card.opRate, 0);
