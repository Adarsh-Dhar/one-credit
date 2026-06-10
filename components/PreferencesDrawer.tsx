// components/PreferencesDrawer.tsx
//
// Floating chat drawer for the preferences chatbot.
// Reads and writes via /api/chat/preferences SSE endpoint.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IUserPreferences, IPinnedCard } from '@/lib/models/UserPreferences';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ActiveRulesBadgeProps {
  prefs: Partial<IUserPreferences> | null;
  onClear: (field: string) => void;
}

function ActiveRulesPanel({ prefs, onClear }: ActiveRulesBadgeProps) {
  const rules: { label: string; field: string }[] = [];

  if (prefs && prefs.maxAnnualFeeUsd !== null && prefs.maxAnnualFeeUsd !== undefined) {
    rules.push({ label: `Max annual fee: $${prefs.maxAnnualFeeUsd}`, field: 'maxAnnualFeeUsd' });
  }
  if (prefs?.preferCashback) {
    rules.push({ label: 'Prefer cashback', field: 'preferCashback' });
  }
  if (prefs?.preferMiles) {
    rules.push({ label: 'Prefer miles', field: 'preferMiles' });
  }
  if (prefs?.preferFinancing) {
    rules.push({ label: 'Prefer 0% APR', field: 'preferFinancing' });
  }
  if (prefs?.preferLoungeAccess) {
    rules.push({ label: 'Prefer lounge access', field: 'preferLoungeAccess' });
  }
  if (prefs?.carryBalance) {
    rules.push({ label: `Carry balance: ${prefs.carryBalance}`, field: 'carryBalance' });
  }
  if (prefs?.avoidNetworks?.length) {
    rules.push({ label: `Avoid: ${prefs.avoidNetworks.join(', ')}`, field: 'avoidNetworks' });
  }
  if (prefs && prefs.minSavingsThresholdUsd !== null && prefs.minSavingsThresholdUsd !== undefined) {
    rules.push({ label: `Min savings: $${prefs.minSavingsThresholdUsd}`, field: 'minSavingsThresholdUsd' });
  }
  (prefs?.pinnedCards ?? []).forEach((pin: IPinnedCard) => {
    rules.push({
      label: `${pin.cardDisplayName} → ${pin.matchType} "${pin.matchValue}"`,
      field: `pin:${pin.matchValue}`,
    });
  });
  (prefs?.excludedCardIds ?? []).forEach((id: string) => {
    rules.push({ label: `Excluded: ${id}`, field: `exclude:${id}` });
  });

  if (rules.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-[#3D2E1A] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#C5AA67] uppercase tracking-wider">
          Active Rules
        </span>
        <button
          onClick={() => onClear('all')}
          className="text-xs text-[#8B8070] hover:text-[#C0392B] flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rules.map(rule => (
          <span
            key={rule.field}
            className="inline-flex items-center gap-1 text-xs bg-[#261B0E] text-[#E8D8B0] border border-[#3D2E1A] rounded-full px-2 py-0.5"
          >
            {rule.label}
            <button
              onClick={() => onClear(rule.field)}
              className="text-[#8B8070] hover:text-[#C0392B] ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function PreferencesDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your Delphi Preferences Assistant. Tell me how you'd like to use your cards — for example, \"always use my Amex Gold for dining\" or \"I prefer cashback over points\".",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<Partial<IUserPreferences> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load current preferences on open
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    fetch('/api/chat/preferences')
      .then(r => r.json())
      .then(d => setPrefs(d.preferences))
      .catch(() => null);
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    // Add a placeholder for the assistant reply
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          // Send history EXCLUDING the placeholder we just added
          history: updatedHistory.slice(1), // remove initial greeting from history
        }),
      });

      if (!res.body) {
        throw new Error('No stream');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assembledReply = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            continue;
          }
          if (!line.startsWith('data: ')) {
            continue;
          }

          try {
            const payload = JSON.parse(line.slice(6));

            if ('token' in payload) {
              assembledReply += payload.token;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: assembledReply };
                return next;
              });
            }

            if ('preferences' in payload) {
              setPrefs(payload.preferences);
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err) {
      console.error('[PreferencesDrawer] Error:', err);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: err instanceof Error ? `Error: ${err.message}` : 'Sorry, something went wrong. Please try again.',
        };
        return next;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearPreference = async (field: string) => {
    await fetch('/api/chat/preferences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    // Reload prefs
    const res = await fetch('/api/chat/preferences');
    const d = await res.json();
    setPrefs(d.preferences);
  };

  const rulesCount =
    (prefs?.pinnedCards?.length ?? 0) +
    (prefs?.excludedCardIds?.length ?? 0) +
    (prefs?.maxAnnualFeeUsd !== null ? 1 : 0) +
    (prefs?.preferCashback ? 1 : 0) +
    (prefs?.preferMiles ? 1 : 0) +
    (prefs?.preferFinancing ? 1 : 0) +
    (prefs?.preferLoungeAccess ? 1 : 0) +
    (prefs?.avoidNetworks?.length ?? 0) +
    (prefs?.carryBalance ? 1 : 0) +
    (prefs?.minSavingsThresholdUsd !== null ? 1 : 0);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] rounded-full px-4 py-3 shadow-lg transition-all font-medium text-sm"
        aria-label="Open preferences"
      >
        <MessageCircle className="w-4 h-4" />
        Preferences
        {rulesCount > 0 && (
          <span className="bg-[#0D0A06] text-[#C5AA67] text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {rulesCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-[#1A1209] border border-[#3D2E1A] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 6rem)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#3D2E1A] bg-[#0D0A06]/60">
            <div>
              <h3 className="text-[#E8D8B0] font-semibold text-sm">Card Preferences</h3>
              <p className="text-[#8B8070] text-xs">Configure how the AI agent recommends cards</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#8B8070] hover:text-[#E8D8B0] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active rules toggle */}
          {rulesCount > 0 && (
            <button
              onClick={() => setShowRules(r => !r)}
              className="flex items-center justify-between px-4 py-2 bg-[#261B0E]/40 border-b border-[#3D2E1A] text-xs text-[#C5AA67] hover:bg-[#261B0E]/70 transition-colors"
            >
              <span>{rulesCount} active rule{rulesCount !== 1 ? 's' : ''}</span>
              {showRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {showRules && (
            <ActiveRulesPanel prefs={prefs} onClear={clearPreference} />
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#C5AA67] text-[#0D0A06] rounded-br-sm'
                      : 'bg-[#261B0E] text-[#E8D8B0] border border-[#3D2E1A] rounded-bl-sm'
                  }`}
                >
                  {msg.content || (
                    <span className="flex items-center gap-1 text-[#8B8070]">
                      <Loader2 className="w-3 h-3 animate-spin" /> thinking…
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#3D2E1A] px-4 py-3 flex gap-2 bg-[#0D0A06]/40">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="e.g. Always use Amex Gold for dining…"
              className="flex-1 bg-[#261B0E] border border-[#3D2E1A] rounded-xl px-3 py-2 text-sm text-[#E8D8B0] placeholder-[#8B8070] focus:outline-none focus:border-[#C5AA67] disabled:opacity-50"
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] rounded-xl px-4 text-sm font-medium disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
