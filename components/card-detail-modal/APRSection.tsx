import { TrendingUp } from 'lucide-react';

interface APRSectionProps {
  aprSectionRef: React.RefObject<HTMLDivElement | null>;
}

export function APRSection({ aprSectionRef }: APRSectionProps) {
  return (
    <div ref={aprSectionRef as React.RefObject<HTMLDivElement>} className="bg-slate-700/50 rounded-lg p-4 border border-yellow-500/30" data-section="apr-financing">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-yellow-400" />
        <h4 className="text-lg font-semibold text-white">APR & Financing</h4>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Purchase APR</span>
          <span className="text-white font-medium">18.49% - 28.49% Variable</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Balance Transfer APR</span>
          <span className="text-white font-medium">18.49% - 28.49% Variable</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Cash Advance APR</span>
          <span className="text-white font-medium">29.49% Variable</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Intro APR</span>
          <span className="text-white font-medium">0% for 15 months</span>
        </div>
        <p className="text-slate-400 text-xs mt-2">
          0% intro APR on purchases and balance transfers for 15 months. After that, variable APR applies.
        </p>
      </div>
    </div>
  );
}
