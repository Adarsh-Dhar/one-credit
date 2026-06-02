import { EventEmitter } from 'events';

// TypeScript interfaces for Rakuten Advertising + Impact Radius
export interface AffiliateDeal {
  dealId: string;
  network: AffiliateNetwork;
  merchantName: string;
  vertical: DealVertical;
  commissionType: CommissionType;
  commissionRate: number; // e.g., 0.05 for 5%
  tieredRates?: TieredRate[];
  trackingUrl: string;
  promoCode?: string;
  cookieWindow: number; // days
  minEpc: number; // earnings per 100 clicks
  clickCount: number;
  conversionCount: number;
  revenue: number;
  active: boolean;
  startDate: string;
  endDate: string;
  description: string;
  terms: string[];
}

export interface TieredRate {
  minSales: number;
  maxSales?: number;
  rate: number;
}

export interface AffiliateApiResponse {
  success: boolean;
  rakuten?: AffiliateDeal[];
  impact?: AffiliateDeal[];
  deal?: AffiliateDeal;
  syncResults?: { network: string; count: number }[];
  error?: string;
}

export type AffiliateNetwork = 'rakuten' | 'impact';
export type CommissionType = 'pct_sale' | 'pct_sale_tiered' | 'fixed_amount' | 'cpa';
export type DealVertical = 'travel' | 'pharmacy' | 'dental' | 'retail' | 'electronics' | 'finance' | 'beauty' | 'food' | 'subscription';

// Merchant catalogue across 8 verticals
const MERCHANT_CATALOGUE: Array<{
  merchantName: string;
  vertical: DealVertical;
  networks: AffiliateNetwork[];
  commissionType: CommissionType;
  baseRate: number;
  tieredRates?: TieredRate[];
  cookieWindow: number;
  description: string;
  terms: string[];
}> = [
  {
    merchantName: 'Expedia',
    vertical: 'travel',
    networks: ['rakuten', 'impact'],
    commissionType: 'pct_sale',
    baseRate: 0.04,
    cookieWindow: 7,
    description: 'Book flights, hotels, and car rentals',
    terms: ['Valid on new bookings', 'Excludes package deals']
  },
  {
    merchantName: 'CVS Pharmacy',
    vertical: 'pharmacy',
    networks: ['rakuten', 'impact'],
    commissionType: 'pct_sale',
    baseRate: 0.03,
    cookieWindow: 30,
    description: 'Health and wellness products',
    terms: ['Excludes prescriptions', 'Valid online only']
  },
  {
    merchantName: '1-800-DENTIST',
    vertical: 'dental',
    networks: ['impact'],
    commissionType: 'cpa',
    baseRate: 25.00,
    cookieWindow: 45,
    description: 'Dental appointment bookings',
    terms: ['Valid for new patients', 'Qualified appointments only']
  },
  {
    merchantName: 'Walmart',
    vertical: 'retail',
    networks: ['rakuten', 'impact'],
    commissionType: 'pct_sale',
    baseRate: 0.02,
    cookieWindow: 7,
    description: 'Everyday low prices',
    terms: ['Excludes grocery', 'Valid online only']
  },
  {
    merchantName: 'Best Buy',
    vertical: 'electronics',
    networks: ['rakuten', 'impact'],
    commissionType: 'pct_sale',
    baseRate: 0.015,
    cookieWindow: 1,
    description: 'Electronics and appliances',
    terms: ['Excludes Apple products', 'Valid online only']
  },
  {
    merchantName: 'NordicTrack',
    vertical: 'electronics',
    networks: ['impact'],
    commissionType: 'pct_sale_tiered',
    baseRate: 0.05,
    tieredRates: [
      { minSales: 0, maxSales: 10000, rate: 0.05 },
      { minSales: 10001, maxSales: 50000, rate: 0.07 },
      { minSales: 50001, rate: 0.10 }
    ],
    cookieWindow: 30,
    description: 'Fitness equipment',
    terms: ['Valid on equipment only', 'Excludes accessories']
  },
  {
    merchantName: 'SoFi',
    vertical: 'finance',
    networks: ['impact'],
    commissionType: 'cpa',
    baseRate: 150.00,
    cookieWindow: 30,
    description: 'Personal loans and refinancing',
    terms: ['Valid for approved loans', 'Minimum loan amount $5,000']
  },
  {
    merchantName: 'Sephora',
    vertical: 'beauty',
    networks: ['rakuten', 'impact'],
    commissionType: 'pct_sale',
    baseRate: 0.04,
    cookieWindow: 14,
    description: 'Beauty and skincare products',
    terms: ['Valid online and in-store', 'Excludes gift cards']
  },
  {
    merchantName: 'Ulta Beauty',
    vertical: 'beauty',
    networks: ['rakuten'],
    commissionType: 'pct_sale',
    baseRate: 0.035,
    cookieWindow: 7,
    description: 'Cosmetics and hair care',
    terms: ['Valid online only', 'Excludes salon services']
  },
  {
    merchantName: 'DoorDash',
    vertical: 'food',
    networks: ['rakuten', 'impact'],
    commissionType: 'pct_sale',
    baseRate: 0.025,
    cookieWindow: 30,
    description: 'Food delivery',
    terms: ['Valid for new customers', 'First order only']
  },
  {
    merchantName: 'HelloFresh',
    vertical: 'food',
    networks: ['impact'],
    commissionType: 'cpa',
    baseRate: 20.00,
    cookieWindow: 45,
    description: 'Meal kit subscriptions',
    terms: ['Valid for new subscribers', 'First box only']
  },
  {
    merchantName: 'Netflix',
    vertical: 'subscription',
    networks: ['impact'],
    commissionType: 'cpa',
    baseRate: 15.00,
    cookieWindow: 30,
    description: 'Streaming service',
    terms: ['Valid for new subscribers', 'No free trial conversions']
  },
  {
    merchantName: 'Spotify',
    vertical: 'subscription',
    networks: ['rakuten'],
    commissionType: 'pct_sale',
    baseRate: 0.10,
    cookieWindow: 30,
    description: 'Music streaming',
    terms: ['Valid for premium subscriptions', 'New subscribers only']
  },
  {
    merchantName: 'Booking.com',
    vertical: 'travel',
    networks: ['rakuten'],
    commissionType: 'pct_sale',
    baseRate: 0.035,
    cookieWindow: 30,
    description: 'Hotel and accommodation bookings',
    terms: ['Valid on completed stays', 'Excludes cancellations']
  },
  {
    merchantName: 'Walgreens',
    vertical: 'pharmacy',
    networks: ['impact'],
    commissionType: 'pct_sale',
    baseRate: 0.025,
    cookieWindow: 14,
    description: 'Pharmacy and retail',
    terms: ['Excludes prescriptions', 'Valid online only']
  },
  {
    merchantName: 'Apple',
    vertical: 'electronics',
    networks: ['impact'],
    commissionType: 'pct_sale',
    baseRate: 0.01,
    cookieWindow: 1,
    description: 'Apple products and accessories',
    terms: ['Valid on select products', 'Excludes iPhone']
  }
];

