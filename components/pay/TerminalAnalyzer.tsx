import { useState, useEffect, useRef } from 'react';

const TERMINAL_CONSTANTS = {
  DELAY_INCREMENT_MS: 400,
  TERMINAL_HEIGHT: 'h-80',
} as const;

interface TerminalLine {
  text: string;
  color?: string;
}

interface AITerminalProps {
  merchant: string;
  category: string;
  userId: string;
  cardCount: number;
}

export function AITerminal({ merchant, category, userId, cardCount }: AITerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const terminalLines: { text: string; color?: string; delay: number }[] = [
      { text: '> Initializing Gemini 2.5 Flash agent...', delay: 0 },
      { text: '> Connecting to MongoDB cluster...', delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS },
      { text: `> Fetching wallet state for ${userId}...`, delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 2 },
      { text: `> Found ${cardCount} linked cards. Loading earn rates...`, delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 3 },
      { text: '> Triggering Fivetran sync: cardlytics, network, affiliate...', delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 4 },
      { text: '> Fivetran sync confirmed. 0ms lag.', delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 5 },
      { text: `> Querying rewards offers for "${category}"...`, delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 6 },
      { text: `> Searching merchant database for "${merchant}"...`, delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 7 },
      { text: '> Found 3 active offers across 2 sources.', delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 8 },
      { text: 'RULE: Exclude business cards from personal spend.', color: 'text-[#4ECDA4]', delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 9 },
      { text: `> Scoring cards by OP/$ yield for ${category.toLowerCase()} category...`, delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 10 },
      { text: '> Optimizing for maximum OP return...', delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 11 },
      { text: 'Recommendation locked.', color: 'text-[#E8A844]', delay: TERMINAL_CONSTANTS.DELAY_INCREMENT_MS * 12 }
    ];

    terminalLines.forEach(({ text, color, delay }) => {
      setTimeout(() => {
        setLines(prev => [...prev, { text, color }]);
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, delay);
    });
  }, [merchant, category, userId, cardCount]);

  return (
    <div className="bg-black rounded-xl overflow-hidden border border-[#3D2E1A] shadow-2xl">
      {/* Terminal title bar */}
      <div className="bg-[#1A1209] px-4 py-2 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-[#E8A844]" />
        <div className="w-3 h-3 rounded-full bg-[#4ECDA4]" />
        <span className="text-[#8B8070] text-xs ml-2">gemini-agent — zsh</span>
      </div>

      {/* Terminal content */}
      <div
        ref={terminalRef}
        className={`bg-black p-4 font-mono text-sm ${TERMINAL_CONSTANTS.TERMINAL_HEIGHT} overflow-y-auto`}
        style={{ scrollBehavior: 'smooth' }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={`mb-1 text-[#C4B8A8] ${line.color || ''}`}
          >
            {line.text}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-[#4ECDA4]">❯</span>
          <span className="w-2 h-4 bg-[#4ECDA4] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
