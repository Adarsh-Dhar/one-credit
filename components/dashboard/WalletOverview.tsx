interface WalletOverviewProps {
  wallet: number;
  loading: boolean;
}

export function WalletOverview({ wallet, loading }: WalletOverviewProps) {
  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold text-[#E8D8B0] mb-6">Portfolio Value</h2>
      <div className="bg-[#261B0E] border border-[#C5AA67]/30 rounded-lg p-8">
        <p className="text-[#8B8070] text-sm mb-2">Total Balance (USD)</p>
        <div className="flex items-baseline gap-2">
          {loading ? (
            <div className="h-12 w-40 bg-slate-700 rounded animate-pulse" />
          ) : (
            <p className="text-5xl font-bold text-[#C5AA67]">
              ${wallet.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
