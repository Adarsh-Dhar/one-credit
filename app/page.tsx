'use client';

import { Navigation } from '@/components/Navigation';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { WalletOverview } from '@/components/dashboard/WalletOverview';
import { CardPortfolioGrid } from '@/components/dashboard/CardPortfolioGrid';
import { IntegrationStatus } from '@/components/dashboard/IntegrationStatus';
import { CoreFlowInfo } from '@/components/dashboard/CoreFlowInfo';
import { useWallet } from '@/hooks/useWallet';

export default function Dashboard() {
  const { wallet, cards, loading } = useWallet();

  return (
    <div className="min-h-screen bg-[#0D0A06]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <DashboardHeader />
        <WalletOverview wallet={wallet} loading={loading} />
        <CardPortfolioGrid cards={cards} loading={loading} />

        <IntegrationStatus />
        <CoreFlowInfo />
      </main>
    </div>
  );
}
