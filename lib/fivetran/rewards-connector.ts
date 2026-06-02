/**
 * lib/fivetran/rewards-connector.ts
 *
 * Fivetran-style incremental connector for the three rewards mock APIs:
 *   - Cardlytics / Banyan  →  /api/rewards/mock/cardlytics
 *   - Visa / Mastercard    →  /api/rewards/mock/network
 *   - Rakuten / Impact     →  /api/rewards/mock/affiliate
 *
 * Each sync cycle:
 *  1. Calls the mock API (GET to list all offers)
 *  2. Normalizes each record into the unified IRewardsOffer shape
 *  3. Bulk-upserts into rewards_offers via MongoDB bulkWrite
 *  4. Writes a connector sync log to fivetran_sync_log
 */

import { connectDB } from '@/lib/mongodb';
import { RewardsOffer } from '@/lib/models/RewardsOffer';
import { randomUUID } from 'crypto';
import { cardlyticsStore } from '@/lib/mock-apis/cardlytics-banyan';
import { networkOfferStore } from '@/lib/mock-apis/visa-mastercard';
import { affiliateStore } from '@/lib/mock-apis/rakuten-impact';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ConnectorSyncResult {
  connectorId: string;
  source: 'cardlytics' | 'network' | 'affiliate';
  syncId: string;
  recordsFetched: number;
  recordsUpserted: number;
  status: 'success' | 'error';
  error?: string;
  durationMs: number;
  syncedAt: string;
}

