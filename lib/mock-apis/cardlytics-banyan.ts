import { EventEmitter } from 'events';

// TypeScript interfaces for Cardlytics + Banyan API
export interface CardlyticsOffer {
  offerId: string;
  merchantName: string;
  category: OfferCategory;
  cashbackRate: number; // e.g., 0.05 for 5%
  minSpend: number;
  maxCashback: number;
  startDate: string;
  endDate: string;
  active: boolean;
  cardNetworks: string[];
  description: string;
  terms: string[];
  impressionCount: number;
  clickCount: number;
  redemptionCount: number;
}

export interface BanyanSku {
  skuId: string;
  merchantName: string;
  category: string;
  typicalPrice: number;
  receiptDataFields: string[];
}

export type OfferCategory =
  | 'travel'
  | 'dining'
  | 'grocery'
  | 'shopping'
  | 'entertainment'
  | 'gas'
  | 'pharmacy'
  | 'subscription';

export interface CardlyticsApiResponse {
  success: boolean;
  data?: CardlyticsOffer[];
  offer?: CardlyticsOffer;
  enrichedReceipt?: any;
  error?: string;
}

// Merchant pool — covers every merchant on the /pay page
const MERCHANT_POOL: Omit<
  CardlyticsOffer,
  'offerId' | 'cashbackRate' | 'active' | 'impressionCount' | 'clickCount' | 'redemptionCount'
