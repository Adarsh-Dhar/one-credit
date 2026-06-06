'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plane, Hotel, Car, ExternalLink } from 'lucide-react';
import { useRUM, useDwellTime } from '@/hooks/useRUM';

interface TransferPartner {
  id: string;
  name: string;
  logo: string;
  category: 'airline' | 'hotel' | 'car';
  transferRatio: string;
  minTransfer: string;
  processingTime: string;
}

const TRANSFER_PARTNERS: TransferPartner[] = [
  // Airlines
  { id: 'delta', name: 'Delta SkyMiles', logo: '✈️', category: 'airline', transferRatio: '1:1', minTransfer: '1,000', processingTime: '1-2 days' },
  { id: 'united', name: 'United MileagePlus', logo: '✈️', category: 'airline', transferRatio: '1:1', minTransfer: '1,000', processingTime: '1-2 days' },
  { id: 'american', name: 'AAdvantage', logo: '✈️', category: 'airline', transferRatio: '1:1', minTransfer: '1,000', processingTime: '1-2 days' },
  { id: 'jetblue', name: 'JetBlue TrueBlue', logo: '✈️', category: 'airline', transferRatio: '1:1', minTransfer: '500', processingTime: '1-2 days' },
  { id: 'southwest', name: 'Southwest Rapid Rewards', logo: '✈️', category: 'airline', transferRatio: '1:1', minTransfer: '500', processingTime: 'Instant' },
  { id: 'british', name: 'British Airways Avios', logo: '✈️', category: 'airline', transferRatio: '1:1', minTransfer: '1,000', processingTime: '1-2 days' },
  { id: 'emirates', name: 'Emirates Skywards', logo: '✈️', category: 'airline', transferRatio: '1:1', minTransfer: '500', processingTime: '2-3 days' },
  { id: 'singapore', name: 'Singapore Airlines KrisFlyer', logo: '✈️', category: 'airline', transferRatio: '1:1', minTransfer: '1,000', processingTime: '1-2 days' },
  // Hotels
  { id: 'marriott', name: 'Marriott Bonvoy', logo: '🏨', category: 'hotel', transferRatio: '3:1', minTransfer: '3,000', processingTime: '2-3 days' },
  { id: 'hilton', name: 'Hilton Honors', logo: '🏨', category: 'hotel', transferRatio: '3:1', minTransfer: '3,000', processingTime: '2-3 days' },
  { id: 'hyatt', name: 'World of Hyatt', logo: '🏨', category: 'hotel', transferRatio: '3:1', minTransfer: '3,000', processingTime: '1-2 days' },
  { id: 'ihg', name: 'IHG One Rewards', logo: '🏨', category: 'hotel', transferRatio: '3:1', minTransfer: '3,000', processingTime: '2-3 days' },
  // Car
  { id: 'hertz', name: 'Hertz Gold Plus Rewards', logo: '🚗', category: 'car', transferRatio: '3:1', minTransfer: '3,000', processingTime: '1-2 days' },
];

export default function TransferPartnersPage() {
  const { trackTabClick, trackTransferPartnerClick } = useRUM();
  const { startDwell, endDwell } = useDwellTime('transferGuides');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'airline' | 'hotel' | 'car'>('all');

  // Track tab click on mount
  useEffect(() => {
    trackTabClick('transfer_partners');
    startDwell();

    return () => {
      endDwell();
    };
  }, [trackTabClick, startDwell, endDwell]);

  const filteredPartners = selectedCategory === 'all'
    ? TRANSFER_PARTNERS
    : TRANSFER_PARTNERS.filter(p => p.category === selectedCategory);

  const handlePartnerClick = (partner: TransferPartner) => {
    trackTransferPartnerClick(partner.name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/cards">
            <Button variant="ghost" className="text-slate-400 hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cards
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Transfer <span className="bg-gradient-to-r from-purple-400 to-yellow-300 bg-clip-text text-transparent">Partners</span>
          </h1>
          <p className="text-slate-400">Maximize your points by transferring to airline and hotel partners</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8" data-tab="transfer_partners">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' ? 'bg-purple-600' : 'border-slate-600 text-slate-300'}
          >
            All Partners
          </Button>
          <Button
            variant={selectedCategory === 'airline' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('airline')}
            className={selectedCategory === 'airline' ? 'bg-purple-600' : 'border-slate-600 text-slate-300'}
          >
            <Plane className="w-4 h-4 mr-2" />
            Airlines
          </Button>
          <Button
            variant={selectedCategory === 'hotel' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('hotel')}
            className={selectedCategory === 'hotel' ? 'bg-purple-600' : 'border-slate-600 text-slate-300'}
          >
            <Hotel className="w-4 h-4 mr-2" />
            Hotels
          </Button>
          <Button
            variant={selectedCategory === 'car' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('car')}
            className={selectedCategory === 'car' ? 'bg-purple-600' : 'border-slate-600 text-slate-300'}
          >
            <Car className="w-4 h-4 mr-2" />
            Car Rentals
          </Button>
        </div>

        {/* Partner Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all cursor-pointer"
              onClick={() => handlePartnerClick(partner)}
              data-partner={partner.name}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{partner.logo}</span>
                  <div>
                    <h3 className="text-white font-semibold">{partner.name}</h3>
                    <span className="text-xs text-slate-400 capitalize">{partner.category}</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Transfer Ratio</span>
                  <span className="text-white font-medium">{partner.transferRatio}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Minimum Transfer</span>
                  <span className="text-white font-medium">{partner.minTransfer} pts</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Processing Time</span>
                  <span className="text-white font-medium">{partner.processingTime}</span>
                </div>
              </div>

              <Button className="w-full mt-4 bg-gradient-to-r from-purple-600 to-yellow-500 text-white text-sm font-bold py-2 rounded-lg hover:from-purple-700 hover:to-yellow-600 transition-all">
                Transfer Points
              </Button>
            </div>
          ))}
        </div>

        {/* Info Banner */}
        <div className="mt-12 bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">💡 Pro Tip</h3>
          <p className="text-slate-300 text-sm">
            Transferring points to airline or hotel partners can often provide 1.5-2x more value than redeeming for cash back. 
            Use our comparison tool to find the best redemption for your travel goals.
          </p>
        </div>
      </main>
    </div>
  );
}
