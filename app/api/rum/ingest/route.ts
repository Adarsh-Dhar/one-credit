import { NextResponse } from 'next/server';
import { RUMSignals } from '@/lib/models/RUMSignals';
import { RUMEvent } from '@/lib/types';
import { ratelimit } from '@/lib/rateLimit';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, events } = body as { userId: string; events: RUMEvent[] };

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

    for (const event of events) {
      switch (event.eventType) {
        case 'rage_click':
          incOps.rageClicksOnRotatingCategory = (incOps.rageClicksOnRotatingCategory || 0) + 1;
          break;
        case 'tab_click':
          if (event.data?.tab === 'transfer_partners') {
            incOps.transferPartnerTabClicks = (incOps.transferPartnerTabClicks || 0) + 1;
          } else if (event.data?.tab === 'cashback') {
            incOps.cashbackTabClicks = (incOps.cashbackTabClicks || 0) + 1;
          } else if (event.data?.tab === 'offers') {
            incOps.offersTabClicks = (incOps.offersTabClicks || 0) + 1;
          }
          break;
        case 'card_detail_expansion':
          incOps.cardDetailExpansions = (incOps.cardDetailExpansions || 0) + 1;
          break;
        case 'calculate_best_card_click':
          incOps.calculateBestCardClicks = (incOps.calculateBestCardClicks || 0) + 1;
          break;
        case 'dwell_time':
          if (event.section) {
            const field = `dwellOn${event.section.charAt(0).toUpperCase() + event.section.slice(1)}`;
            // Use $max to keep the longest dwell time
            maxOps[field] = (event.data?.duration as number) || 0;
          }
          break;
        case 'scroll_depth':
          if (event.data?.depth) {
            const depth = event.data.depth as number;
            if (depth >= 25) {
              setOps.scrolledPastFinePrint = true;
            }
            if (depth >= 50) {
              setOps.scrolledPastAnnualFee = true;
            }
          }
          break;
        case 'back_navigation':
          setOps.backNavAfterRecommendation = true;
          break;
        case 'card_view':
          if (event.data?.cardId) {
            addToSetOps.cardsViewed = addToSetOps.cardsViewed || [];
            addToSetOps.cardsViewed.push(event.data.cardId);
          }
          break;
        case 'card_compare':
          if (event.data?.cardId) {
            addToSetOps.cardsCompared = addToSetOps.cardsCompared || [];
            addToSetOps.cardsCompared.push(event.data.cardId);
          }
          break;
        case 'wallet_add':
          if (event.data?.cardId) {
            setOps.cardAddedToWallet = event.data.cardId;
          }
          break;
        case 'transfer_partner_click':
          if (event.data?.partner) {
            addToSetOps.transferPartnersClicked = addToSetOps.transferPartnersClicked || [];
            addToSetOps.transferPartnersClicked.push(event.data.partner);
          }
          break;
        case 'extension_fire':
          incOps.extensionFireCount = (incOps.extensionFireCount || 0) + 1;
          break;
        case 'redemption_type_view':
          if (event.data?.type) {
            addToSetOps.redemptionTypesViewed = addToSetOps.redemptionTypesViewed || [];
            addToSetOps.redemptionTypesViewed.push(event.data.type);
          }
          break;
        default:
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
      Object.assign(updateOps.$set, setOps);
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process RUM events' },
      { status: 500 }
    );
  }
}
