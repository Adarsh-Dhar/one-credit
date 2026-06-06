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

    // Check rate limit using session user ID
    const { success } = await ratelimit.limit(userId);
    if (!success) {
      throw new ValidationError('Rate limit exceeded');
    }

    const geminiApiKey = process.env.GOOGLE_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API key required' }, { status: 400 });
    }

    const result = await runRUMAgent(userId, geminiApiKey);
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[rum/analyze]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}
