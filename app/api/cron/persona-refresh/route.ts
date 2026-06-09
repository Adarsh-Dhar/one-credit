// app/api/cron/persona-refresh/route.ts
//
// Scheduled persona-refresh endpoint.
//
// ─── How the schedule is controlled ────────────────────────────────────────
//
//  On Vercel:  add a cron entry in vercel.json (see below). The schedule is a
//              cron expression set via the PERSONA_CRON_SCHEDULE env var, but
//              Vercel reads it at deploy time from vercel.json, so you also
//              update vercel.json when you change the schedule.
//
//  Self-hosted: run  scripts/cron-persona-refresh.ts  via ts-node / tsx.
//              That script reads PERSONA_CRON_SCHEDULE at runtime and needs
//              no redeploy to change the firing time.
//
// ─── Security ───────────────────────────────────────────────────────────────
//  Vercel automatically passes the CRON_SECRET in the Authorization header.
//  For self-hosted callers, set CRON_SECRET in .env and pass it the same way:
//    Authorization: Bearer <CRON_SECRET>
//
// ─── Environment variables required ─────────────────────────────────────────
//  CRON_SECRET              — shared secret to authenticate the cron caller
//  GOOGLE_API_KEY           — Gemini key (same as the rest of the app)
//  PERSONA_CRON_SCHEDULE    — cron expression, read by the standalone script
//                             (not read here; documented for reference)
//
// ─── vercel.json entry (copy into your vercel.json) ─────────────────────────
//  {
//    "crons": [{
//      "path": "/api/cron/persona-refresh",
//      "schedule": "0 2 * * *"      ← override with PERSONA_CRON_SCHEDULE value
//    }]
//  }

import { NextResponse } from 'next/server';
import { runRUMAgent } from '@/lib/rum-agent';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
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
      logger.warn('[cron/persona-refresh] Unauthorized attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }


  const startedAt = Date.now();
  logger.info('[cron/persona-refresh] Starting persona refresh run');

  try {
    await connectDB();

    // Fetch the oldest-refreshed users first so we make progress across runs
    const users = await User.find({})
      .sort({ updatedAt: 1 })
      .limit(BATCH_SIZE)
      .select('email geminiApiKey')
      .lean();

    if (users.length === 0) {
      logger.info('[cron/persona-refresh] No users found — nothing to do');
      return NextResponse.json({ refreshed: 0, durationMs: Date.now() - startedAt });
    }

    logger.info({ count: users.length }, '[cron/persona-refresh] Processing users');

    // Run agents concurrently in chunks of 5 to avoid hammering Gemini quota
    const CONCURRENCY = 5;
    const results: { userId: string; status: 'ok' | 'error'; persona?: string; error?: string }[] = [];

    for (let i = 0; i < users.length; i += CONCURRENCY) {
      const chunk = users.slice(i, i + CONCURRENCY);

      const chunkResults = await Promise.allSettled(
        chunk.map(async (user) => {
          const userId = user.email as string;
          const userGeminiApiKey = user.geminiApiKey as string | undefined;
          
          // Skip users who haven't configured their API key
          if (!userGeminiApiKey) {
            logger.info({ userId }, '[cron/persona-refresh] Skipping user - no API key configured');
            return { userId, status: 'error' as const, error: 'No API key configured' };
          }
          
          try {
            const result = await runRUMAgent(userId, userGeminiApiKey);
            logger.info({ userId, persona: result.persona.label }, '[cron/persona-refresh] Inferred');
            return { userId, status: 'ok' as const, persona: result.persona.label };
          } catch (err) {
            logger.error({ userId, err }, '[cron/persona-refresh] Agent error');
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

    logger.info({ successCount, errorCount, durationMs }, '[cron/persona-refresh] Run complete');

    return NextResponse.json({
      refreshed: successCount,
      errors: errorCount,
      durationMs,
      results,
    });
  } catch (error) {
    logger.error({ error }, '[cron/persona-refresh] Fatal error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
