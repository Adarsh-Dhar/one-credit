// lib/preferences-agent.ts
//
// Two-step Gemini flow for the preferences chatbot:
//   Step 1 — Conversational turn: friendly multi-turn dialogue
//   Step 2 — Extraction turn: focused call that returns a structured JSON diff
//
// The conversational model is the same gemini-2.5-flash used in rum-agent.
// The extraction call uses a strict JSON-only system prompt.

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '@/lib/logger';
import type { IUserPreferences, IPinnedCard } from '@/lib/models/UserPreferences';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PreferenceDiff {
  maxAnnualFeeUsd?: number | null;
  preferCashback?: boolean;
  preferMiles?: boolean;
  preferFinancing?: boolean;
  preferLoungeAccess?: boolean;
  avoidNetworks?: string[];
  carryBalance?: 'yes' | 'sometimes' | 'never' | null;
  pinnedCardsToAdd?: IPinnedCard[];
  pinnedCardsToRemove?: string[];   // matchValues to remove
  excludedCardIdsToAdd?: string[];
  excludedCardIdsToRemove?: string[];
  minSavingsThresholdUsd?: number | null;
  userIntentsToAdd?: string[];      // new natural-language sentences to persist
  userIntentsToRemove?: number[];   // indices to remove (0-based)
  confirmed?: boolean;              // true when user explicitly confirms
  needsClarification?: boolean;     // true when agent is still asking questions
}

