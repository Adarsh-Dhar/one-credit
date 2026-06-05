import { connectDB } from '../mongodb';
import { cardlyticsStore } from './cardlytics-banyan';
import { networkOfferStore } from './visa-mastercard';
import { affiliateStore } from './rakuten-impact';

// Sync result interfaces
export interface SyncResult {
  source: string;
  recordsUpserted: number;
  status: 'success' | 'error';
  error?: string;
  durationMs: number;
}

export interface FullSyncReport {
  success: boolean;
  results: SyncResult[];
  totalMs: number;
  timestamp: string;
}

// Lazy-load mongoose to avoid circular imports
let mongooseConnection: Awaited<ReturnType<typeof connectDB>> | null = null;

async function getMongoose() {
  if (!mongooseConnection) {
    mongooseConnection = await connectDB();
  }
  return mongooseConnection;
}

async function getCollection(collectionName: string) {
  const mg = await getMongoose();
  if (!mg?.connection?.db) {
    throw new Error('Database connection not established');
  }
  return mg.connection.db.collection(collectionName);
}

// Generic bulk upsert using MongoDB bulkWrite
async function upsertMany<T extends Record<string, unknown>>(collectionName: string, documents: T[], keyField: string): Promise<number> {
  if (documents.length === 0) return 0;

  const collection = await getCollection(collectionName);

  const bulkOps = documents.map(doc => ({
    updateOne: {
      filter: { [keyField]: doc[keyField] },
      update: { $set: { ...doc, updatedAt: new Date() } },
      upsert: true
    }
  }));

  const result = await collection.bulkWrite(bulkOps, { ordered: false });
  return result.upsertedCount + result.modifiedCount;
}

// Individual sync functions
async function syncCardlytics(): Promise<SyncResult> {
  const startTime = Date.now();
  try {
    cardlyticsStore.sync();
    
    const offers = cardlyticsStore.listOffers();
    const flatDocs = offers.map(o => ({
      offerId: o.offerId,
      merchantName: o.merchantName,
      category: o.category,
      cashbackRate: o.cashbackRate,
      minSpend: o.minSpend,
      maxCashback: o.maxCashback,
      startDate: o.startDate,
      endDate: o.endDate,
      active: o.active,
      cardNetworks: o.cardNetworks,
      description: o.description,
      terms: o.terms,
      impressionCount: o.impressionCount,
      clickCount: o.clickCount,
      redemptionCount: o.redemptionCount,
      syncCount: cardlyticsStore.getSyncCount(),
      lastSyncedAt: new Date()
    }));

    const count = await upsertMany('offers_cardlytics', flatDocs, 'offerId');
    
    return {
      source: 'cardlytics',
      recordsUpserted: count,
      status: 'success',
      durationMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      source: 'cardlytics',
      recordsUpserted: 0,
      status: 'error',
      error: String(error),
      durationMs: Date.now() - startTime
    };
  }
}

async function syncNetworkOffers(): Promise<SyncResult> {
  const startTime = Date.now();
  try {
    networkOfferStore.sync();
    
    const offers = networkOfferStore.listOffers();
    const flatDocs = offers.map(o => ({
      offerId: o.offerId,
      network: o.network,
      merchantName: o.merchantName,
      discountRate: o.discountRate,
      discountType: o.discountType,
      minSpend: o.minSpend,
      maxDiscount: o.maxDiscount,
      eligibleTiers: o.eligibleTiers,
      geoTargets: o.geoTargets,
      channels: o.channels,
      active: o.active,
      startDate: o.startDate,
      endDate: o.endDate,
      impressionCount: o.impressionCount,
      activationCount: o.activationCount,
      redemptionCount: o.redemptionCount,
      description: o.description,
      terms: o.terms,
      syncCount: networkOfferStore.getSyncCount(),
      lastSyncedAt: new Date()
    }));

    const count = await upsertMany('offers_network', flatDocs, 'offerId');
    
    return {
      source: 'visa_mastercard',
      recordsUpserted: count,
      status: 'success',
      durationMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      source: 'visa_mastercard',
      recordsUpserted: 0,
      status: 'error',
      error: String(error),
      durationMs: Date.now() - startTime
    };
  }
}

