/**
 * Mock sync engine for aggregating rewards offers from all sources
 * Provides unified API for querying offers across cardlytics, network, and affiliate sources
 */

import { cardlyticsStore } from './cardlytics-banyan';
import { networkOfferStore } from './visa-mastercard';
import { affiliateStore } from './rakuten-impact';

interface GetActiveOffersParams {
  category?: string;
  minCashback?: number;
}

interface GetNetworkDealsParams {
  network?: string | string[];
  country?: string;
  activeOnly?: boolean;
}

interface GetAffiliateDealsParams {
  vertical?: string;
  network?: string | string[];
  minEpc?: number;
}

export async function getActiveOffers(params?: GetActiveOffersParams) {
  cardlyticsStore.sync();
  let offers = cardlyticsStore.listOffers();

  if (params?.category) {
    offers = offers.filter(o => 
      o.category.toLowerCase().includes(params.category!.toLowerCase())
    );
  }

  if (params?.minCashback) {
    offers = offers.filter(o => o.cashbackRate >= params.minCashback!);
  }

  return offers;
}

export async function getNetworkDeals(params?: GetNetworkDealsParams) {
  networkOfferStore.sync();
  let offers = networkOfferStore.listOffers();

  if (params?.network) {
    const networks = Array.isArray(params.network) ? params.network : [params.network];
    offers = offers.filter(o =>
      networks.some(n => o.network.toLowerCase() === n.toLowerCase())
    );
  }

  if (params?.country) {
    offers = offers.filter(o =>
      o.geoTargets?.some((g: any) =>
        g.country.toLowerCase() === params.country!.toLowerCase()
      )
    );
  }

  if (params?.activeOnly) {
    offers = offers.filter(o => o.active);
  }

  return offers;
}

export async function getAffiliateDeals(params?: GetAffiliateDealsParams) {
  const result = affiliateStore.sync();
  let deals = [...result.rakuten, ...result.impact];

  if (params?.vertical) {
    deals = deals.filter(d =>
      d.vertical.toLowerCase().includes(params.vertical!.toLowerCase())
    );
  }

  if (params?.network) {
    const networks = Array.isArray(params.network) ? params.network : [params.network];
    deals = deals.filter(d =>
      networks.some(n => d.network.toLowerCase() === n.toLowerCase())
    );
  }

  if (params?.minEpc) {
    deals = deals.filter(d => (d.minEpc || 0) >= params.minEpc!);
  }

  return deals;
}
