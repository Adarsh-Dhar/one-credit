/**
 * Mock API for Visa / Mastercard network offers
 * Simulates card network discount offers
 */

interface GeoTarget {
  country: string;
}

interface EligibleTier {
  tier: string;
  minSpend?: number;
}

interface NetworkOffer {
  offerId: string;
  merchantName: string;
  discountType: string;
  discountRate: number;
  minSpend?: number;
  maxDiscount?: number;
  active: boolean;
  startDate: string;
  endDate: string;
  description: string;
  terms?: string[];
  network: string;
  eligibleTiers?: EligibleTier[];
  geoTargets?: GeoTarget[];
  channels?: string[];
  impressionCount?: number;
  activationCount?: number;
  redemptionCount?: number;
  syncCount?: number;
}

class NetworkOfferStore {
  private offers: NetworkOffer[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    this.offers = [
      {
        offerId: 'NM-001',
        merchantName: 'Hilton Hotels',
        discountType: 'percentage',
        discountRate: 10,
        minSpend: 200,
        maxDiscount: 100,
        active: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: '10% off Hilton hotel bookings',
        terms: ['Valid for new bookings only', 'Cannot combine with other offers'],
        network: 'VISA',
        eligibleTiers: [{ tier: 'Signature' }, { tier: 'Infinite' }],
        geoTargets: [{ country: 'US' }],
        channels: ['online', 'mobile'],
        impressionCount: 8000,
        activationCount: 450,
        redemptionCount: 180,
        syncCount: 0,
      },
      {
        offerId: 'NM-002',
        merchantName: 'Delta Airlines',
        discountType: 'percentage',
        discountRate: 5,
        minSpend: 300,
        maxDiscount: 75,
        active: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: '5% off Delta flights',
        terms: ['Valid for domestic flights', 'Excludes Basic Economy'],
        network: 'MASTERCARD',
        eligibleTiers: [{ tier: 'World' }, { tier: 'World Elite' }],
        geoTargets: [{ country: 'US' }, { country: 'CA' }],
        channels: ['online'],
        impressionCount: 12000,
        activationCount: 680,
        redemptionCount: 320,
        syncCount: 0,
      },
      {
        offerId: 'NM-003',
        merchantName: 'Hertz Car Rental',
        discountType: 'fixed',
        discountRate: 15,
        minSpend: 100,
        maxDiscount: 30,
        active: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: '$15 off Hertz car rentals',
        terms: ['Valid for rentals of 3+ days', 'Excludes luxury vehicles'],
        network: 'VISA',
        eligibleTiers: [{ tier: 'Platinum' }, { tier: 'Signature' }],
        geoTargets: [{ country: 'US' }],
        channels: ['online', 'in-store'],
        impressionCount: 6000,
        activationCount: 320,
        redemptionCount: 140,
        syncCount: 0,
      },
    ];
  }

  sync(): void {
    // Simulate syncing with external API
    this.offers.forEach(offer => {
      offer.syncCount = (offer.syncCount || 0) + 1;
    });
  }

  listOffers(): NetworkOffer[] {
    return this.offers;
  }
}

export const networkOfferStore = new NetworkOfferStore();
