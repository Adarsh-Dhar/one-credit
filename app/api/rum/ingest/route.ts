import { NextResponse } from 'next/server';
import { RUMSignals } from '@/lib/models/RUMSignals';
import { RUMEvent } from '@/lib/types';
import { ratelimit } from '@/lib/rateLimit';
import logger from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import { z } from 'zod';

// ─── Zod Validation Schemas ─────────────────────────────────────────────────

const RUMEventSchema = z.object({
  eventType: z.string(),
  timestamp: z.number(),
  section: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

const RUMIngestSchema = z.object({
  userId: z.string(),
  events: z.array(RUMEventSchema),
});

// ─── Sanitization Helper ─────────────────────────────────────────────────────

function sanitizeMongoKey(key: string): string {
  return key.replace(/[.$]/g, '_');
}

// ─── Event Handler Map ─────────────────────────────────────────────────────

interface EventAccumulators {
  incOps: Record<string, number>
  maxOps: Record<string, number>
  setOps: Record<string, boolean>
  stringSetOps: Record<string, string>
  addToSetOps: Record<string, string[]>
}

type EventHandler = (event: RUMEvent, acc: EventAccumulators) => void;

const eventHandlers: Record<string, EventHandler> = {
  tab_click: (event, acc) => {
    if (event.data?.tab === 'transfer_partners') {
      acc.incOps.transferPartnerTabClicks = (acc.incOps.transferPartnerTabClicks || 0) + 1;
    }
  },
  card_detail_expansion: (_event, acc) => {
    acc.incOps.cardDetailExpansions = (acc.incOps.cardDetailExpansions || 0) + 1;
  },
  dwell_time: (event, acc) => {
    if (event.section) {
      const field = `dwellOn${event.section.charAt(0).toUpperCase() + event.section.slice(1)}`;
      acc.maxOps[field] = (event.data?.duration as number) || 0;
    }
  },
  scroll_depth: (event, acc) => {
    if (event.data?.depth) {
      const depth = event.data.depth as number;
      if (depth >= 50) {
        acc.setOps.scrolledPastAnnualFee = true;
      }
      acc.maxOps.scrollDepthMax = depth;
    }
  },
  back_navigation: (_event, acc) => {
    acc.setOps.backNavAfterRecommendation = true;
  },
  card_view: (event, acc) => {
    if (event.data?.cardId) {
      const sanitizedCardId = sanitizeMongoKey(event.data.cardId as string);
      acc.incOps[`cardViewCounts.${sanitizedCardId}`] = (acc.incOps[`cardViewCounts.${sanitizedCardId}`] as number || 0) + 1;
    }
  },
  wallet_add: (event, acc) => {
    if (event.data?.cardId) {
      acc.stringSetOps.cardAddedToWallet = event.data.cardId as string;
    }
  },
  transfer_partner_click: (event, acc) => {
    if (event.data?.partner) {
      acc.addToSetOps.transferPartnersClicked = acc.addToSetOps.transferPartnersClicked || [];
      acc.addToSetOps.transferPartnersClicked.push(event.data.partner as string);
    }
  },
  extension_fire: (_event, acc) => {
    acc.incOps.extensionFireCount = (acc.incOps.extensionFireCount || 0) + 1;
  },
  abandoned_rotating_activation: (_event, acc) => {
    acc.setOps.abandonedRotatingActivation = true;
  },
  extension_analyze_api_call: (_event, acc) => {
    acc.incOps.extensionAnalyzeApiCallCount = (acc.incOps.extensionAnalyzeApiCallCount || 0) + 1;
  },
  spend_category_entered: (event, acc) => {
    // Track spend category amounts by storing in custom accumulator
    const category = event.data?.category as string;
    const amount = event.data?.amount as number;
    if (category && amount) {
      const sanitizedCategory = sanitizeMongoKey(category);
      const key = `spendCategory.${sanitizedCategory}`;
      acc.incOps[key] = (acc.incOps[key] || 0) + amount;
    }
  },
  product_analyzed: (event, acc) => {
    acc.incOps.extensionAnalyzeApiCallCount =
      (acc.incOps.extensionAnalyzeApiCallCount || 0) + 1;
    // store the last analyzed product for DT log enrichment
    if (event.data?.category) {
      const cat = sanitizeMongoKey(event.data.category as string);
      acc.incOps[`analyzedCategories.${cat}`] =
        (acc.incOps[`analyzedCategories.${cat}`] || 0) + 1;
    }
  },
  purchase_confirmed: (event, acc) => {
    acc.incOps.extensionFireCount =
      (acc.incOps.extensionFireCount || 0) + 1;
    if (event.data?.category) {
      const cat = sanitizeMongoKey(event.data.category as string);
      acc.incOps[`purchasedCategories.${cat}`] =
        (acc.incOps[`purchasedCategories.${cat}`] || 0) + 1;
    }
    if (event.data?.merchant) {
      acc.stringSetOps.lastPurchasedMerchant = event.data.merchant as string;
    }
  },
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const validationResult = RUMIngestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { userId, events } = validationResult.data;

    logger.info({ userId, events }, '[rum/ingest] received events');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify the requested userId matches the authenticated user
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: 'events array is required' }, { status: 400 });
    }

    // Rate limit by userId
    const { success } = await ratelimit.limit(userId);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Build update operations from events
    const updateOps: Record<string, unknown> = { $set: { userId } };
    const incOps: Record<string, number> = {};
    const maxOps: Record<string, number> = {};
    const addToSetOps: Record<string, string[]> = {};
    const setOps: Record<string, boolean> = {};
    const stringSetOps: Record<string, string> = {};

    // Type assertion for $set to allow additional properties
    const $set = updateOps.$set as Record<string, unknown>;

    for (const event of events) {
      const handler = eventHandlers[event.eventType];
      if (handler) {
        handler(event, { incOps, maxOps, setOps, stringSetOps, addToSetOps });
      } else {
        logger.warn({ eventType: event.eventType }, '[rum/ingest] Unknown event type');
      }
    }

    // Merge all operations
    if (Object.keys(incOps).length > 0) {
      updateOps.$inc = incOps;
    }
    if (Object.keys(maxOps).length > 0) {
      updateOps.$max = maxOps;
    }
    if (Object.keys(addToSetOps).length > 0) {
      updateOps.$addToSet = addToSetOps;
    }
    if (Object.keys(setOps).length > 0) {
      Object.assign($set, setOps);
    }
    if (Object.keys(stringSetOps).length > 0) {
      Object.assign($set, stringSetOps);
    }

    // Upsert to MongoDB
    await RUMSignals.updateOne(
      { userId },
      updateOps,
      { upsert: true }
    );

    return NextResponse.json({ success: true, processed: events.length });
  } catch (error) {
    logger.error({ error }, '[rum/ingest] Error processing RUM events');
    const { error: err, status } = toErrorResponse(error);
    return NextResponse.json(err, { status });
  }
}
