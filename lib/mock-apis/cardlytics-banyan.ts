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

export type OfferCategory = 'travel' | 'dining' | 'grocery' | 'shopping' | 'entertainment' | 'gas';

export interface CardlyticsApiResponse {
  success: boolean;
  data?: CardlyticsOffer[];
  offer?: CardlyticsOffer;
  enrichedReceipt?: any;
  error?: string;
}

// Merchant pool with real-world data
const MERCHANT_POOL: Omit<CardlyticsOffer, 'offerId' | 'cashbackRate' | 'active' | 'impressionCount' | 'clickCount' | 'redemptionCount'>[] = [
  {
    merchantName: 'Delta Air Lines',
    category: 'travel',
    minSpend: 100,
    maxCashback: 50,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'AMEX', 'MASTERCARD'],
    description: 'Earn cashback on Delta flights',
    terms: ['Valid on Delta.com only', 'Excludes Basic Economy', 'One per customer']
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
    terms: ['Minimum 7-night cruise', 'Valid on new bookings only']
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
    terms: ['Valid at participating properties', 'Excludes resort fees']
  },
  {
    merchantName: 'Starbucks',
    category: 'dining',
    minSpend: 5,
    maxCashback: 2,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD'],
    description: 'Cashback on Starbucks purchases',
    terms: ['Valid in-store and app', 'Excludes gift cards']
  },
  {
    merchantName: 'Whole Foods Market',
    category: 'grocery',
    minSpend: 25,
    maxCashback: 5,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'AMEX'],
    description: 'Grocery cashback',
    terms: ['Valid at all locations', 'Excludes alcohol']
  },
  {
    merchantName: 'Target',
    category: 'shopping',
    minSpend: 35,
    maxCashback: 10,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Target shopping rewards',
    terms: ['Valid in-store and online', 'Excludes Target+']
  },
  {
    merchantName: 'Shell',
    category: 'gas',
    minSpend: 20,
    maxCashback: 3,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD'],
    description: 'Gas station cashback',
    terms: ['Valid at all Shell stations', 'Excludes diesel']
  },
  {
    merchantName: 'AMC Theatres',
    category: 'entertainment',
    minSpend: 15,
    maxCashback: 5,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Movie theater rewards',
    terms: ['Valid on tickets and concessions', 'Excludes special events']
  },
  {
    merchantName: 'Uber',
    category: 'dining',
    minSpend: 10,
    maxCashback: 4,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
    description: 'Uber Eats and rides',
    terms: ['Valid on Uber Eats and Uber rides', 'Excludes Uber for Business']
  },
  {
    merchantName: 'Best Buy',
    category: 'shopping',
    minSpend: 50,
    maxCashback: 15,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cardNetworks: ['VISA', 'MASTERCARD', 'DISCOVER'],
    description: 'Electronics rewards',
    terms: ['Valid in-store and online', 'Excludes Apple products']
  }
];

// Banyan SKU-level receipt data for enrichment
const BANYAN_SKUS: Map<string, BanyanSku> = new Map([
  ['whole_foods_grocery', {
    skuId: 'whole_foods_grocery',
    merchantName: 'Whole Foods Market',
    category: 'grocery',
    typicalPrice: 45.00,
    receiptDataFields: ['item_name', 'quantity', 'unit_price', 'total_price', 'organic_flag']
  }],
  ['starbucks_beverage', {
    skuId: 'starbucks_beverage',
    merchantName: 'Starbucks',
    category: 'dining',
    typicalPrice: 6.50,
    receiptDataFields: ['drink_type', 'size', 'customizations', 'price']
  }],
  ['target_general', {
    skuId: 'target_general',
    merchantName: 'Target',
    category: 'shopping',
    typicalPrice: 55.00,
    receiptDataFields: ['department', 'item_category', 'price', 'discount_applied']
  }],
  ['shell_fuel', {
    skuId: 'shell_fuel',
    merchantName: 'Shell',
    category: 'gas',
    typicalPrice: 45.00,
    receiptDataFields: ['fuel_type', 'gallons', 'price_per_gallon', 'total']
  }],
  ['amc_ticket', {
    skuId: 'amc_ticket',
    merchantName: 'AMC Theatres',
    category: 'entertainment',
    typicalPrice: 18.00,
    receiptDataFields: ['movie_title', 'showtime', 'ticket_type', 'price']
  }]
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
        cashbackRate: 0.03 + Math.random() * 0.05, // 3-8% initial
        active: true,
        impressionCount: Math.floor(Math.random() * 10000),
        clickCount: Math.floor(Math.random() * 500),
        redemptionCount: Math.floor(Math.random() * 100)
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
    if (Math.random() < 0.2 && this.offers.size < 20) {
      const template = MERCHANT_POOL[Math.floor(Math.random() * MERCHANT_POOL.length)];
      const newOffer: CardlyticsOffer = {
        ...template,
        offerId: `cardlytics_${Date.now()}`,
        cashbackRate: 0.03 + Math.random() * 0.05,
        active: true,
        impressionCount: 0,
        clickCount: 0,
        redemptionCount: 0
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
      offers = offers.filter(o => o.cardNetworks.includes(filters.cardNetwork));
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
  body?: any
): CardlyticsApiResponse {
  try {
    if (method === 'GET' && path === '/v2/offers') {
      const params = body as { category?: OfferCategory; activeOnly?: string; cardNetwork?: string };
      return {
        success: true,
        data: cardlyticsStore.listOffers({
          category: params.category,
          activeOnly: params.activeOnly === 'true',
          cardNetwork: params.cardNetwork
        })
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
        data: cardlyticsStore.listOffers()
      };
    }

    if (method === 'POST' && path === '/v1/receipts') {
      // Banyan enrichment endpoint
      const { merchantName } = body;
      const skuKey = Array.from(BANYAN_SKUS.keys()).find(
        key => BANYAN_SKUS.get(key)!.merchantName === merchantName
      );
      if (skuKey) {
        return {
          success: true,
          enrichedReceipt: {
            ...BANYAN_SKUS.get(skuKey),
            enrichedAt: new Date().toISOString()
          }
        };
      }
      return { success: false, error: 'Merchant SKU not found' };
    }

    return { success: false, error: 'Invalid endpoint' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
