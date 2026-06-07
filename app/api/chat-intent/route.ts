// app/api/chat-intent/route.ts
//
// Chat-based user intent extraction API.
// Allows users to state preferences via conversation, which override RUM-inferred personas.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import { UserIntent, type ChatMessage } from '@/lib/models/UserIntent';
import { extractUserIntent } from '@/lib/gemini-intent';
import { runRUMAgent } from '@/lib/rum-agent';
import { UnauthorizedError, ValidationError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';
import { ratelimit } from '@/lib/rateLimit';
import { GoogleGenerativeAI } from '@google/generative-ai';

// GET: Retrieve user's chat intent history and extracted preferences
export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    await connectDB();

    const intentDoc = await UserIntent.findOne({ userId: session.user.email }).lean();

    if (!intentDoc) {
      return NextResponse.json({
        messages: [],
        extractedPrefs: null,
        activeOverride: false,
      });
    }

    return NextResponse.json({
      messages: intentDoc.messages || [],
      extractedPrefs: intentDoc.extractedPrefs || null,
      activeOverride: intentDoc.activeOverride || false,
    });
  } catch (error) {
    logger.error({ error }, '[chat-intent GET]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}

// POST: Send a message, get assistant reply, and extract preferences
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    // Rate limiting
    const { success } = await ratelimit.limit(session.user.email);
    if (!success) {
      throw new ValidationError('Rate limit exceeded');
    }

    const body = await request.json();
    const { message } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      throw new ValidationError('Message is required');
    }
    if (message.length > 2000) {
      throw new ValidationError('Message must be at most 2000 characters');
    }

    await connectDB();

    const userId = session.user.email;
    const geminiApiKey = process.env.GOOGLE_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    // Fetch existing intent doc
    const intentDoc = await UserIntent.findOne({ userId });
    const messages: ChatMessage[] = intentDoc?.messages || [];

    // Append user message
    messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Generate assistant reply using Gemini (no tools)
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const chatHistory = messages.slice(-12).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    // Append assistant reply
    messages.push({
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
    });

    // Extract preferences from updated history
    const extractedPrefs = await extractUserIntent(messages, geminiApiKey, userId);

    // Determine if override should be active (meaningful data extracted)
    const hasMeaningfulData =
      extractedPrefs.mustHaveFeatures.length > 0 ||
      extractedPrefs.avoidNetworks.length > 0 ||
      extractedPrefs.maxAnnualFee !== undefined ||
      extractedPrefs.spendGoal !== undefined ||
      extractedPrefs.budgetAmount !== undefined ||
      extractedPrefs.rawStatement.length > 0;

    const activeOverride = hasMeaningfulData;

    // Upsert intent document
    await UserIntent.findOneAndUpdate(
      { userId },
      {
        $set: {
          messages,
          extractedPrefs,
          activeOverride,
        },
      },
      { upsert: true, new: true }
    );

    // Conditionally re-run RUM agent if meaningful preferences were extracted
    let updatedPersona = null;
    if (activeOverride) {
      try {
        const rumResult = await runRUMAgent(userId, geminiApiKey, extractedPrefs);
        updatedPersona = rumResult.persona;
        logger.info({ userId, persona: updatedPersona.label }, '[chat-intent] RUM agent re-run with chat preferences');
      } catch (err) {
        logger.error({ err, userId }, '[chat-intent] RUM agent re-run failed (non-blocking)');
      }
    }

    return NextResponse.json({
      reply,
      extractedPrefs,
      activeOverride,
      updatedPersona,
    });
  } catch (error) {
    logger.error({ error }, '[chat-intent POST]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}

// DELETE: Deactivate the intent override
export async function DELETE(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    await connectDB();

    await UserIntent.findOneAndUpdate(
      { userId: session.user.email },
      { $set: { activeOverride: false } }
    );

    logger.info({ userId: session.user.email }, '[chat-intent] Intent override deactivated');

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, '[chat-intent DELETE]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}