class AffiliateStore extends EventEmitter {
  private rakutenDeals: Map<string, AffiliateDeal> = new Map();
  private impactDeals: Map<string, AffiliateDeal> = new Map();
  private syncCount: number = 0;

  constructor() {
    super();
    this._seed();
  }

  private _seed(): void {
    let rakutenId = 1;
    let impactId = 1;

    MERCHANT_CATALOGUE.forEach(merchant => {
      merchant.networks.forEach(network => {
        const dealId = network === 'rakuten' ? `rakuten_${rakutenId++}` : `impact_${impactId++}`;
        const deal: AffiliateDeal = {
          dealId,
          network,
          merchantName: merchant.merchantName,
          vertical: merchant.vertical,
          commissionType: merchant.commissionType,
          commissionRate: merchant.baseRate,
          tieredRates: merchant.tieredRates,
          trackingUrl: this._generateTrackingUrl(network, dealId, merchant.merchantName),
          promoCode: this._generatePromoCode(),
          cookieWindow: merchant.cookieWindow,
          minEpc: 1.0 + Math.random() * 5.0,
          clickCount: Math.floor(Math.random() * 5000),
          conversionCount: Math.floor(Math.random() * 200),
          revenue: Math.floor(Math.random() * 10000),
          active: true,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          description: merchant.description,
          terms: merchant.terms
        };

        if (network === 'rakuten') {
          this.rakutenDeals.set(dealId, deal);
        } else {
          this.impactDeals.set(dealId, deal);
        }
      });
    });
  }

  private _generateTrackingUrl(network: AffiliateNetwork, dealId: string, merchantName: string): string {
    const encodedMerchant = encodeURIComponent(merchantName.toLowerCase().replace(/\s+/g, '-'));
    if (network === 'rakuten') {
      return `https://click.linksynergy.com/fs-bin/click?id=${dealId}&offerid=123456&type=3&subid=0&tmpid=1234&RD_PN1=${encodedMerchant}`;
    } else {
      return `https://go2cloud.org/aff_c?offer_id=${dealId}&aff_id=12345&url=https://${encodedMerchant}.com`;
    }
  }