export interface ChatTurnResult {
  reply: string;           // streamed to client
  diff: PreferenceDiff;    // applied to DB after confirmation
  confirmed: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL_NAME = 'gemini-2.5-flash';

// ─── Conversational system prompt ────────────────────────────────────────────

function buildConversationalSystemPrompt(
  currentPrefs: Partial<IUserPreferences>,
  walletCards: { displayName: string; cardId: string }[],
): string {
  const activePrefs = summariseActivePrefs(currentPrefs);
  const walletList = walletCards.map(c => `${c.displayName} (id: ${c.cardId})`).join(', ');

  return `
You are the Delphi Preferences Assistant — a concise, friendly AI built into a credit card optimization app.

## YOUR JOB
Help the user configure how the AI agent recommends cards. You collect their preferences through natural conversation, clarify ambiguities, and only apply changes once the user explicitly confirms.

## WALLET CARDS AVAILABLE
The user owns these cards: ${walletList.length > 0 ? walletList : 'none loaded yet'}.
When the user refers to a card by nickname ("my Amex", "the travel card"), always clarify which specific card they mean from this list before proceeding.

## CURRENT ACTIVE PREFERENCES
${activePrefs || 'No preferences set yet.'}

## WHAT YOU CAN CONFIGURE
1. **Pin a card for a category** — "Use Amex Gold for all dining"
2. **Pin a card for a merchant** — "Always use Chase Sapphire on Amazon"
3. **Pin a card for foreign spend** — "Use my travel card internationally"
4. **Exclude a card** — "Stop recommending my HDFC card"
5. **Max annual fee** — "I don't want cards above $150 annual fee"
6. **Prefer cashback** — "I'd rather get cashback than points"
7. **Prefer miles/travel** — "Maximize my airline miles"
8. **Carry balance** — "I sometimes carry a balance, APR matters"
9. **Avoid a network** — "Don't suggest Amex, merchants here don't accept it"
10. **Minimum savings threshold** — "Only suggest switching if I save more than $5"
11. **Remove any existing preference**

## WHAT YOU CANNOT CHANGE
- Earn rate calculations (card-contract facts)
- Category exclusion rules (some cards never earn on certain categories)
- Monthly spend caps on bonus earn
- The underlying math engine — it always runs regardless

## CONVERSATION RULES
- Keep responses SHORT — 2-3 sentences max.
- Ask exactly ONE clarifying question at a time, never stack questions.
- When the user's intent is clear and specific, summarise what you understood and ask "Shall I apply this?" before changing anything.
- Once the user says yes / confirms / approves, end your reply with the exact token: [[CONFIRMED]]
- If the user says something unrelated to card preferences, politely redirect.
- If the user asks to see current preferences, list the active ones from CURRENT ACTIVE PREFERENCES above.
- Never make up card names. Only reference cards from WALLET CARDS AVAILABLE.
`.trim();
}

// ─── Extraction system prompt ─────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `
You are a JSON extractor. Given a conversation between a user and a Delphi Preferences Assistant, extract any preference changes that were confirmed by the user.

Return ONLY a valid JSON object matching this exact schema. No markdown, no preamble:

{
  "maxAnnualFeeUsd": <number | null>,
  "preferCashback": <boolean | null>,
  "preferMiles": <boolean | null>,
  "preferFinancing": <boolean | null>,
  "preferLoungeAccess": <boolean | null>,
  "avoidNetworks": <string[] | null>,
  "carryBalance": <"yes" | "sometimes" | "never" | null>,
  "pinnedCardsToAdd": [
    { "matchType": "merchant|category|foreign", "matchValue": "<string>", "cardId": "<slug>", "cardDisplayName": "<full name>" }
  ],
  "pinnedCardsToRemove": <string[]>,
  "excludedCardIdsToAdd": <string[]>,
  "excludedCardIdsToRemove": <string[]>,
  "minSavingsThresholdUsd": <number | null>,
  "userIntentsToAdd": ["<the user's original intent sentence, cleaned up, as a single string>"],
  "confirmed": <boolean>
}

Rules:
- Only include fields where an explicit change was confirmed.
- "confirmed" is true only if the user said yes/confirmed/approved in their last message.
- For cardId, use the exact card id from the wallet list provided in the conversation (e.g. "card_amex_platinum_01"). Never invent a slug.
- null means "no change to this field". Use an empty array [] to explicitly clear a list.
- For "userIntentsToAdd": include a clean, plain-English sentence summarizing each confirmed preference the user stated. This should read like the user's own words — e.g. "Use Amex Platinum only for airline transactions" or "I want Chase Sapphire points when dining at Nobu". Include one sentence per distinct preference confirmed. If nothing new was confirmed, return an empty array.
- If nothing was confirmed, return { "confirmed": false }.
`.trim();

// ─── Helper: summarise active prefs ──────────────────────────────────────────

function summariseActivePrefs(prefs: Partial<IUserPreferences>): string {
  const lines: string[] = [];
  if (prefs.maxAnnualFeeUsd !== null) {
    lines.push(`• Max annual fee: $${prefs.maxAnnualFeeUsd}`);
  }
  if (prefs.preferCashback) {
    lines.push('• Prefer cashback over points/miles');
  }
  if (prefs.preferMiles) {
    lines.push('• Prefer miles/travel rewards');
  }
  if (prefs.preferFinancing) {
    lines.push('• Prefer 0% APR / financing benefits');
  }
  if (prefs.preferLoungeAccess) {
    lines.push('• Prefer lounge access cards');
  }
  if (prefs.carryBalance) {
    lines.push(`• Carry balance: ${prefs.carryBalance}`);
  }
  if (prefs.avoidNetworks?.length) {
    lines.push(`• Avoid networks: ${prefs.avoidNetworks.join(', ')}`);
  }
  if (prefs.excludedCardIds?.length) {
    lines.push(`• Excluded cards: ${prefs.excludedCardIds.join(', ')}`);
  }
  if (prefs.minSavingsThresholdUsd !== null) {
    lines.push(`• Min savings threshold: $${prefs.minSavingsThresholdUsd}`);
  }
  if (prefs.pinnedCards?.length) {
    for (const pin of prefs.pinnedCards) {
      lines.push(`• Pinned: ${pin.cardDisplayName} for ${pin.matchType} "${pin.matchValue}"`);
    }
  }
  if (prefs.userIntents?.length) {
    lines.push(`\nSAVED INTENT RULES:\n${prefs.userIntents.map((i, n) => `${n+1}. "${i.sentence}"`).join('\n')}`);
  }
  return lines.join('\n');
}

// ─── Main export: single conversational turn ─────────────────────────────────

export async function runPreferencesChatTurn(
  userMessage: string,
  history: ChatMessage[],
  currentPrefs: Partial<IUserPreferences>,
  walletCards: { displayName: string; cardId: string }[],
  geminiApiKey: string,
): Promise<ChatTurnResult> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  // ── Step 1: Conversational turn ───────────────────────────────────────────
  const systemPrompt = buildConversationalSystemPrompt(currentPrefs, walletCards);

  // Build Gemini contents array from history
  const contents = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: msg.content }],
  }));

  // Add system prompt and current message
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am the Delphi Preferences Assistant. How can I help you configure your card preferences?' }],
      },
      ...contents,
    ],
  });

  let result;
  try {
    result = await chat.sendMessage(userMessage);
  } catch (err) {
    logger.error({ err }, '[preferences-agent] Gemini API call failed');
    throw new Error(`Failed to connect to Gemini API: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  const reply = result.response.candidates?.[0]?.content?.parts
    .map((p: { text?: string }) => p.text ?? '')
    .join('') ?? '';

  const confirmed = reply.includes('[[CONFIRMED]]');
  const cleanReply = reply.replace('[[CONFIRMED]]', '').trim();

  // ── Step 2: Extraction turn (only if confirmed) ───────────────────────────
  let diff: PreferenceDiff = { confirmed: false };

