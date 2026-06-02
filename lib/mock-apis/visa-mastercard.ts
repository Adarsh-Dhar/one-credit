import { EventEmitter } from 'events';

// TypeScript interfaces for Visa VMORC + Mastercard Merchant Offers
export interface NetworkOffer {
  offerId: string;
  network: CardNetwork;
  merchantName: string;
  discountRate: number; // e.g., 0.10 for 10% off
  discountType: OfferType;
  minSpend: number;
  maxDiscount: number;
  eligibleTiers: string[];
  geoTargets: GeoTarget[];
  channels: string[];
  active: boolean;
  startDate: string;
  endDate: string;
  impressionCount: number;
  activationCount: number;
  redemptionCount: number;
  description: string;
  terms: string[];
}

export interface GeoTarget {
  country: string;
  regions?: string[];
}

export interface NetworkApiResponse {
  success: boolean;
  data?: NetworkOffer[];
  offer?: NetworkOffer;
  syncResults?: { network: string; count: number }[];
  error?: string;
}

export type CardNetwork = 'VISA' | 'MASTERCARD';
export type OfferType = 'percentage_off' | 'fixed_amount' | 'points_multiplier' | 'cashback';

// Merchant templates for both networks
const MERCHANT_TEMPLATES: Omit<NetworkOffer, 'offerId' | 'network' | 'discountRate' | 'active' | 'impressionCount' | 'activationCount' | 'redemptionCount'>[] = [
  {
    merchantName: 'Hilton Honors',
    discountType: 'percentage_off',
    minSpend: 200,
    maxDiscount: 100,
    eligibleTiers: ['Gold', 'Diamond'],
    geoTargets: [{ country: 'US' }, { country: 'GB' }],
    channels: ['online', 'in-app'],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    description: 'Save on Hilton hotel bookings',
    terms: ['Valid on Hilton.com', 'Excludes resort fees', 'Per stay limit applies']
  },
  {
    merchantName: 'British Airways',
    discountType: 'percentage_off',
    minSpend: 500,
    maxDiscount: 150,
    eligibleTiers: ['Executive Club', 'Silver', 'Gold'],
    geoTargets: [{ country: 'GB' }, { country: 'US' }],
    channels: ['online'],
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    description: 'Discount on BA flights',
    terms: ['Valid on BA.com', 'Excludes codeshare flights', 'Economy class only']
  },
  {
    merchantName: 'Ritz-Carlton',
    discountType: 'fixed_amount',
    minSpend: 400,
    maxDiscount: 75,
    eligibleTiers: ['Platinum', 'Titan'],
    geoTargets: [{ country: 'US' }, { country: 'JP' }, { country: 'AE' }],
    channels: ['online', 'in-app', 'in-store'],
    startDate: '2024-01-15',
    endDate: '2024-12-15',
    description: 'Fixed discount on luxury stays',
    terms: ['Valid at participating properties', 'Blackout dates apply']
  },
  {
    merchantName: 'Priority Pass',
    discountType: 'percentage_off',
    minSpend: 50,
    maxDiscount: 15,
    eligibleTiers: ['Standard', 'Prestige', 'Select'],
    geoTargets: [{ country: 'US' }, { country: 'CA' }, { country: 'GB' }],
    channels: ['online'],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    description: 'Save on lounge access',
    terms: ['Valid on new memberships', 'Renewal discount applies']
  },
  {
    merchantName: 'Nobu Restaurants',
    discountType: 'cashback',
    minSpend: 100,
    maxDiscount: 25,
    eligibleTiers: ['Gold', 'Platinum'],
    geoTargets: [{ country: 'US' }, { country: 'GB' }, { country: 'JP' }],
    channels: ['in-store'],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    description: 'Cashback on dining',
    terms: ['Valid at participating locations', 'Excludes alcohol']
  },
  {
    merchantName: 'Apple Store',
    discountType: 'percentage_off',
    minSpend: 100,
    maxDiscount: 20,
    eligibleTiers: ['All'],
    geoTargets: [{ country: 'US' }, { country: 'GB' }, { country: 'CA' }],
    channels: ['online', 'in-store'],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    description: 'Discount on Apple products',
    terms: ['Excludes iPhone', 'One per customer', 'Cannot combine with other offers']
  },
  {
    merchantName: 'Hertz Car Rental',
    discountType: 'percentage_off',
    minSpend: 75,
    maxDiscount: 30,
    eligibleTiers: ['Gold Plus', 'Five Star', 'President\'s Circle'],
    geoTargets: [{ country: 'US' }, { country: 'CA' }, { country: 'DE' }],
    channels: ['online', 'in-app'],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    description: 'Save on car rentals',
    terms: ['Valid on Hertz.com', 'Excludes luxury vehicles', 'Minimum 3-day rental']
  },
  {
    merchantName: 'Michelin Guide Restaurants',
    discountType: 'points_multiplier',
    minSpend: 150,
    maxDiscount: 50,
    eligibleTiers: ['Platinum', 'Diamond'],
    geoTargets: [{ country: 'US' }, { country: 'FR' }, { country: 'JP' }],
    channels: ['in-store'],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    description: 'Points multiplier on fine dining',
    terms: ['Valid at Michelin-starred restaurants', 'Reservation required']
  }
];

