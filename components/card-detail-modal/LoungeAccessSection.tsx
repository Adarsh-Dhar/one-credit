import { Armchair } from 'lucide-react';

interface LoungeAccessSectionProps {
  loungeSectionRef: React.RefObject<HTMLDivElement | null>;
}

export function LoungeAccessSection({ loungeSectionRef }: LoungeAccessSectionProps) {
  return (
    <div ref={loungeSectionRef as React.RefObject<HTMLDivElement>} className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/30" data-section="lounge-details">
      <div className="flex items-center gap-2 mb-3">
        <Armchair className="w-5 h-5 text-purple-400" />
        <h4 className="text-lg font-semibold text-white">Lounge Access</h4>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Priority Pass</span>
          <span className="text-white font-medium">Included</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Centurion Lounge</span>
          <span className="text-white font-medium">Included</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Guests</span>
          <span className="text-white font-medium">2 per visit</span>
        </div>
        <p className="text-slate-400 text-xs mt-2">
          Access to 1,400+ lounges worldwide with complimentary food, beverages, and Wi-Fi.
        </p>
      </div>
    </div>
  );
}
