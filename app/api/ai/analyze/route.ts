import { runRUMAgent } from '@/lib/rum-agent';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';
import { ratelimit } from '@/lib/rateLimit';
import { UnauthorizedError, ValidationError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';

// Zod schema for request validation
const AnalyzeSchema = z.object({
  userId: z.string().optional(),
  apiKey: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Validate request body with Zod
    const parsed = AnalyzeSchema.safeParse(await request.json())
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', { details: parsed.error.flatten() })
    }

    const { userId, apiKey } = parsed.data;

    // Prefer server-side env key; fall back to user-supplied key for dev
    const resolvedKey = process.env.GOOGLE_API_KEY || apiKey;

    if (!resolvedKey) {
      return NextResponse.json({ error: 'Gemini API key required' }, { status: 400 });
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    // Check rate limit using session user ID
    const { success } = await ratelimit.limit(session.user.id);
    if (!success) {
      throw new ValidationError('Rate limit exceeded');
    }

    // Run the RUM persona agent
    const result = await runRUMAgent(userId || session.user.id, resolvedKey);

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[analyze]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}
