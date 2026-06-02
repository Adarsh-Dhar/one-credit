import { cardlyticsStore, handleCardlyticsRequest } from '../cardlytics-banyan';
import { networkOfferStore, handleNetworkOfferRequest } from '../visa-mastercard';
import { affiliateStore, handleAffiliateRequest } from '../rakuten-impact';

describe('Cardlytics Store', () => {
  test('seeds initial offers on construction', () => {
    const offers = cardlyticsStore.listOffers();
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0]).toHaveProperty('offerId');
    expect(offers[0]).toHaveProperty('merchantName');
    expect(offers[0]).toHaveProperty('cashbackRate');
  });

  test('sync increments sync count', () => {
    const initialCount = cardlyticsStore.getSyncCount();
    cardlyticsStore.sync();
    expect(cardlyticsStore.getSyncCount()).toBe(initialCount + 1);
  });

  test('offers have required fields', () => {
    const offers = cardlyticsStore.listOffers();
    offers.forEach(offer => {
      expect(offer).toHaveProperty('offerId');
      expect(offer).toHaveProperty('merchantName');
      expect(offer).toHaveProperty('category');
      expect(offer).toHaveProperty('cashbackRate');
      expect(offer).toHaveProperty('minSpend');
      expect(offer).toHaveProperty('maxCashback');
      expect(offer).toHaveProperty('active');
      expect(offer).toHaveProperty('cardNetworks');
      expect(offer).toHaveProperty('description');
      expect(offer).toHaveProperty('terms');
    });
  });

  test('HTTP GET /v2/offers returns 200', () => {
    const response = handleCardlyticsRequest('GET', '/v2/offers');
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('HTTP GET /v2/offers/:id returns 404 for unknown offer', () => {
    const response = handleCardlyticsRequest('GET', '/v2/offers/unknown_id');
    expect(response.success).toBe(false);
    expect(response.error).toBe('Offer not found');
  });

  test('Banyan SKU enrichment returns SKU data', () => {
    const response = handleCardlyticsRequest('POST', '/v1/receipts', {
      merchantName: 'Whole Foods Market'
    });
    expect(response.success).toBe(true);
    expect(response.enrichedReceipt).toBeDefined();
    expect(response.enrichedReceipt).toHaveProperty('skuId');
    expect(response.enrichedReceipt).toHaveProperty('merchantName');
  });
});

