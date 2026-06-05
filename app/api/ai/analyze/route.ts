import { callGeminiWithTools, MCPTools } from '@/lib/mcp-tools';
import { NextResponse } from 'next/server';

// In-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId) || { count: 0, resetTime: now + RATE_WINDOW };

  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + RATE_WINDOW;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  rateLimiter.set(userId, userLimit);
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, apiKey } = body;

    // Prefer server-side env key; fall back to user-supplied key for dev
    const resolvedKey = process.env.GOOGLE_API_KEY || apiKey;

    if (!resolvedKey) {
      return NextResponse.json({ error: 'Gemini API key required' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    // Check rate limit using API key as identifier
    if (!checkRateLimit(resolvedKey)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const result = await callGeminiWithTools(resolvedKey, prompt, MCPTools);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[analyze]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to call Gemini' },
      { status: 500 }
    );
  }
}
