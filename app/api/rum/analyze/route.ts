// app/api/rum/analyze/route.ts
//
// Unified RUM persona-inference endpoint.
// Replaces both the old /api/ai/analyze and /api/rum/analyze routes — they
// both called runRUMAgent, but one lacked the session guard and neither
// shared the same response shape. Now there is exactly one entry point.
//
// Called by:
//   - /cards page  → "Calculate Best Card" button
//   - /insights page → on-mount auto-fetch AND the "Refresh" button
//   - /api/cron/persona-refresh → scheduled cron job
import { runRUMAgent } from '@/lib/rum-agent';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ratelimit } from '@/lib/rateLimit';
import { UnauthorizedError, ValidationError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';

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

    const geminiApiKey = process.env.GOOGLE_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured on the server.' },
        { status: 500 },
      );
    }

    logger.info({ userId }, '[rum/analyze] Running RUM persona agent');
    const result = await runRUMAgent(userId, geminiApiKey);
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[rum/analyze]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}