>[] = [
  // ── Travel ──────────────────────────────────────────────────────────────
  {
    merchantName: 'Qatar Airways',
    category: 'travel',
    minSpend: 300,
    maxCashback: 120,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'AMEX', 'MASTERCARD'],
    description: 'Earn cashback on Qatar Airways flights',
    terms: ['Valid on QatarAirways.com only', 'Excludes taxes and fees', 'Economy and Business eligible'],
  },
  {
    merchantName: 'Delta Air Lines',
    category: 'travel',
    minSpend: 100,
    maxCashback: 50,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'AMEX', 'MASTERCARD'],
    description: 'Earn cashback on Delta flights',
    terms: ['Valid on Delta.com only', 'Excludes Basic Economy', 'One per customer'],
  },
  {
    merchantName: 'British Airways',
    category: 'travel',
    minSpend: 200,
    maxCashback: 80,
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    cardNetworks: ['VISA', 'MASTERCARD'],
    description: 'Cashback on BA flights and holidays',
    terms: ['Valid on BA.com', 'Excludes codeshare flights', 'New bookings only'],
  },
  {
    merchantName: 'Marriott Hotels',
    category: 'travel',
    minSpend: 150,
    maxCashback: 75,
    startDate: '2024-01-15',
    endDate: '2024-12-15',
    cardNetworks: ['VISA', 'AMEX', 'MASTERCARD'],
    description: 'Earn on hotel stays',
    terms: ['Valid at participating properties', 'Excludes resort fees'],
  },
  {
    merchantName: 'Hilton Honors',
    category: 'travel',
    minSpend: 120,
    maxCashback: 60,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'AMEX', 'MASTERCARD'],
    description: 'Save on Hilton hotel bookings',
    terms: ['Valid on Hilton.com', 'Excludes resort fees', 'Per stay limit applies'],
  },
  {
    merchantName: 'Expedia',
    category: 'travel',
    minSpend: 100,
    maxCashback: 40,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD'],
    description: 'Cashback on Expedia bookings',
    terms: ['Valid on new bookings', 'Excludes package deals'],
  },
  {
    merchantName: 'Hertz Car Rental',
    category: 'travel',
    minSpend: 75,
    maxCashback: 30,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
    description: 'Earn on car rentals',
    terms: ['Valid on Hertz.com', 'Excludes luxury vehicles', 'Minimum 3-day rental'],
  },
  {
    merchantName: 'MSC Cruises',
    category: 'travel',
    minSpend: 500,
    maxCashback: 200,
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    cardNetworks: ['VISA', 'MASTERCARD'],
    description: 'Cashback on cruise bookings',
    terms: ['Minimum 7-night cruise', 'Valid on new bookings only'],
  },

  // ── Dining ──────────────────────────────────────────────────────────────
  {
    merchantName: 'Starbucks',
    category: 'dining',
    minSpend: 5,
    maxCashback: 2,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD'],
    description: 'Cashback on Starbucks purchases',
    terms: ['Valid in-store and app', 'Excludes gift cards'],
  },
  {
    merchantName: 'Uber Eats',
    category: 'dining',
    minSpend: 15,
    maxCashback: 6,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
    description: 'Cashback on Uber Eats food delivery',
    terms: ['Valid for new customers', 'First order only', 'Minimum $15 order'],
  },
  {
    merchantName: 'DoorDash',
    category: 'dining',
    minSpend: 15,
    maxCashback: 5,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Earn cashback on DoorDash deliveries',
    terms: ['Valid for new customers', 'Excludes DashPass orders'],
  },
  {
    merchantName: 'Nobu Restaurants',
    category: 'dining',
    minSpend: 100,
    maxCashback: 25,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'AMEX', 'MASTERCARD'],
    description: 'Cashback on fine dining at Nobu',
    terms: ['Valid at participating locations', 'Excludes alcohol'],
  },

  // ── Grocery ─────────────────────────────────────────────────────────────
  {
    merchantName: 'Whole Foods Market',
    category: 'grocery',
    minSpend: 25,
    maxCashback: 5,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'AMEX'],
    description: 'Grocery cashback',
    terms: ['Valid at all locations', 'Excludes alcohol'],
  },
  {
    merchantName: 'Walmart',
    category: 'grocery',
    minSpend: 30,
    maxCashback: 8,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Earn on Walmart grocery and general merchandise',
    terms: ['Valid in-store and online', 'Excludes third-party marketplace'],
  },
  {
    merchantName: 'Target',
    category: 'grocery',
    minSpend: 35,
    maxCashback: 10,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Target shopping rewards',
    terms: ['Valid in-store and online', 'Excludes Target+'],
  },

  // ── Shopping ────────────────────────────────────────────────────────────
  {
    merchantName: 'Best Buy',
    category: 'shopping',
    minSpend: 50,
    maxCashback: 15,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Electronics rewards',
    terms: ['Valid in-store and online', 'Excludes Apple products'],
  },
  {
    merchantName: 'Apple Store',
    category: 'shopping',
    minSpend: 100,
    maxCashback: 20,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'AMEX', 'MASTERCARD'],
    description: 'Cashback on Apple products',
    terms: ['Excludes iPhone', 'One per customer', 'Cannot combine with other offers'],
  },
  {
    merchantName: 'Sephora',
    category: 'shopping',
    minSpend: 30,
    maxCashback: 12,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'AMEX', 'MASTERCARD'],
    description: 'Cashback on beauty and skincare',
    terms: ['Valid online and in-store', 'Excludes gift cards'],
  },
  {
    merchantName: 'Ulta Beauty',
    category: 'shopping',
    minSpend: 25,
    maxCashback: 10,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Cosmetics and hair care rewards',
    terms: ['Valid online only', 'Excludes salon services'],
  },

  // ── Gas ─────────────────────────────────────────────────────────────────
  {
    merchantName: 'Shell',
    category: 'gas',
    minSpend: 20,
    maxCashback: 3,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD'],
    description: 'Gas station cashback',
    terms: ['Valid at all Shell stations', 'Excludes diesel'],
  },

  // ── Entertainment ───────────────────────────────────────────────────────
  {
    merchantName: 'AMC Theatres',
    category: 'entertainment',
    minSpend: 15,
    maxCashback: 5,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Movie theater rewards',
    terms: ['Valid on tickets and concessions', 'Excludes special events'],
  },

  // ── Subscription ────────────────────────────────────────────────────────
  {
    merchantName: 'Netflix',
    category: 'subscription',
    minSpend: 7,
    maxCashback: 3,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
    description: 'Cashback on Netflix subscriptions',
    terms: ['Valid for new subscribers', 'Monthly billing only'],
  },
  {
    merchantName: 'Spotify',
    category: 'subscription',
    minSpend: 10,
    maxCashback: 3,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD'],
    description: 'Earn on Spotify Premium subscriptions',
    terms: ['Valid for new premium subscribers', 'Monthly billing only'],
  },

  // ── Pharmacy ────────────────────────────────────────────────────────────
  {
    merchantName: 'CVS Pharmacy',
    category: 'pharmacy',
    minSpend: 20,
    maxCashback: 5,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
    description: 'Health and wellness cashback',
    terms: ['Excludes prescriptions', 'Valid in-store and online'],
  },
  {
    merchantName: 'Walgreens',
    category: 'pharmacy',
    minSpend: 15,
    maxCashback: 4,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Pharmacy and wellness rewards',
    terms: ['Excludes prescriptions', 'Valid in-store and online'],
  },
];

