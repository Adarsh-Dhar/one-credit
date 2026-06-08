/**
 * Mock API for Rakuten / Impact affiliate deals
 * Simulates affiliate marketing commission offers
 */

interface AffiliateDeal {
  dealId: string;
  merchantName: string;
  vertical: string;
  network: string;
  commissionType: string;
  commissionRate: number;
  tieredRates?: any[];
  trackingUrl?: string;
  promoCode?: string;
  cookieWindow?: number;
  minEpc?: number;
  active: boolean;
  startDate: string;
  endDate: string;
  description: string;
  terms?: string[];
  clickCount?: number;
  conversionCount?: number;
  revenue?: number;
  syncCount?: number;
}

class AffiliateStore {
  private rakutenDeals: AffiliateDeal[] = [];
  private impactDeals: AffiliateDeal[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    this.rakutenDeals = [
      {
        dealId: 'RK-001',
        merchantName: 'Nordstrom',
        vertical: 'shopping',
        network: 'rakuten',
        commissionType: 'percentage',
        commissionRate: 8,
        tieredRates: [
          { minSales: 0, rate: 8 },
          { minSales: 10000, rate: 10 },
          { minSales: 50000, rate: 12 },
        ],
        trackingUrl: 'https://rakuten.com/click/nordstrom',
        promoCode: 'NORD8',
        cookieWindow: 30,
        minEpc: 0.15,
        active: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: '8% commission on Nordstrom purchases',
        terms: ['Valid on full-price items', 'Excludes gift cards'],
        clickCount: 5000,
        conversionCount: 250,
        revenue: 12500,
        syncCount: 0,
      },
      {
        dealId: 'RK-002',
        merchantName: 'Best Buy',
        vertical: 'electronics',
        network: 'rakuten',
        commissionType: 'percentage',
        commissionRate: 2,
        trackingUrl: 'https://rakuten.com/click/bestbuy',
        cookieWindow: 7,
        minEpc: 0.08,
        active: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: '2% commission on Best Buy purchases',
        terms: ['Valid online only', 'Excludes Apple products'],
        clickCount: 8000,
        conversionCount: 400,
        revenue: 8000,
        syncCount: 0,
      },
    ];

    this.impactDeals = [
      {
        dealId: 'IM-001',
        merchantName: 'Apple',
        vertical: 'electronics',
        network: 'impact',
        commissionType: 'fixed',
        commissionRate: 25,
        trackingUrl: 'https://impact.com/click/apple',
        cookieWindow: 30,
        minEpc: 0.25,
        active: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: '$25 flat commission on Apple products',
        terms: ['Valid on new devices only', 'Minimum order value $500'],
        clickCount: 3000,
        conversionCount: 120,
        revenue: 3000,
        syncCount: 0,
      },
      {
        dealId: 'IM-002',
        merchantName: 'Nike',
        vertical: 'fashion',
        network: 'impact',
        commissionType: 'percentage',
        commissionRate: 6,
        tieredRates: [
          { minSales: 0, rate: 6 },
          { minSales: 20000, rate: 8 },
        ],
        trackingUrl: 'https://impact.com/click/nike',
        cookieWindow: 30,
        minEpc: 0.12,
        active: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: '6% commission on Nike purchases',
        terms: ['Valid on Nike.com', 'Excludes SNKRS launches'],
        clickCount: 7000,
        conversionCount: 350,
        revenue: 10500,
        syncCount: 0,
      },
    ];
  }

  sync(): { rakuten: AffiliateDeal[]; impact: AffiliateDeal[] } {
    // Simulate syncing with external API
    this.rakutenDeals.forEach(deal => {
      deal.syncCount = (deal.syncCount || 0) + 1;
    });
    this.impactDeals.forEach(deal => {
      deal.syncCount = (deal.syncCount || 0) + 1;
    });
    return {
      rakuten: this.rakutenDeals,
      impact: this.impactDeals,
    };
  }
}

export const affiliateStore = new AffiliateStore();