describe('Visa/Mastercard Store', () => {
  test('seeds both networks on construction', () => {
    const visaOffers = networkOfferStore.listOffers('VISA');
    const mcOffers = networkOfferStore.listOffers('MASTERCARD');
    
    expect(visaOffers.length).toBeGreaterThan(0);
    expect(mcOffers.length).toBeGreaterThan(0);
  });

  test('sync updates impression counts', () => {
    const initialOffers = networkOfferStore.listOffers();
    const initialImpressions = initialOffers[0].impressionCount;
    
    networkOfferStore.sync();
    
    const updatedOffers = networkOfferStore.listOffers();
    const updatedImpressions = updatedOffers[0].impressionCount;
    
    expect(updatedImpressions).toBeGreaterThanOrEqual(initialImpressions);
  });

  test('offers have geo targets', () => {
    const offers = networkOfferStore.listOffers();
    offers.forEach(offer => {
      expect(offer).toHaveProperty('geoTargets');
      expect(Array.isArray(offer.geoTargets)).toBe(true);
      expect(offer.geoTargets[0]).toHaveProperty('country');
    });
  });

  test('HTTP GET /v2/offers returns offers', () => {
    const response = handleNetworkOfferRequest('GET', '/v2/offers');
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('HTTP POST /v2/sync triggers sync', () => {
    const initialCount = networkOfferStore.getSyncCount();
    const response = handleNetworkOfferRequest('POST', '/v2/sync');
    
    expect(response.success).toBe(true);
    expect(networkOfferStore.getSyncCount()).toBeGreaterThan(initialCount);
  });

  test('network filter works correctly', () => {
    const visaOffers = networkOfferStore.listOffers('VISA');
    const mcOffers = networkOfferStore.listOffers('MASTERCARD');
    
    visaOffers.forEach(offer => {
      expect(offer.network).toBe('VISA');
    });
    
    mcOffers.forEach(offer => {
      expect(offer.network).toBe('MASTERCARD');
    });
  });
});

describe('Rakuten/Impact Store', () => {
  test('seeds both networks on construction', () => {
    const rakutenDeals = affiliateStore.listDeals({ network: 'rakuten' });
    const impactDeals = affiliateStore.listDeals({ network: 'impact' });
    
    expect(rakutenDeals.length).toBeGreaterThan(0);
    expect(impactDeals.length).toBeGreaterThan(0);
  });

  test('promo codes rotate on sync', () => {
    const initialDeals = affiliateStore.listDeals();
    const initialPromoCodes = initialDeals.map(d => d.promoCode);
    
    affiliateStore.sync();
    
    const updatedDeals = affiliateStore.listDeals();
    const updatedPromoCodes = updatedDeals.map(d => d.promoCode);
    
    // At least some promo codes should have changed
    expect(initialPromoCodes).not.toEqual(updatedPromoCodes);
  });

  test('tracking URLs are correctly formatted', () => {
    const deals = affiliateStore.listDeals();
    deals.forEach(deal => {
      expect(deal).toHaveProperty('trackingUrl');
      expect(deal.trackingUrl).toContain('http');
      
      if (deal.network === 'rakuten') {
        expect(deal.trackingUrl).toContain('linksynergy.com');
      } else if (deal.network === 'impact') {
        expect(deal.trackingUrl).toContain('go2cloud.org');
      }
    });
  });

  test('tiered rates structure is valid for NordicTrack', () => {
    const deals = affiliateStore.listDeals({ network: 'impact' });
    const nordicTrack = deals.find(d => d.merchantName === 'NordicTrack');
    
    expect(nordicTrack).toBeDefined();
    expect(nordicTrack!.commissionType).toBe('pct_sale_tiered');
    expect(nordicTrack!.tieredRates).toBeDefined();
    expect(Array.isArray(nordicTrack!.tieredRates)).toBe(true);
    
    nordicTrack!.tieredRates!.forEach(tier => {
      expect(tier).toHaveProperty('minSales');
      expect(tier).toHaveProperty('rate');
    });
  });

  test('HTTP GET /v2/publishers/offers returns deals', () => {
    const response = handleAffiliateRequest('GET', '/v2/publishers/offers');
    expect(response.success).toBe(true);
    expect(response.rakuten).toBeDefined();
    expect(response.impact).toBeDefined();
  });

  test('HTTP POST /v2/sync triggers sync', () => {
    const initialCount = affiliateStore.getSyncCount();
    const response = handleAffiliateRequest('POST', '/v2/sync');
    
    expect(response.success).toBe(true);
    expect(affiliateStore.getSyncCount()).toBeGreaterThan(initialCount);
  });

  test('vertical filter works correctly', () => {
    const travelDeals = affiliateStore.listDeals({ vertical: 'travel' });
    travelDeals.forEach(deal => {
      expect(deal.vertical).toBe('travel');
    });
  });
});

describe('Drift Validation', () => {
  test('Cardlytics cashback rates drift between syncs', () => {
    const initialOffers = cardlyticsStore.listOffers();
    const initialRates = initialOffers.map(o => o.cashbackRate);
    
    cardlyticsStore.sync();
    
    const updatedOffers = cardlyticsStore.listOffers();
    const updatedRates = updatedOffers.map(o => o.cashbackRate);
    
    // Rates should have changed (at least some of them)
    expect(initialRates).not.toEqual(updatedRates);
  });

  test('Network discount rates drift between syncs', () => {
    const initialOffers = networkOfferStore.listOffers();
    const initialRates = initialOffers.map(o => o.discountRate);
    
    networkOfferStore.sync();
    
    const updatedOffers = networkOfferStore.listOffers();
    const updatedRates = updatedOffers.map(o => o.discountRate);
    
    // Rates should have changed (at least some of them)
    expect(initialRates).not.toEqual(updatedRates);
  });

  test('Affiliate EPC values drift between syncs', () => {
    const initialDeals = affiliateStore.listDeals();
    const initialEpc = initialDeals.map(d => d.minEpc);
    
    affiliateStore.sync();
    
    const updatedDeals = affiliateStore.listDeals();
    const updatedEpc = updatedDeals.map(d => d.minEpc);
    
    // EPC values should have changed (at least some of them)
    expect(initialEpc).not.toEqual(updatedEpc);
  });
});
