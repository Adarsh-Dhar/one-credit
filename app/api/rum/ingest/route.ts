import { NextResponse } from 'next/server';
import { RUMSignals } from '@/lib/models/RUMSignals';
import { RUMEvent } from '@/lib/types';
import { ratelimit } from '@/lib/rateLimit';
import logger from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';

// ─── Event Handler Map ─────────────────────────────────────────────────────

type EventHandler = (event: RUMEvent, incOps: Record<string, number>, maxOps: Record<string, number>, setOps: Record<string, boolean>, stringSetOps: Record<string, string>, addToSetOps: Record<string, string[]>) => void;

const eventHandlers: Record<string, EventHandler> = {
  tab_click: (event, incOps) => {
    if (event.data?.tab === 'transfer_partners') {
      incOps.transferPartnerTabClicks = (incOps.transferPartnerTabClicks || 0) + 1;
    }
  },
  card_detail_expansion: (event, incOps) => {
    incOps.cardDetailExpansions = (incOps.cardDetailExpansions || 0) + 1;
  },
  dwell_time: (event, _incOps, maxOps) => {
    if (event.section) {
      const field = `dwellOn${event.section.charAt(0).toUpperCase() + event.section.slice(1)}`;
      maxOps[field] = (event.data?.duration as number) || 0;
    }
  },
  scroll_depth: (event, _incOps, maxOps, setOps) => {
    if (event.data?.depth) {
      const depth = event.data.depth as number;
      if (depth >= 50) {
        setOps.scrolledPastAnnualFee = true;
      }
      maxOps.scrollDepthMax = depth;
    }
  },
  back_navigation: (_event, _incOps, _maxOps, setOps) => {
    setOps.backNavAfterRecommendation = true;
  },
  card_view: (event, incOps) => {
    if (event.data?.cardId) {
      incOps[`cardViewCounts.${event.data.cardId}`] = (incOps[`cardViewCounts.${event.data.cardId}`] as number || 0) + 1;
    }
  },
  wallet_add: (event, _incOps, _maxOps, _setOps, stringSetOps) => {
    if (event.data?.cardId) {
      stringSetOps.cardAddedToWallet = event.data.cardId as string;
    }
  },
  transfer_partner_click: (event, _incOps, _maxOps, _setOps, _stringSetOps, addToSetOps) => {
    if (event.data?.partner) {
      addToSetOps.transferPartnersClicked = addToSetOps.transferPartnersClicked || [];
      addToSetOps.transferPartnersClicked.push(event.data.partner);
    }
  },
  extension_fire: (event, incOps) => {
    incOps.extensionFireCount = (incOps.extensionFireCount || 0) + 1;
  },
  card_recommendation_view: () => {
    // Track when user views card recommendations - can be used for funnel analysis
    // No specific field to update, just log the event for now
  },
  abandoned_rotating_activation: (_event, _incOps, _maxOps, setOps) => {
    setOps.abandonedRotatingActivation = true;
  },
  extension_analyze_api_call: (event, incOps) => {
    incOps.extensionAnalyzeApiCallCount = (incOps.extensionAnalyzeApiCallCount || 0) + 1;
  },
  spend_category_entered: (event) => {
    // Track spend category amounts - could be stored as an array or separate fields
    // For now, we'll just log it as a custom event for analysis
    logger.info({ category: event.data?.category, amount: event.data?.amount }, '[rum/ingest] Spend category entered');
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, events } = body as { userId: string; events: RUMEvent[] };

    logger.info({ userId, events }, '[rum/ingest] received events');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
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
    const addToSetOps: Record<string, unknown[]> = {};
    const setOps: Record<string, boolean> = {};
    const stringSetOps: Record<string, string> = {};

    // Type assertion for $set to allow additional properties
    const $set = updateOps.$set as Record<string, unknown>;

    for (const event of events) {
      const handler = eventHandlers[event.eventType];
      if (handler) {
        handler(event, incOps, maxOps, setOps, stringSetOps, addToSetOps);
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
