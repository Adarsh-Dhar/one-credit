// app/api/rum/analyze/route.ts
//
// Unified RUM persona-inference endpoint.
// Replaces both the old /api/ai/analyze and /api/rum/analyze routes — they
// both called runRUMAgent, but one lacked the session guard and neither
// shared the same response shape. Now there is exactly one entry point.
//
// Called by:
//   - /insights page → on-mount auto-fetch AND the "Refresh" button
//   - /api/cron/persona-refresh → scheduled cron job
import { runRUMAgent } from '@/lib/rum-agent';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ratelimit } from '@/lib/rateLimit';
import { UnauthorizedError, ValidationError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';
import { User } from '@/lib/models/User';
import { UserPreferences } from '@/lib/models/UserPreferences';
import connectDB from '@/lib/mongodb';

export async function POST(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email;
    
    if (!userId) {
      throw new UnauthorizedError();
    }

    // Rate-limit per user (prevents hammering from rapid page refreshes)
    const { success } = await ratelimit.limit(userId);
    if (!success) {
      throw new ValidationError('Rate limit exceeded — please wait before refreshing your persona.');
    }

    await connectDB();

    // Fetch user's Gemini API key from database
    const user = await User.findOne({ email: userId });
    const geminiApiKey = user?.geminiApiKey;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please add your API key in Settings.' },
        { status: 400 },
      );
    }

    // ── LOAD USER PREFERENCES and build extractedPrefs ───────────────────
    const savedPrefs = await UserPreferences.findOne({ userId }).lean();
    let extractedPrefs: Record<string, unknown> | undefined;

    if (savedPrefs) {
      extractedPrefs = {};

      if (savedPrefs.maxAnnualFeeUsd !== null) {
        extractedPrefs.maxAnnualFee = savedPrefs.maxAnnualFeeUsd;
      }

      if (savedPrefs.preferCashback) {
        extractedPrefs.preferCashback = true;
      }

      if (savedPrefs.preferMiles) {
        extractedPrefs.preferMiles = true;
      }

      if (savedPrefs.preferFinancing) {
        extractedPrefs.preferFinancing = true;
      }

      if (savedPrefs.preferLoungeAccess) {
        extractedPrefs.preferLoungeAccess = true;
      }

      if (savedPrefs.avoidNetworks?.length) {
        extractedPrefs.avoidNetworks = savedPrefs.avoidNetworks;
      }

      if (savedPrefs.carryBalance) {
        extractedPrefs.carryBalance = savedPrefs.carryBalance;
      }

      if (savedPrefs.excludedCardIds?.length) {
        extractedPrefs.excludedCards = savedPrefs.excludedCardIds;
      }

      if (savedPrefs.pinnedCards?.length) {
        extractedPrefs.pinnedCards = savedPrefs.pinnedCards.map((p: { matchType: string; matchValue: string; cardDisplayName: string }) => ({
          matchType: p.matchType,
          matchValue: p.matchValue,
          cardDisplayName: p.cardDisplayName,
        }));
      }

      // If nothing was actually set, don't pass the empty object
      if (Object.keys(extractedPrefs).length === 0) {
        extractedPrefs = undefined;
      }
    }
    // ── END LOAD PREFERENCES ─────────────────────────────────────────────

    logger.info({ userId, hasPrefs: !!extractedPrefs }, '[rum/analyze] Running RUM persona agent');
    const result = await runRUMAgent(userId, geminiApiKey, extractedPrefs);
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[rum/analyze]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}
