// app/api/chat/preferences/route.ts
//
// SSE streaming endpoint for the preferences chatbot.
// Streams the assistant reply token-by-token, then fires a final
// 'preferences_saved' event if a confirmed diff was applied to MongoDB.

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@/lib/models/User';
import { UserPreferences } from '@/lib/models/UserPreferences';
import { FiatCard } from '@/lib/models/FiatCard';
import { runPreferencesChatTurn, applyDiffToPrefs } from '@/lib/preferences-agent';
import type { ChatMessage } from '@/lib/preferences-agent';
import { UnauthorizedError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { z } from 'zod';

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(40),
});

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (!userId) {
          throw new UnauthorizedError();
        }

        const body = RequestSchema.parse(await request.json());

        await connectDB();

        // Load user's Gemini API key
        const user = await User.findOne({ email: session?.user?.email });
        if (!user?.geminiApiKey) {
          logger.error({ userId }, '[chat/preferences] No Gemini API key found');
          send('error', { message: 'Gemini API key not configured. Please add it in Settings.' });
          controller.close();
          return;
        }
        logger.info({ userId, hasGeminiKey: !!user.geminiApiKey }, '[chat/preferences] User has Gemini API key');

        // Load current preferences
        const existingPrefs = await UserPreferences.findOne({ userId }) ?? {};

        // Load wallet card names for the agent to reference
        const fiatCards = await FiatCard.find({ user_id: userId }).select('display_name card_id').lean();
        const walletCards = fiatCards.map((c: { display_name: string; card_id: string }) => ({
          displayName: c.display_name,
          cardId: c.card_id,
        }));

        logger.info({ userId, walletCardCount: walletCards.length }, '[chat/preferences] Loaded wallet cards');

        // Run the conversational + extraction turns
        logger.info({ userId, messageLength: body.message.length }, '[chat/preferences] Calling preferences agent');
        let reply: string;
        let diff: any;
        let confirmed: boolean;
        try {
          const result = await runPreferencesChatTurn(
            body.message,
            body.history as ChatMessage[],
            existingPrefs,
            walletCards,
            user.geminiApiKey,
          );
          reply = result.reply;
          diff = result.diff;
          confirmed = result.confirmed;
          logger.info({ userId, replyLength: reply.length, confirmed }, '[chat/preferences] Agent response received');
        } catch (agentError) {
          logger.error({ err: agentError }, '[chat/preferences] Preferences agent error');
          const errorMessage = agentError instanceof Error ? agentError.message : 'Failed to get response from AI agent';
          const isNetworkError = errorMessage.includes('fetch failed') || errorMessage.includes('Failed to connect');
          const userMessage = isNetworkError
            ? 'Unable to connect to Gemini API. Please check your internet connection and API key configuration.'
            : errorMessage;
          send('error', { message: userMessage });
          controller.close();
          return;
        }

        // Stream the reply word by word for a chat feel
        const words = reply.split(' ');
        for (const word of words) {
          send('token', { token: word + ' ' });
          // small delay so it feels streamed, not dumped
          await new Promise(r => setTimeout(r, 18));
        }

        // If confirmed, apply diff and persist
        if (confirmed && diff.confirmed) {
          const updatedPrefs = applyDiffToPrefs(existingPrefs, diff);

          await UserPreferences.findOneAndUpdate(
            { userId },
            { $set: { ...updatedPrefs, userId } },
            { upsert: true, new: true },
          );

          logger.info({ userId, diff, userIntentsCount: updatedPrefs.userIntents?.length ?? 0 }, '[chat/preferences] Preferences stored in database');
          send('preferences_saved', { preferences: updatedPrefs });
        }

        send('done', { confirmed });
      } catch (err) {
        logger.error({ err }, '[chat/preferences] Error');
        const { error } = toErrorResponse(err);
        send('error', { message: error.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// GET: return current preferences for a user (used to populate ActiveRules panel)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      throw new UnauthorizedError();
    }

    await connectDB();
    const prefs = await UserPreferences.findOne({ userId }).lean();
    return Response.json({ preferences: prefs ?? null });
  } catch (err) {
    const { error, status } = toErrorResponse(err);
    return Response.json(error, { status });
  }
}

// DELETE: clear a single preference field or all preferences
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { field } = await request.json().catch(() => ({ field: 'all' }));

    await connectDB();

    if (field === 'all') {
      await UserPreferences.deleteOne({ userId });
    } else {
      // Handle intent:N deletions (remove array element by index)
      if (field.startsWith('intent:')) {
        const idx = parseInt(field.split(':')[1], 10);
        await UserPreferences.updateOne(
          { userId },
          { $unset: { [`userIntents.${idx}`]: 1 } }
        );
        await UserPreferences.updateOne(
          { userId },
          { $pull: { userIntents: null } }
        );
      } else {
        // Clear a specific field back to its default
        const fieldDefaults: Record<string, unknown> = {
          maxAnnualFeeUsd: null,
          preferCashback: false,
          preferMiles: false,
          preferFinancing: false,
          preferLoungeAccess: false,
          avoidNetworks: [],
          carryBalance: null,
          pinnedCards: [],
          excludedCardIds: [],
          minSavingsThresholdUsd: null,
          userIntents: [],
        };
        if (field in fieldDefaults) {
          await UserPreferences.updateOne({ userId }, { $set: { [field]: fieldDefaults[field] } });
        }
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    const { error, status } = toErrorResponse(err);
    return Response.json(error, { status });
  }
}