  private _generatePromoCode(): string | undefined {
    const codes = ['SAVE20', 'WELCOME10', 'FREESHIP', 'SPRING25', 'SUMMER15', 'FALL30'];
    return Math.random() < 0.4 ? codes[Math.floor(Math.random() * codes.length)] : undefined;
  }

  private _driftStore(store: Map<string, AffiliateDeal>): void {
    store.forEach(deal => {
      // Drift commission rates by ±0.5 percentage points
      const drift = (Math.random() - 0.5) * 0.01;
      deal.commissionRate = Math.max(0.005, Math.min(0.15, deal.commissionRate + drift));
      
      // Rotate promo codes
      if (Math.random() < 0.15) {
        deal.promoCode = this._generatePromoCode();
      }
      
      // Flip ~5% of deals inactive
      if (Math.random() < 0.05) {
        deal.active = !deal.active;
      }
      
      // Grow analytics counters
      deal.clickCount += Math.floor(Math.random() * 50);
      deal.conversionCount += Math.floor(Math.random() * 5);
      deal.revenue += Math.floor(Math.random() * 100);
      
      // Update EPC based on new data
      deal.minEpc = Math.max(0.5, deal.minEpc + (Math.random() - 0.5) * 0.5);
    });
  }

  sync(): AffiliateApiResponse {
    this.syncCount++;
    
    this._driftStore(this.rakutenDeals);
    this._driftStore(this.impactDeals);

    this.emit('sync', this.syncCount);

    return {
      success: true,
      rakuten: Array.from(this.rakutenDeals.values()),
      impact: Array.from(this.impactDeals.values()),
      syncResults: [
        { network: 'rakuten', count: this.rakutenDeals.size },
        { network: 'impact', count: this.impactDeals.size }
      ]
    };
  }

  getDeal(dealId: string): AffiliateDeal | undefined {
    const rakutenDeal = this.rakutenDeals.get(dealId);
    if (rakutenDeal) return rakutenDeal;
    return this.impactDeals.get(dealId);
  }

  listDeals(filters?: {
    network?: AffiliateNetwork;
    vertical?: DealVertical;
    activeOnly?: boolean;
    minEpc?: number;
  }): AffiliateDeal[] {
    let deals: AffiliateDeal[] = [];

    if (!filters?.network || filters.network === 'rakuten') {
      deals = deals.concat(Array.from(this.rakutenDeals.values()));
    }
    if (!filters?.network || filters.network === 'impact') {
      deals = deals.concat(Array.from(this.impactDeals.values()));
    }

    if (filters?.vertical) {
      deals = deals.filter(d => d.vertical === filters.vertical);
    }
    if (filters?.activeOnly) {
      deals = deals.filter(d => d.active);
    }
    if (filters?.minEpc !== undefined) {
      deals = deals.filter(d => d.minEpc >= filters.minEpc!);
    }

    return deals;
  }

  getSyncCount(): number {
    return this.syncCount;
  }
}

// Singleton instance
export const affiliateStore = new AffiliateStore();

// HTTP-style request handler
export function handleAffiliateRequest(
  method: string,
  path: string,
  query?: any
): AffiliateApiResponse {
  try {
    if (method === 'POST' && path === '/v2/sync') {
      const result = affiliateStore.sync();
      return result;
    }

    if (method === 'GET' && path === '/v2/publishers/offers') {
      const network = query?.network as AffiliateNetwork | undefined;
      const vertical = query?.vertical as DealVertical | undefined;
      const activeOnly = query?.activeOnly === 'true';
      const minEpc = query?.minEpc ? parseFloat(query.minEpc) : undefined;

      const deals = affiliateStore.listDeals({ network, vertical, activeOnly, minEpc });
      
      // Return in Rakuten shape
      return {
        success: true,
        rakuten: network === 'impact' ? [] : deals.filter(d => d.network === 'rakuten'),
        impact: network === 'rakuten' ? [] : deals.filter(d => d.network === 'impact')
      };
    }

    if (method === 'GET' && path === '/v1/campaigns') {
      // Impact shape
      const vertical = query?.vertical as DealVertical | undefined;
      const activeOnly = query?.activeOnly === 'true';
      const minEpc = query?.minEpc ? parseFloat(query.minEpc) : undefined;

      const deals = affiliateStore.listDeals({ network: 'impact', vertical, activeOnly, minEpc });
      
      return {
        success: true,
        impact: deals
      };
    }

    if (method === 'GET' && path.startsWith('/v2/publishers/offers/')) {
      const dealId = path.split('/').pop();
      const deal = affiliateStore.getDeal(dealId!);
      if (!deal) {
        return { success: false, error: 'Deal not found' };
      }
      return { success: true, deal };
    }

    return { success: false, error: 'Invalid endpoint' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
