/**
 * app/api/fivetran/rewards/route.ts
 *
 * HTTP interface for the Fivetran rewards connector.
 * Called by the Gemini MCP tool `sync_rewards`.
 *
 * POST /api/fivetran/rewards
 *   body: { sources?: ['cardlytics', 'network', 'affiliate'] }
 *   → triggers an immediate sync and returns the report
 *
 * GET /api/fivetran/rewards
 *   → returns the most recent sync log entry (freshness check)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runRewardsSync, getLastSyncStatus } from '@/lib/fivetran/rewards-connector';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sources: Array<'cardlytics' | 'network' | 'affiliate'> =
      body.sources ?? ['cardlytics', 'network', 'affiliate'];

    const report = await runRewardsSync(sources);
    return NextResponse.json(report);
  } catch (error) {
    logger.error({ error }, '[FivetranRewards POST]');
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = await getLastSyncStatus();
    if (!status) {
      return NextResponse.json({
        message: 'No rewards sync has run yet. POST /api/fivetran/rewards to trigger one.',
      });
    }
    return NextResponse.json(status);
  } catch (error) {
    logger.error({ error }, '[FivetranRewards GET]');
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
