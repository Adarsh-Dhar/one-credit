import { NextResponse } from 'next/server';
import { RUMSignals } from '@/lib/models/RUMSignals';
import { RUMEvent } from '@/lib/types';
import { ratelimit } from '@/lib/rateLimit';
import logger from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// ─── Event Handler Map ─────────────────────────────────────────────────────

interface EventAccumulators {
  incOps: Record<string, number> & { transferPartnerTabClicks?: number; cardDetailExpansions?: number; extensionFireCount?: number; extensionAnalyzeApiCallCount?: number; [key: string]: number | undefined }
  maxOps: Record<string, number> & { scrollDepthMax?: number; [key: string]: number | undefined }
  setOps: Record<string, boolean> & { scrolledPastAnnualFee?: boolean; backNavAfterRecommendation?: boolean; abandonedRotatingActivation?: boolean; [key: string]: boolean | undefined }
  stringSetOps: Record<string, string> & { cardAddedToWallet?: string; [key: string]: string | undefined }
  addToSetOps: Record<string, string[]> & { transferPartnersClicked?: string[]; [key: string]: string[] | undefined }
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
      acc.incOps[`cardViewCounts.${event.data.cardId}`] = (acc.incOps[`cardViewCounts.${event.data.cardId}`] as number || 0) + 1;
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
  spend_category_entered: (event) => {
    // Track spend category amounts - could be stored as an array or separate fields
    // For now, we'll just log it as a custom event for analysis
    logger.info({ category: event.data?.category, amount: event.data?.amount }, '[rum/ingest] Spend category entered');
  },
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, events } = body as { userId: string; events: RUMEvent[] };

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
