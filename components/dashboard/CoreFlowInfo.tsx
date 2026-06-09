import { TrendingUp } from 'lucide-react';

export function CoreFlowInfo() {
  return (
    <section className="bg-[#261B0E]/50 border border-[#3D2E1A] rounded-lg p-8">
      <h3 className="text-2xl font-bold text-[#E8D8B0] mb-4 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-[#DCC98A]" />
        6-Stage Interchange Flow
      </h3>
      <div className="space-y-4 text-[#C4B8A8]">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-[#A8893F] text-[#E8D8B0] flex items-center justify-center shrink-0 font-bold">1</div>
          <div>
            <p className="font-semibold text-[#E8D8B0]">Parse Intent</p>
            <p className="text-sm text-[#8B8070]">Process purchase amount in USD</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-[#A8893F] text-[#E8D8B0] flex items-center justify-center shrink-0 font-bold">2</div>
          <div>
            <p className="font-semibold text-[#E8D8B0]">Fivetran Syncs Rates</p>
            <p className="text-sm text-[#8B8070]">Fresh award charts & exchange rates to MongoDB</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-[#A8893F] text-[#E8D8B0] flex items-center justify-center shrink-0 font-bold">3</div>
          <div>
            <p className="font-semibold text-[#E8D8B0]">Read Balances</p>
            <p className="text-sm text-[#8B8070]">Fetch portfolio balances in USD</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-[#A8893F] text-[#E8D8B0] flex items-center justify-center shrink-0 font-bold">4</div>
          <div>
            <p className="font-semibold text-[#E8D8B0]">Score by Category</p>
            <p className="text-sm text-[#8B8070]">Gemini ranks cards by net cost for user's purchase</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-[#A8893F] text-[#E8D8B0] flex items-center justify-center shrink-0 font-bold">5</div>
          <div>
            <p className="font-semibold text-[#E8D8B0]">Track Rewards</p>
            <p className="text-sm text-[#8B8070]">Calculate earned rewards and update balances</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-[#A8893F] text-[#E8D8B0] flex items-center justify-center shrink-0 font-bold">6</div>
          <div>
            <p className="font-semibold text-[#E8D8B0]">Resync After Redemption</p>
            <p className="text-sm text-[#8B8070]">Fivetran re-syncs affected sources, auto-reconcile</p>
          </div>
        </div>
      </div>
    </section>
  );
}
