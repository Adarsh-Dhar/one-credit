// lib/gemini-intent.ts
//
// Gemini-powered user intent extraction from chat conversations.
// Extracts structured preferences from chat history for persona override.

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '@/lib/logger';
import type { ChatMessage, ExtractedPrefs } from '@/lib/models/UserIntent';

// ─── Dynatrace config (from rum-agent.ts) ─────────────────────────────────────

const DT_ENV_URL = process.env.DT_ENV_URL ?? '';
const DT_API_TOKEN = process.env.DT_API_TOKEN ?? '';

const IS_PLATFORM_URL = DT_ENV_URL.includes('.apps.dynatrace.com');
const IS_API_TOKEN = DT_API_TOKEN.startsWith('dt0c01.');
const SHOULD_USE_DT = !IS_PLATFORM_URL || !IS_API_TOKEN;
const AUTH_SCHEME = IS_PLATFORM_URL ? 'Bearer' : 'Api-Token';

// ─── logIntentToDynatrace ───────────────────────────────────────────────────────

async function logIntentToDynatrace(
  userId: string,
  prefs: ExtractedPrefs,
): Promise<void> {
  if (!DT_ENV_URL || !DT_API_TOKEN || !SHOULD_USE_DT) {
    logger.info({ userId }, '[gemini-intent] DT not configured — skipping intent log');
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    content: JSON.stringify({
      event: 'persona.chat.intent_stated',
      userId,
      extractedPrefs: prefs,
    }),
    'log.source': 'one-credit',
    'service.name': 'gemini-intent',
    severity: 'INFO',
    'user.id': userId,
    source: 'chat_override',
    intentOverrideActive: true,
  };

  try {
    await fetch(`${DT_ENV_URL}/api/v2/logs/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `${AUTH_SCHEME} ${DT_API_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify([logEntry]),
    });

    logger.info({ userId }, '[gemini-intent] Intent logged to Dynatrace');
  } catch (err) {
    logger.error({ err, userId }, '[gemini-intent] DT log ingest failed (fire-and-forget)');
  }
}

// ─── extractUserIntent ─────────────────────────────────────────────────────────

export async function extractUserIntent(
  messages: ChatMessage[],
  geminiApiKey: string,
  userId: string,
): Promise<ExtractedPrefs> {
  // Take last 12 messages for context
  const recentMessages = messages.slice(-12);

  const prompt = `Given this conversation, extract structured preferences. Return ONLY JSON with keys: maxAnnualFee, spendGoal, mustHaveFeatures, avoidNetworks, budgetAmount, rawStatement.

Conversation:
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Strip markdown fences
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as ExtractedPrefs;

    // Log successful extraction to Dynatrace
    await logIntentToDynatrace(userId, parsed);

    return parsed;
  } catch (err) {
    logger.error({ err, userId }, '[gemini-intent] Extraction failed, returning safe default');
    
    // Safe empty default - never throws
    return {
      mustHaveFeatures: [],
      avoidNetworks: [],
      rawStatement: '',
    };
  }
}
