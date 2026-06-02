import { callGeminiWithTools, MCPTools } from '@/lib/mcp-tools';
import { NextResponse } from 'next/server';

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