  if (confirmed) {
    const fullConversation = [
      ...history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`),
      `User: ${userMessage}`,
      `Assistant: ${cleanReply}`,
    ].join('\n');

    const walletList = walletCards.map(c => `${c.displayName} (id: ${c.cardId})`).join(', ');

    try {
      const extractChat = model.startChat({
        history: [],
      });
      let extractResult;
      try {
        extractResult = await extractChat.sendMessage(
          `${EXTRACTION_SYSTEM_PROMPT}\n\nWallet cards available: ${walletList}\n\nConversation:\n${fullConversation}`
        );
      } catch (apiErr) {
        logger.error({ err: apiErr }, '[preferences-agent] Gemini extraction API call failed');
        throw new Error(`Failed to connect to Gemini API for extraction: ${apiErr instanceof Error ? apiErr.message : 'Unknown error'}`);
      }

      const rawJson = extractResult.response.candidates?.[0]?.content?.parts
        .map((p: { text?: string }) => p.text ?? '')
        .join('') ?? '{}';

      const clean = rawJson.replace(/```json|```/g, '').trim();
      diff = JSON.parse(clean) as PreferenceDiff;
    } catch (err) {
      logger.error({ err }, '[preferences-agent] Extraction failed');
      diff = { confirmed: true };
    }
  }

  return { reply: cleanReply, diff, confirmed };
}

// ─── Helper: apply a confirmed diff to current prefs ─────────────────────────

export function applyDiffToPrefs(
  current: Partial<IUserPreferences>,
  diff: PreferenceDiff,
): Partial<IUserPreferences> {
  const updated = { ...current };

  if (diff.maxAnnualFeeUsd !== undefined) {
    updated.maxAnnualFeeUsd = diff.maxAnnualFeeUsd;
  }
  if (diff.preferCashback !== undefined) {
    updated.preferCashback = diff.preferCashback ?? false;
  }
  if (diff.preferMiles !== undefined) {
    updated.preferMiles = diff.preferMiles ?? false;
  }
  if (diff.preferFinancing !== undefined) {
    updated.preferFinancing = diff.preferFinancing ?? false;
  }
  if (diff.preferLoungeAccess !== undefined) {
    updated.preferLoungeAccess = diff.preferLoungeAccess ?? false;
  }
  if (diff.carryBalance !== undefined) {
    updated.carryBalance = diff.carryBalance;
  }
  if (diff.avoidNetworks !== undefined) {
    updated.avoidNetworks = diff.avoidNetworks ?? [];
  }
  if (diff.minSavingsThresholdUsd !== undefined) {
    updated.minSavingsThresholdUsd = diff.minSavingsThresholdUsd;
  }

  if (diff.pinnedCardsToAdd?.length) {
    updated.pinnedCards = [
      ...(updated.pinnedCards ?? []),
      ...diff.pinnedCardsToAdd,
    ];
  }
  if (diff.pinnedCardsToRemove?.length) {
    updated.pinnedCards = (updated.pinnedCards ?? []).filter(
      p => !diff.pinnedCardsToRemove!.includes(p.matchValue),
    );
  }

  if (diff.excludedCardIdsToAdd?.length) {
    updated.excludedCardIds = [
      ...new Set([...(updated.excludedCardIds ?? []), ...diff.excludedCardIdsToAdd]),
    ];
  }
  if (diff.excludedCardIdsToRemove?.length) {
    updated.excludedCardIds = (updated.excludedCardIds ?? []).filter(
      id => !diff.excludedCardIdsToRemove!.includes(id),
    );
  }

  if (diff.userIntentsToAdd?.length) {
    const newIntents = diff.userIntentsToAdd.map(sentence => ({
      sentence,
      createdAt: new Date(),
    }));
    updated.userIntents = [...(updated.userIntents ?? []), ...newIntents];
  }
  if (diff.userIntentsToRemove?.length) {
    updated.userIntents = (updated.userIntents ?? []).filter(
      (_, i) => !diff.userIntentsToRemove!.includes(i),
    );
  }

  updated.chatSummary = buildChatSummary(updated);
  updated.lastUpdatedViaChat = new Date();

  return updated;
}

function buildChatSummary(prefs: Partial<IUserPreferences>): string {
  const lines: string[] = [];
  if (prefs.maxAnnualFeeUsd !== null) {
    lines.push(`Max annual fee $${prefs.maxAnnualFeeUsd}`);
  }
  if (prefs.preferCashback) {
    lines.push('Prefers cashback');
  }
  if (prefs.preferMiles) {
    lines.push('Prefers miles');
  }
  if (prefs.preferFinancing) {
    lines.push('Prefers 0% APR');
  }
  if (prefs.preferLoungeAccess) {
    lines.push('Prefers lounge access');
  }
  if (prefs.avoidNetworks?.length) {
    lines.push(`Avoid: ${prefs.avoidNetworks.join(', ')}`);
  }
  if (prefs.pinnedCards?.length) {
    lines.push(`${prefs.pinnedCards.length} pinned card rule(s)`);
  }
  if (prefs.excludedCardIds?.length) {
    lines.push(`${prefs.excludedCardIds.length} excluded card(s)`);
  }
  return lines.join('; ');
}