// Banyan SKU-level receipt data for enrichment — one entry per pay-page merchant
const BANYAN_SKUS: Map<string, BanyanSku> = new Map([
  // Travel
  ['qatar_airways_flight', {
    skuId: 'qatar_airways_flight',
    merchantName: 'Qatar Airways',
    category: 'travel',
    typicalPrice: 850.00,
    receiptDataFields: ['flight_number', 'origin', 'destination', 'cabin_class', 'fare_basis', 'total'],
  }],
  ['delta_flight', {
    skuId: 'delta_flight',
    merchantName: 'Delta Air Lines',
    category: 'travel',
    typicalPrice: 320.00,
    receiptDataFields: ['flight_number', 'origin', 'destination', 'cabin_class', 'fare_type', 'total'],
  }],
  ['british_airways_flight', {
    skuId: 'british_airways_flight',
    merchantName: 'British Airways',
    category: 'travel',
    typicalPrice: 700.00,
    receiptDataFields: ['flight_number', 'origin', 'destination', 'cabin_class', 'avios_earned', 'total'],
  }],
  ['marriott_hotel', {
    skuId: 'marriott_hotel',
    merchantName: 'Marriott Hotels',
    category: 'travel',
    typicalPrice: 220.00,
    receiptDataFields: ['property_name', 'check_in', 'check_out', 'room_type', 'nightly_rate', 'total'],
  }],
  ['hilton_hotel', {
    skuId: 'hilton_hotel',
    merchantName: 'Hilton Honors',
    category: 'travel',
    typicalPrice: 190.00,
    receiptDataFields: ['property_name', 'check_in', 'check_out', 'room_type', 'nightly_rate', 'total'],
  }],
  ['expedia_booking', {
    skuId: 'expedia_booking',
    merchantName: 'Expedia',
    category: 'travel',
    typicalPrice: 550.00,
    receiptDataFields: ['booking_type', 'destination', 'check_in', 'check_out', 'traveler_count', 'total'],
  }],
  ['hertz_rental', {
    skuId: 'hertz_rental',
    merchantName: 'Hertz Car Rental',
    category: 'travel',
    typicalPrice: 95.00,
    receiptDataFields: ['vehicle_class', 'pickup_location', 'return_location', 'rental_days', 'daily_rate', 'total'],
  }],
  // Dining
  ['starbucks_beverage', {
    skuId: 'starbucks_beverage',
    merchantName: 'Starbucks',
    category: 'dining',
    typicalPrice: 6.50,
    receiptDataFields: ['drink_type', 'size', 'customizations', 'price'],
  }],
  ['uber_eats_order', {
    skuId: 'uber_eats_order',
    merchantName: 'Uber Eats',
    category: 'dining',
    typicalPrice: 32.00,
    receiptDataFields: ['restaurant_name', 'items', 'delivery_fee', 'tip', 'total'],
  }],
  ['doordash_order', {
    skuId: 'doordash_order',
    merchantName: 'DoorDash',
    category: 'dining',
    typicalPrice: 28.00,
    receiptDataFields: ['restaurant_name', 'items', 'delivery_fee', 'service_fee', 'total'],
  }],
  ['nobu_dining', {
    skuId: 'nobu_dining',
    merchantName: 'Nobu Restaurants',
    category: 'dining',
    typicalPrice: 175.00,
    receiptDataFields: ['location', 'covers', 'food_subtotal', 'beverage_subtotal', 'gratuity', 'total'],
  }],
  // Grocery
  ['whole_foods_grocery', {
    skuId: 'whole_foods_grocery',
    merchantName: 'Whole Foods Market',
    category: 'grocery',
    typicalPrice: 45.00,
    receiptDataFields: ['item_name', 'quantity', 'unit_price', 'total_price', 'organic_flag'],
  }],
  ['walmart_grocery', {
    skuId: 'walmart_grocery',
    merchantName: 'Walmart',
    category: 'grocery',
    typicalPrice: 68.00,
    receiptDataFields: ['department', 'item_name', 'quantity', 'unit_price', 'rollback_flag', 'total'],
  }],
  ['target_general', {
    skuId: 'target_general',
    merchantName: 'Target',
    category: 'shopping',
    typicalPrice: 55.00,
    receiptDataFields: ['department', 'item_category', 'price', 'discount_applied'],
  }],
  // Shopping
  ['best_buy_electronics', {
    skuId: 'best_buy_electronics',
    merchantName: 'Best Buy',
    category: 'shopping',
    typicalPrice: 249.00,
    receiptDataFields: ['product_name', 'sku', 'category', 'price', 'geek_squad_added', 'total'],
  }],
  ['apple_store_purchase', {
    skuId: 'apple_store_purchase',
    merchantName: 'Apple Store',
    category: 'shopping',
    typicalPrice: 399.00,
    receiptDataFields: ['product_name', 'model', 'color', 'storage', 'applecare_added', 'price'],
  }],
  ['sephora_beauty', {
    skuId: 'sephora_beauty',
    merchantName: 'Sephora',
    category: 'shopping',
    typicalPrice: 72.00,
    receiptDataFields: ['brand', 'product_name', 'shade', 'size', 'beauty_insider_points', 'total'],
  }],
  ['ulta_beauty', {
    skuId: 'ulta_beauty',
    merchantName: 'Ulta Beauty',
    category: 'shopping',
    typicalPrice: 55.00,
    receiptDataFields: ['brand', 'product_name', 'category', 'ultamate_rewards_points', 'price'],
  }],
  // Gas
  ['shell_fuel', {
    skuId: 'shell_fuel',
    merchantName: 'Shell',
    category: 'gas',
    typicalPrice: 45.00,
    receiptDataFields: ['fuel_type', 'gallons', 'price_per_gallon', 'total'],
  }],
  // Entertainment
  ['amc_ticket', {
    skuId: 'amc_ticket',
    merchantName: 'AMC Theatres',
    category: 'entertainment',
    typicalPrice: 18.00,
    receiptDataFields: ['movie_title', 'showtime', 'ticket_type', 'price'],
  }],
  // Subscription
  ['netflix_subscription', {
    skuId: 'netflix_subscription',
    merchantName: 'Netflix',
    category: 'subscription',
    typicalPrice: 15.49,
    receiptDataFields: ['plan_type', 'billing_period', 'amount'],
  }],
  ['spotify_subscription', {
    skuId: 'spotify_subscription',
    merchantName: 'Spotify',
    category: 'subscription',
    typicalPrice: 10.99,
    receiptDataFields: ['plan_type', 'billing_period', 'amount'],
  }],
  // Pharmacy
  ['cvs_purchase', {
    skuId: 'cvs_purchase',
    merchantName: 'CVS Pharmacy',
    category: 'pharmacy',
    typicalPrice: 34.00,
    receiptDataFields: ['item_name', 'rxNumber', 'quantity', 'otc_flag', 'extracare_savings', 'total'],
  }],
  ['walgreens_purchase', {
    skuId: 'walgreens_purchase',
    merchantName: 'Walgreens',
    category: 'pharmacy',
    typicalPrice: 28.00,
    receiptDataFields: ['item_name', 'rxNumber', 'quantity', 'otc_flag', 'mywalgreens_savings', 'total'],
  }],
]);

