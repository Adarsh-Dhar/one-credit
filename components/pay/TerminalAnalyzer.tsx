import { useState, useEffect, useRef } from 'react';

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
      { text: '> Connecting to MongoDB cluster...', delay: 400 },
      { text: `> Fetching wallet state for ${userId}...`, delay: 800 },
      { text: `> Found ${cardCount} linked cards. Loading earn rates...`, delay: 1200 },
      { text: '> Triggering Fivetran sync: cardlytics, network, affiliate...', delay: 1600 },
      { text: '> Fivetran sync confirmed. 0ms lag.', delay: 2000 },
      { text: `> Querying rewards offers for "${category}"...`, delay: 2400 },
      { text: `> Searching merchant database for "${merchant}"...`, delay: 2800 },
      { text: '> Found 3 active offers across 2 sources.', delay: 3200 },
      { text: 'RULE: Exclude business cards from personal spend.', color: 'text-cyan-400', delay: 3600 },
      { text: `> Scoring cards by OP/$ yield for ${category.toLowerCase()} category...`, delay: 4000 },
      { text: '> Optimizing for maximum OP return...', delay: 4400 },
      { text: 'Recommendation locked.', color: 'text-yellow-400', delay: 4800 },
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
    <div className="bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Terminal title bar */}
      <div className="bg-slate-800 px-4 py-2 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-slate-400 text-xs ml-2">gemini-agent — zsh</span>
      </div>

      {/* Terminal content */}
      <div
        ref={terminalRef}
        className="bg-black p-4 font-mono text-sm h-80 overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={`mb-1 ${line.color || ''}`}
          >
            {line.text}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-green-400">❯</span>
          <span className="w-2 h-4 bg-green-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