class NetworkOfferStore extends EventEmitter {
  private visaOffers: Map<string, NetworkOffer> = new Map();
  private mastercardOffers: Map<string, NetworkOffer> = new Map();
  private syncCount: number = 0;

  constructor() {
    super();
    this._seed();
  }

  private _seed(): void {
    let visaId = 1;
    let mcId = 1;

    MERCHANT_TEMPLATES.forEach(template => {
      // Create Visa offer
      const visaOffer: NetworkOffer = {
        ...template,
        offerId: `visa_${visaId++}`,
        network: 'VISA',
        discountRate: 0.05 + Math.random() * 0.10, // 5-15%
        active: true,
        impressionCount: Math.floor(Math.random() * 15000),
        activationCount: Math.floor(Math.random() * 800),
        redemptionCount: Math.floor(Math.random() * 150)
      };
      this.visaOffers.set(visaOffer.offerId, visaOffer);

      // Create Mastercard offer
      const mcOffer: NetworkOffer = {
        ...template,
        offerId: `mc_${mcId++}`,
        network: 'MASTERCARD',
        discountRate: 0.05 + Math.random() * 0.10,
        active: true,
        impressionCount: Math.floor(Math.random() * 15000),
        activationCount: Math.floor(Math.random() * 800),
        redemptionCount: Math.floor(Math.random() * 150)
      };
      this.mastercardOffers.set(mcOffer.offerId, mcOffer);
    });
  }

  private _driftStore(store: Map<string, NetworkOffer>): void {
    store.forEach(offer => {
      // Drift discount rates by ±0.5 percentage points
      const drift = (Math.random() - 0.5) * 0.01;
      offer.discountRate = Math.max(0.02, Math.min(0.20, offer.discountRate + drift));
      
      // Flip ~5% of offers inactive
      if (Math.random() < 0.05) {
        offer.active = !offer.active;
      }
      
      // Grow analytics counters
      offer.impressionCount += Math.floor(Math.random() * 150);
      offer.activationCount += Math.floor(Math.random() * 15);
      offer.redemptionCount += Math.floor(Math.random() * 5);
    });
  }

  sync(network?: CardNetwork): NetworkApiResponse[] {
    this.syncCount++;
    const results: NetworkApiResponse[] = [];

    if (!network || network === 'VISA') {
      this._driftStore(this.visaOffers);
      results.push({
        success: true,
        syncResults: [{ network: 'VISA', count: this.visaOffers.size }]
      } as NetworkApiResponse);
    }

    if (!network || network === 'MASTERCARD') {
      this._driftStore(this.mastercardOffers);
      results.push({
        success: true,
        syncResults: [{ network: 'MASTERCARD', count: this.mastercardOffers.size }]
      } as NetworkApiResponse);
    }

    this.emit('sync', this.syncCount);
    return results;
  }

  getOffer(offerId: string): NetworkOffer | undefined {
    const visaOffer = this.visaOffers.get(offerId);
    if (visaOffer) return visaOffer;
    return this.mastercardOffers.get(offerId);
  }

  listOffers(
    network?: CardNetwork,
    filters?: {
      country?: string;
      activeOnly?: boolean;
    }
  ): NetworkOffer[] {
    let offers: NetworkOffer[] = [];

    if (!network || network === 'VISA') {
      offers = offers.concat(Array.from(this.visaOffers.values()));
    }
    if (!network || network === 'MASTERCARD') {
      offers = offers.concat(Array.from(this.mastercardOffers.values()));
    }

    if (filters?.country) {
      offers = offers.filter(o => 
        o.geoTargets.some(g => g.country === filters.country)
      );
    }
    if (filters?.activeOnly) {
      offers = offers.filter(o => o.active);
    }

    return offers;
  }

  getSyncCount(): number {
    return this.syncCount;
  }
}

// Singleton instance
export const networkOfferStore = new NetworkOfferStore();

// HTTP-style request handler
export function handleNetworkOfferRequest(
  method: string,
  path: string,
  query?: any
): NetworkApiResponse {
  try {
    if (method === 'POST' && path === '/v2/sync') {
      const network = query?.network as CardNetwork | undefined;
      const results = networkOfferStore.sync(network);
      return {
        success: true,
        data: networkOfferStore.listOffers(network, { activeOnly: true }),
        syncResults: results.flatMap(r => r.syncResults || [])
      };
    }

    if (method === 'GET' && path === '/v2/offers') {
      const network = query?.network as CardNetwork | undefined;
      const country = query?.country as string | undefined;
      const activeOnly = query?.activeOnly === 'true';
      
      return {
        success: true,
        data: networkOfferStore.listOffers(network, { country, activeOnly })
      };
    }

    if (method === 'GET' && path.startsWith('/v2/offers/')) {
      const offerId = path.split('/').pop();
      const offer = networkOfferStore.getOffer(offerId!);
      if (!offer) {
        return { success: false, error: 'Offer not found' };
      }
      return { success: true, offer };
    }

    return { success: false, error: 'Invalid endpoint' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