class CardlyticsStore extends EventEmitter {
  private offers: Map<string, CardlyticsOffer> = new Map();
  private syncCount: number = 0;

  constructor() {
    super();
    this._seedInitialOffers();
  }

  private _seedInitialOffers(): void {
    let idCounter = 1;
    MERCHANT_POOL.forEach(template => {
      const offer: CardlyticsOffer = {
        ...template,
        offerId: `cardlytics_${idCounter++}`,
        cashbackRate: 0.03 + Math.random() * 0.05, // 3–8% initial
        active: true,
        impressionCount: Math.floor(Math.random() * 10000),
        clickCount: Math.floor(Math.random() * 500),
        redemptionCount: Math.floor(Math.random() * 100),
      };
      this.offers.set(offer.offerId, offer);
    });
  }

  sync(): void {
    this.syncCount++;

    // Drift cashback rates by ±0.5 percentage points
    this.offers.forEach(offer => {
      const drift = (Math.random() - 0.5) * 0.01; // ±0.5%
      offer.cashbackRate = Math.max(0.01, Math.min(0.15, offer.cashbackRate + drift));

      // Flip ~10% of offers inactive
      if (Math.random() < 0.1) {
        offer.active = !offer.active;
      }

      // Grow analytics counters
      offer.impressionCount += Math.floor(Math.random() * 100);
      offer.clickCount += Math.floor(Math.random() * 10);
      offer.redemptionCount += Math.floor(Math.random() * 3);
    });

    // Probabilistically add new offers
    if (Math.random() < 0.2 && this.offers.size < 40) {
      const template = MERCHANT_POOL[Math.floor(Math.random() * MERCHANT_POOL.length)];
      const newOffer: CardlyticsOffer = {
        ...template,
        offerId: `cardlytics_${Date.now()}`,
        cashbackRate: 0.03 + Math.random() * 0.05,
        active: true,
        impressionCount: 0,
        clickCount: 0,
        redemptionCount: 0,
      };
      this.offers.set(newOffer.offerId, newOffer);
    }

    this.emit('sync', this.syncCount);
  }

