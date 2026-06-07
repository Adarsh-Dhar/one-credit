// app/api/cron/intent-refresh/route.ts
//
// Scheduled intent-refresh endpoint.
// Re-runs RUM agent for users with active chat-stated preferences.
//
// ─── Security ───────────────────────────────────────────────────────────────
//  Vercel automatically passes the CRON_SECRET in the Authorization header.
//  For self-hosted callers, set CRON_SECRET in .env and pass it the same way:
//    Authorization: Bearer <CRON_SECRET>
//
// ─── Environment variables required ─────────────────────────────────────────
//  CRON_SECRET              — shared secret to authenticate the cron caller
//  GOOGLE_API_KEY           — Gemini key (same as the rest of the app)

import { NextResponse } from 'next/server';
import { runRUMAgent } from '@/lib/rum-agent';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { UserIntent } from '@/lib/models/UserIntent';
import logger from '@/lib/logger';

// How many users to process in a single cron invocation.
// Keep this low enough to stay within Vercel's 300-second function timeout.
const BATCH_SIZE = parseInt(process.env.PERSONA_CRON_BATCH_SIZE ?? '50', 10);

export async function GET(request: Request) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[cron/intent-refresh] Unauthorized attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const geminiApiKey = process.env.GOOGLE_API_KEY;
  if (!geminiApiKey) {
    logger.error('[cron/intent-refresh] GOOGLE_API_KEY not set');
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const startedAt = Date.now();
  logger.info('[cron/intent-refresh] Starting intent refresh run');

  try {
    await connectDB();

    // Fetch all users
    const users = await User.find({})
      .sort({ updatedAt: 1 })
      .limit(BATCH_SIZE)
      .select('email')
      .lean();

    if (users.length === 0) {
      logger.info('[cron/intent-refresh] No users found — nothing to do');
      return NextResponse.json({ succeeded: 0, failed: 0, durationMs: Date.now() - startedAt });
    }

    logger.info({ count: users.length }, '[cron/intent-refresh] Processing users');

    // Run agents concurrently in chunks of 5 to avoid hammering Gemini quota
    const CONCURRENCY = 5;
    const results: { userId: string; status: 'ok' | 'error'; persona?: string; error?: string }[] = [];

    for (let i = 0; i < users.length; i += CONCURRENCY) {
      const chunk = users.slice(i, i + CONCURRENCY);

      const chunkResults = await Promise.allSettled(
        chunk.map(async (user) => {
          const userId = user.email as string;
          try {
            // Check if user has active intent override
            const intentDoc = await UserIntent.findOne({ userId, activeOverride: true }).lean();
            
            if (!intentDoc) {
              logger.info({ userId }, '[cron/intent-refresh] No active override, skipping');
              return { userId, status: 'ok' as const, persona: 'skipped' };
            }

            const result = await runRUMAgent(userId, geminiApiKey, intentDoc.extractedPrefs);
            logger.info({ userId, persona: result.persona.label }, '[cron/intent-refresh] Inferred with chat preferences');
            return { userId, status: 'ok' as const, persona: result.persona.label };
          } catch (err) {
            logger.error({ userId, err }, '[cron/intent-refresh] Agent error');
            return { userId, status: 'error' as const, error: String(err) };
          }
        }),
      );

      for (const r of chunkResults) {
        results.push(r.status === 'fulfilled' ? r.value : { userId: 'unknown', status: 'error', error: String(r.reason) });
      }

      // Small pause between chunks to respect Gemini rate limits
      if (i + CONCURRENCY < users.length) {
        await new Promise((res) => setTimeout(res, 500));
      }
    }

    const successCount = results.filter((r) => r.status === 'ok').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
    const durationMs = Date.now() - startedAt;

    logger.info({ successCount, errorCount, durationMs }, '[cron/intent-refresh] Run complete');

    return NextResponse.json({
      succeeded: successCount,
      failed: errorCount,
      durationMs,
      results,
    });
  } catch (error) {
    logger.error({ error }, '[cron/intent-refresh] Fatal error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
