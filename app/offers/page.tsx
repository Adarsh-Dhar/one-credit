'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';
import { useRUM, useDwellTime, useScrollDepth } from '@/hooks/useRUM';

interface RotatingCategory {
  id: string;
  name: string;
  icon: string;
  multiplier: string;
  quarterlyCap: string;
  activationRequired: boolean;
  activated: boolean;
  expires: string;
}

const ROTATING_CATEGORIES: RotatingCategory[] = [
  {
    id: 'q1-grocery',
    name: 'Grocery Stores',
    icon: '🛒',
    multiplier: '5%',
    quarterlyCap: '$1,500',
    activationRequired: true,
    activated: false,
    expires: 'March 31, 2026',
  },
  {
    id: 'q1-gas',
    name: 'Gas Stations',
    icon: '⛽',
    multiplier: '5%',
    quarterlyCap: '$1,500',
    activationRequired: true,
    activated: false,
    expires: 'March 31, 2026',
  },
  {
    id: 'q1-dining',
    name: 'Dining',
    icon: '🍽️',
    multiplier: '4%',
    quarterlyCap: '$1,000',
    activationRequired: false,
    activated: true,
    expires: 'March 31, 2026',
  },
  {
    id: 'q1-streaming',
    name: 'Streaming Services',
    icon: '📺',
    multiplier: '3%',
    quarterlyCap: '$500',
    activationRequired: false,
    activated: true,
    expires: 'March 31, 2026',
  },
];

export default function OffersPage() {
  const { trackTabClick, trackCardView } = useRUM();
  const { startDwell, endDwell } = useDwellTime('offers');
  const { startTracking: startScrollTracking, stopTracking: stopScrollTracking } = useScrollDepth([25, 50, 75, 90, 100]);
  const [categories, setCategories] = useState(ROTATING_CATEGORIES);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const { trackEvent } = useRUM();

  // Track tab click on mount
  useEffect(() => {
    trackTabClick('offers');
    startDwell();
    startScrollTracking();

    return () => {
      endDwell();
      stopScrollTracking();
      // Track abandonment if activation was in progress
      if (activatingId) {
        trackEvent('abandoned_rotating_activation');
      }
    };
  }, [trackTabClick, startDwell, endDwell, startScrollTracking, stopScrollTracking, activatingId, trackEvent]);

  const handleActivate = async (categoryId: string) => {
    // Track category view
    trackCardView(categoryId);

    setActivatingId(categoryId);
    
    // Simulate activation API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId ? { ...cat, activated: true } : cat
      )
    );
    setActivatingId(null);
  };

  return (
    <div className="min-h-screen bg-[#0D0A06]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E8D8B0] mb-2">
            Quarterly <span className="text-[#C5AA67]">Offers</span>
          </h1>
          <p className="text-[#8B8070]">Activate rotating categories to maximize your rewards</p>
        </div>

        {/* Quarter Info Banner */}
        <div className="bg-[#261B0E] border border-[#C5AA67]/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-[#E8A844]" />
            <span className="text-[#E8D8B0] font-semibold">Q1 2026 (January - March)</span>
          </div>
          <p className="text-[#C4B8A8] text-sm">
            Activate your quarterly categories before the end of the quarter to earn bonus rewards on eligible purchases.
          </p>
        </div>

        {/* Rotating Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`bg-[#1A1209] border rounded-xl p-6 transition-all ${
                category.activated 
                  ? 'border-[#4ECDA4]/50 shadow-[0_0_20px_rgba(78,205,164,0.2)]' 
                  : 'border-[#3D2E1A]'
              }`}
              data-section="rotating-category"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{category.icon}</span>
                  <div>
                    <h3 className="text-[#E8D8B0] font-semibold">{category.name}</h3>
                    <span className="text-xs text-[#8B8070]">Expires: {category.expires}</span>
                  </div>
                </div>
                {category.activated ? (
                  <CheckCircle2 className="w-6 h-6 text-[#4ECDA4]" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-[#E8A844]" />
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8B8070]">Bonus Rate</span>
                  <span className="text-[#E8D8B0] font-bold">{category.multiplier}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8B8070]">Quarterly Cap</span>
                  <span className="text-[#E8D8B0] font-medium">{category.quarterlyCap}</span>
                </div>
              </div>

              {category.activationRequired && !category.activated && (
                <div className="bg-[#E8A844]/10 border border-[#E8A844]/30 rounded-lg p-3 mb-4">
                  <p className="text-[#DCC98A] text-xs">
                    ⚠️ Activation required to earn bonus rewards
                  </p>
                </div>
              )}

              {category.activated ? (
                <div className="bg-[#4ECDA4]/10 border border-[#4ECDA4]/30 rounded-lg p-3">
                  <p className="text-[#85DFC2] text-sm font-medium">
                    ✓ Activated - You're earning bonus rewards!
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => handleActivate(category.id)}
                  disabled={activatingId === category.id}
                  className="w-full bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                  data-action="activate-category"
                >
                  {activatingId === category.id ? (
                    'Activating...'
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Activate Category
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Tips Section */}
        <div className="bg-[#1A1209] border border-[#3D2E1A] rounded-xl p-6">
          <h3 className="text-lg font-bold text-[#E8D8B0] mb-4">💡 Tips for Maximizing Rewards</h3>
          <ul className="space-y-3 text-[#C4B8A8] text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#C5AA67] mt-1">•</span>
              <span>Activate categories early in the quarter to avoid missing out on bonus rewards</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C5AA67] mt-1">•</span>
              <span>Track your spending towards the quarterly cap to optimize your card usage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C5AA67] mt-1">•</span>
              <span>Use Omni-Wallet's Pay feature to automatically route purchases to your best card</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C5AA67] mt-1">•</span>
              <span>Set reminders to activate new categories at the start of each quarter</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