  getOffer(offerId: string): CardlyticsOffer | undefined {
    return this.offers.get(offerId);
  }

  listOffers(filters?: {
    category?: OfferCategory;
    activeOnly?: boolean;
    cardNetwork?: string;
  }): CardlyticsOffer[] {
    let offers = Array.from(this.offers.values());

    if (filters?.category) {
      offers = offers.filter(o => o.category === filters.category);
    }
    if (filters?.activeOnly) {
      offers = offers.filter(o => o.active);
    }
    if (filters?.cardNetwork) {
      const network = filters.cardNetwork;
      offers = offers.filter(o => o.cardNetworks.includes(network));
    }

    return offers;
  }

  getSyncCount(): number {
    return this.syncCount;
  }
}

// Singleton instance
export const cardlyticsStore = new CardlyticsStore();

// HTTP-style request handler
export function handleCardlyticsRequest(
  method: string,
  path: string,
  body?: any,
): CardlyticsApiResponse {
  try {
    if (method === 'GET' && path === '/v2/offers') {
      const params =
        (body as { category?: OfferCategory; activeOnly?: string; cardNetwork?: string }) || {};
      return {
        success: true,
        data: cardlyticsStore.listOffers({
          category: params.category,
          activeOnly: params.activeOnly === 'true',
          cardNetwork: params.cardNetwork,
        }),
      };
    }

    if (method === 'GET' && path.startsWith('/v2/offers/')) {
      const offerId = path.split('/').pop();
      const offer = cardlyticsStore.getOffer(offerId!);
      if (!offer) {
        return { success: false, error: 'Offer not found' };
      }
      return { success: true, offer };
    }

    if (method === 'POST' && path === '/v2/offers') {
      cardlyticsStore.sync();
      return {
        success: true,
        data: cardlyticsStore.listOffers(),
      };
    }

    if (method === 'POST' && path === '/v1/receipts') {
      // Banyan enrichment endpoint
      const { merchantName } = body;
      const skuKey = Array.from(BANYAN_SKUS.keys()).find(
        key => BANYAN_SKUS.get(key)!.merchantName === merchantName,
      );
      if (skuKey) {
        return {
          success: true,
          enrichedReceipt: {
            ...BANYAN_SKUS.get(skuKey),
            enrichedAt: new Date().toISOString(),
          },
        };
      }
      return { success: false, error: 'Merchant SKU not found' };
    }

    return { success: false, error: 'Invalid endpoint' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