async function syncAffiliateDeals(): Promise<SyncResult> {
  const startTime = Date.now();
  try {
    const result = affiliateStore.sync();
    
    const allDeals = [...(result.rakuten || []), ...(result.impact || [])];
    const flatDocs = allDeals.map(d => ({
      dealId: d.dealId,
      network: d.network,
      merchantName: d.merchantName,
      vertical: d.vertical,
      commissionType: d.commissionType,
      commissionRate: d.commissionRate,
      tieredRates: d.tieredRates,
      trackingUrl: d.trackingUrl,
      promoCode: d.promoCode,
      cookieWindow: d.cookieWindow,
      minEpc: d.minEpc,
      clickCount: d.clickCount,
      conversionCount: d.conversionCount,
      revenue: d.revenue,
      active: d.active,
      startDate: d.startDate,
      endDate: d.endDate,
      description: d.description,
      terms: d.terms,
      syncCount: affiliateStore.getSyncCount(),
      lastSyncedAt: new Date()
    }));

    const count = await upsertMany('offers_affiliate', flatDocs, 'dealId');
    
    return {
      source: 'affiliate',
      recordsUpserted: count,
      status: 'success',
      durationMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      source: 'affiliate',
      recordsUpserted: 0,
      status: 'error',
      error: String(error),
      durationMs: Date.now() - startTime
    };
  }
}

// Run full sync across all three sources
export async function runFullSync(): Promise<FullSyncReport> {
  const startTime = Date.now();
  
  const results = await Promise.all([
    syncCardlytics(),
    syncNetworkOffers(),
    syncAffiliateDeals()
  ]);

  const report: FullSyncReport = {
    success: results.every(r => r.status === 'success'),
    results,
    totalMs: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };

  // Persist report to sync_reports collection
  try {
    const collection = await getCollection('sync_reports');
    await collection.insertOne(report);
  } catch (error) {
    console.error('Failed to persist sync report:', error);
  }

  return report;
}

// Single-source sync for MCP tool
export async function syncSource(source: string): Promise<FullSyncReport> {
  const startTime = Date.now();
  let result: SyncResult;

  switch (source) {
    case 'cardlytics':
      result = await syncCardlytics();
      break;
    case 'visa_mastercard':
      result = await syncNetworkOffers();
      break;
    case 'affiliate':
      result = await syncAffiliateDeals();
      break;
    default:
      result = {
        source,
        recordsUpserted: 0,
        status: 'error',
        error: `Unknown source: ${source}`,
        durationMs: 0
      };
  }

  const report: FullSyncReport = {
    success: result.status === 'success',
    results: [result],
    totalMs: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };

  // Persist report
  try {
    const collection = await getCollection('sync_reports');
    await collection.insertOne(report);
  } catch (error) {
    console.error('Failed to persist sync report:', error);
  }

  return report;
}

// Auto-sync singleton
let autoSyncInterval: NodeJS.Timeout | null = null;

export function startAutoSync(intervalSeconds: number): void {
  if (autoSyncInterval) {
    console.log('[AggregatorSync] Auto-sync already running');
    return;
  }

  console.log(`[AggregatorSync] Auto-sync started — every ${intervalSeconds}s`);
  
  autoSyncInterval = setInterval(async () => {
    try {
      const report = await runFullSync();
      console.log(`[AggregatorSync] Sync completed: ${report.results.map(r => `${r.source}:${r.recordsUpserted}`).join(', ')} (${report.totalMs}ms)`);
    } catch (error) {
      console.error('[AggregatorSync] Sync failed:', error);
    }
  }, intervalSeconds * 1000);
}

export function stopAutoSync(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    console.log('[AggregatorSync] Auto-sync stopped');
  }
}

// Read helpers for API routes
export async function getActiveOffers(filters?: {
  merchantName?: string;
  minCashback?: number;
  category?: string;
}): Promise<any[]> {
  const collection = await getCollection('offers_cardlytics');
  const query: any = { active: true };

  if (filters?.merchantName) {
    query.merchantName = { $regex: filters.merchantName, $options: 'i' };
  }
  if (filters?.minCashback) {
    query.cashbackRate = { $gte: filters.minCashback };
  }
  if (filters?.category) {
    query.category = filters.category;
  }

  return collection.find(query).toArray();
}

export async function getNetworkDeals(filters?: {
  network?: string;
  country?: string;
  activeOnly?: boolean;
}): Promise<Record<string, unknown>[]> {
  const collection = await getCollection('offers_network');
  const query: Record<string, unknown> = {};

  if (filters?.network) {
    query.network = filters.network.toUpperCase();
  }
  if (filters?.country) {
    query['geoTargets.country'] = filters.country;
  }
  if (filters?.activeOnly) {
    query.active = true;
  }

  return collection.find(query).toArray();
}

export async function getAffiliateDeals(filters?: {
  vertical?: string;
  network?: string;
  minEpc?: number;
}): Promise<Record<string, unknown>[]> {
  const collection = await getCollection('offers_affiliate');
  const query: Record<string, unknown> = {};

  if (filters?.vertical) {
    query.vertical = filters.vertical;
  }
  if (filters?.network) {
    query.network = filters.network;
  }
  if (filters?.minEpc) {
    query.minEpc = { $gte: filters.minEpc };
  }

  return collection.find(query).toArray();
}