export interface RewardsSyncReport {
  success: boolean;
  syncId: string;
  connectors: ConnectorSyncResult[];
  totalRecords: number;
  totalMs: number;
  timestamp: string;
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/** Deterministic offerId for the unified collection */
function unifiedOfferId(source: string, rawId: string): string {
  return `${source}::${rawId}`;
}

// ── Normalizers ────────────────────────────────────────────────────────────────

function normalizeCardlyticsOffer(offer: any, syncId: string) {
  return {
    offerId:      unifiedOfferId('cardlytics', offer.offerId),
    source:       'cardlytics' as const,
    merchantName: offer.merchantName,
    category:     offer.category,
    rewardType:   'cashback' as const,
    rewardRate:   offer.cashbackRate,
    minSpend:     offer.minSpend ?? 0,
    maxReward:    offer.maxCashback ?? 0,
    active:       offer.active,
    startDate:    offer.startDate,
    endDate:      offer.endDate,
    description:  offer.description,
    terms:        offer.terms ?? [],
    cardlyticsData: {
      cashbackRate:    offer.cashbackRate,
      cardNetworks:    offer.cardNetworks ?? [],
      impressionCount: offer.impressionCount ?? 0,
      clickCount:      offer.clickCount ?? 0,
      redemptionCount: offer.redemptionCount ?? 0,
      syncCount:       offer.syncCount ?? 0,
    },
    fivetranSyncId: syncId,
    lastSyncedAt:   new Date(),
  };
}

function normalizeNetworkOffer(offer: any, syncId: string) {
  return {
    offerId:      unifiedOfferId('network', offer.offerId),
    source:       'network' as const,
    merchantName: offer.merchantName,
    category:     inferCategoryFromNetwork(offer.merchantName),
    rewardType:   offer.discountType as any,
    rewardRate:   offer.discountRate,
    minSpend:     offer.minSpend ?? 0,
    maxReward:    offer.maxDiscount ?? 0,
    active:       offer.active,
    startDate:    offer.startDate,
    endDate:      offer.endDate,
    description:  offer.description,
    terms:        offer.terms ?? [],
    networkData: {
      network:          offer.network,
      discountType:     offer.discountType,
      eligibleTiers:    offer.eligibleTiers ?? [],
      geoTargets:       offer.geoTargets ?? [],
      channels:         offer.channels ?? [],
      impressionCount:  offer.impressionCount ?? 0,
      activationCount:  offer.activationCount ?? 0,
      redemptionCount:  offer.redemptionCount ?? 0,
      syncCount:        offer.syncCount ?? 0,
    },
    fivetranSyncId: syncId,
    lastSyncedAt:   new Date(),
  };
}

function normalizeAffiliateOffer(deal: any, syncId: string) {
  return {
    offerId:      unifiedOfferId('affiliate', deal.dealId),
    source:       'affiliate' as const,
    merchantName: deal.merchantName,
    category:     deal.vertical,
    rewardType:   deal.commissionType as any,
    rewardRate:   deal.commissionRate,
    minSpend:     0,
    maxReward:    0,
    active:       deal.active,
    startDate:    deal.startDate,
    endDate:      deal.endDate,
    description:  deal.description,
    terms:        deal.terms ?? [],
    affiliateData: {
      network:         deal.network,
      vertical:        deal.vertical,
      commissionType:  deal.commissionType,
      commissionRate:  deal.commissionRate,
      tieredRates:     deal.tieredRates,
      trackingUrl:     deal.trackingUrl,
      promoCode:       deal.promoCode,
      cookieWindow:    deal.cookieWindow ?? 0,
      minEpc:          deal.minEpc ?? 0,
      clickCount:      deal.clickCount ?? 0,
      conversionCount: deal.conversionCount ?? 0,
      revenue:         deal.revenue ?? 0,
      syncCount:       deal.syncCount ?? 0,
    },
    fivetranSyncId: syncId,
    lastSyncedAt:   new Date(),
  };
}

function inferCategoryFromNetwork(merchantName: string): string {
  const name = merchantName.toLowerCase();
  if (/hotel|hilton|ritz|marriott|inn/.test(name)) return 'travel';
  if (/air|british|delta|flight/.test(name)) return 'travel';
  if (/restaurant|nobu|dining|michelin/.test(name)) return 'dining';
  if (/rental|hertz/.test(name)) return 'travel';
  if (/apple|best buy/.test(name)) return 'shopping';
  if (/lounge|priority/.test(name)) return 'travel';
  return 'shopping';
}

// ── MongoDB bulk upsert ────────────────────────────────────────────────────────

async function bulkUpsertOffers(docs: ReturnType<typeof normalizeCardlyticsOffer>[]): Promise<number> {
  if (docs.length === 0) return 0;

  const bulkOps = docs.map((doc) => ({
    updateOne: {
      filter: { offerId: doc.offerId },
      update: { $set: doc },
      upsert: true,
    },
  }));

  const result = await RewardsOffer.bulkWrite(bulkOps as any, { ordered: false });
  return (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
}

// ── Per-source sync functions ──────────────────────────────────────────────────

async function syncCardlyticsConnector(syncId: string): Promise<ConnectorSyncResult> {
  const start = Date.now();
  const connectorId = process.env.FIVETRAN_REWARDS_CONNECTOR_ID || 'local-cardlytics';
  try {
    // Call sync() directly — no HTTP round-trip, same module instance
    cardlyticsStore.sync();
    const offers = cardlyticsStore.listOffers();
    const docs = offers.map((o) => normalizeCardlyticsOffer(o as any, syncId));
    const upserted = await bulkUpsertOffers(docs);

    return {
      connectorId, source: 'cardlytics', syncId,
      recordsFetched: offers.length, recordsUpserted: upserted,
      status: 'success', durationMs: Date.now() - start,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      connectorId, source: 'cardlytics', syncId,
      recordsFetched: 0, recordsUpserted: 0,
      status: 'error', error: String(error),
      durationMs: Date.now() - start, syncedAt: new Date().toISOString(),
    };
  }
}

async function syncNetworkConnector(syncId: string): Promise<ConnectorSyncResult> {
  const start = Date.now();
  const connectorId = process.env.FIVETRAN_REWARDS_CONNECTOR_ID || 'local-network';
  try {
    networkOfferStore.sync();
    const offers = networkOfferStore.listOffers();
    const docs = offers.map((o) => normalizeNetworkOffer(o as any, syncId));
    const upserted = await bulkUpsertOffers(docs as any);

    return {
      connectorId, source: 'network', syncId,
      recordsFetched: offers.length, recordsUpserted: upserted,
      status: 'success', durationMs: Date.now() - start,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      connectorId, source: 'network', syncId,
      recordsFetched: 0, recordsUpserted: 0,
      status: 'error', error: String(error),
      durationMs: Date.now() - start, syncedAt: new Date().toISOString(),
    };
  }
}

async function syncAffiliateConnector(syncId: string): Promise<ConnectorSyncResult> {
  const start = Date.now();
  const connectorId = process.env.FIVETRAN_REWARDS_CONNECTOR_ID || 'local-affiliate';
  try {
    const result = affiliateStore.sync();
    const allDeals = [...(result.rakuten ?? []), ...(result.impact ?? [])];
    const docs = allDeals.map((d) => normalizeAffiliateOffer(d as any, syncId));
    const upserted = await bulkUpsertOffers(docs as any);

    return {
      connectorId, source: 'affiliate', syncId,
      recordsFetched: allDeals.length, recordsUpserted: upserted,
      status: 'success', durationMs: Date.now() - start,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      connectorId, source: 'affiliate', syncId,
      recordsFetched: 0, recordsUpserted: 0,
      status: 'error', error: String(error),
      durationMs: Date.now() - start, syncedAt: new Date().toISOString(),
    };
  }
}

// ── Sync log ───────────────────────────────────────────────────────────────────

async function persistSyncLog(report: RewardsSyncReport): Promise<void> {
  try {
    const mg = await connectDB();
    await (mg as any).connection.db
      .collection('fivetran_sync_log')
      .insertOne(report);
  } catch (e) {
    console.error('[FivetranRewards] Failed to persist sync log:', e);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Run a full three-source rewards sync.
 * Called by the scheduler, by /api/fivetran/rewards, and by the Gemini tool.
 */
export async function runRewardsSync(
  sources: Array<'cardlytics' | 'network' | 'affiliate'> = ['cardlytics', 'network', 'affiliate']
): Promise<RewardsSyncReport> {
  await connectDB();

  const syncId = randomUUID();
  const start  = Date.now();

  const jobs: Promise<ConnectorSyncResult>[] = [];
  if (sources.includes('cardlytics')) jobs.push(syncCardlyticsConnector(syncId));
  if (sources.includes('network'))    jobs.push(syncNetworkConnector(syncId));
  if (sources.includes('affiliate'))  jobs.push(syncAffiliateConnector(syncId));

  const connectors = await Promise.all(jobs);

  const report: RewardsSyncReport = {
    success:      connectors.every((c) => c.status === 'success'),
    syncId,
    connectors,
    totalRecords: connectors.reduce((s, c) => s + c.recordsUpserted, 0),
    totalMs:      Date.now() - start,
    timestamp:    new Date().toISOString(),
  };

  await persistSyncLog(report);
  return report;
}

/**
 * Get the most recent sync log entry.
 */
export async function getLastSyncStatus(): Promise<RewardsSyncReport | null> {
  const mg = await connectDB();
  const doc = await (mg as any).connection.db
    .collection('fivetran_sync_log')
    .findOne({}, { sort: { timestamp: -1 } });
  return doc ?? null;
}

/**
 * Query normalized rewards offers from MongoDB.
 * Used by Gemini tools to answer "best offer for X" questions.
 */
export async function queryRewardsOffers(filters: {
  source?:       'cardlytics' | 'network' | 'affiliate';
  category?:     string;
  merchantName?: string;
  activeOnly?:   boolean;
  minRewardRate?: number;
  country?:      string;
  network?:      string;   // VISA | MASTERCARD | rakuten | impact
  limit?:        number;
  sortBy?:       'rewardRate' | 'lastSyncedAt';
}): Promise<any[]> {
  await connectDB();

  const query: Record<string, any> = {};

  if (filters.activeOnly !== false) query.active = true;
  if (filters.source)       query.source       = filters.source;
  if (filters.category)     query.category     = { $regex: filters.category, $options: 'i' };
  if (filters.merchantName) query.merchantName = { $regex: filters.merchantName, $options: 'i' };
  if (filters.minRewardRate !== undefined) query.rewardRate = { $gte: filters.minRewardRate };
  if (filters.country)      query['networkData.geoTargets.country'] = filters.country.toUpperCase();
  if (filters.network) {
    // could be card network (VISA/MC) or affiliate network
    query.$or = [
      { 'networkData.network': filters.network.toUpperCase() },
      { 'affiliateData.network': filters.network.toLowerCase() },
    ];
  }

  const sortField = filters.sortBy === 'lastSyncedAt' ? { lastSyncedAt: -1 } : { rewardRate: -1 };
  const limit = filters.limit ?? 20;

  return RewardsOffer.find(query).sort(sortField as any).limit(limit).lean();
}
