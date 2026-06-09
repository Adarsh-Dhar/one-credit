/**
 * Mock API for Cardlytics / Banyan offers
 * Simulates card-linked cashback offers
 */

interface CardlyticsOffer {
  offerId: string;
  merchantName: string;
  category: string;
  cashbackRate: number;
  minSpend?: number;
  maxCashback?: number;
  active: boolean;
  startDate: string;
  endDate: string;
  description: string;
  terms?: string[];
  cardNetworks?: string[];
  impressionCount?: number;
  clickCount?: number;
  redemptionCount?: number;
  syncCount?: number;
}

class CardlyticsStore {
  private offers: CardlyticsOffer[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    this.offers = [
      {
        offerId: 'CL-001',
        merchantName: 'Starbucks',
        category: 'dining',
        cashbackRate: 5,
        minSpend: 10,
        maxCashback: 25,
        active: true,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        description: '5% cashback on all Starbucks purchases',
        terms: ['Valid at participating locations', 'Excludes gift cards'],
        cardNetworks: ['VISA', 'MASTERCARD'],
        impressionCount: 15000,
        clickCount: 1200,
        redemptionCount: 450,
        syncCount: 0,
      },
      {
        offerId: 'CL-002',
        merchantName: 'Amazon',
        category: 'shopping',
        cashbackRate: 3,
        minSpend: 50,
        maxCashback: 100,
        active: true,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        description: '3% cashback on Amazon purchases',
        terms: ['Valid on Amazon.com', 'Excludes Amazon Fresh'],
        cardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
        impressionCount: 25000,
        clickCount: 3000,
        redemptionCount: 1200,
        syncCount: 0,
      },
      {
        offerId: 'CL-003',
        merchantName: 'Uber',
        category: 'travel',
        cashbackRate: 4,
        minSpend: 20,
        maxCashback: 50,
        active: true,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        description: '4% cashback on Uber rides',
        terms: ['Valid in US only', 'Excludes Uber Eats'],
        cardNetworks: ['VISA', 'MASTERCARD'],
        impressionCount: 18000,
        clickCount: 2100,
        redemptionCount: 890,
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

  listOffers(): CardlyticsOffer[] {
    return this.offers;
  }
}

export const cardlyticsStore = new CardlyticsStore();
