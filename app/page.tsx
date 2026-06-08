'use client';

import { useState, useEffect, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { CardDetailModal } from '@/components/CardDetailModal';
import { Sparkles, DollarSign, TrendingUp, Calculator } from 'lucide-react';
import Link from 'next/link';
import { CardDefinition } from '@/lib/cards';
import { useWallet } from '@/hooks/useWallet';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { wallet, cards, loading, session } = useWallet();
  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);

  const maxValue = useMemo(() => Math.max(...cards.map(c => c.value || 0)), [cards]);

  const handleCardClick = async (card: any) => {
    setSelectedCard(card);
    const email = session?.user?.email;
    if (!email) {
      return;
    }
    try {
      const response = await fetch(`/api/fiat-cards?userId=${encodeURIComponent(email)}`);
      const data = await response.json();
      const fullCard = data.cards.find((c: any) => c.card_id === card.key);
      setCardDetails(fullCard);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to fetch card details',
        variant: 'destructive',
      });
    }
  };

  const closeCardDetails = () => {
    setSelectedCard(null);
    setCardDetails(null);
  };

  const handleCalculateBestCard = () => {
    window.location.href = '/pay';
  };

  // Scroll lock for modal
  useEffect(() => {
    if (selectedCard && cardDetails) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [selectedCard, cardDetails]);

  return (
    <div className="min-h-screen bg-[#0D0A06]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#E8D8B0] mb-4">
            Welcome to <span className="text-[#C5AA67]">Omni-Wallet</span>
          </h1>
          <p className="text-xl text-[#8B8070] mb-6">
            AI-powered portfolio management with Fivetran data synchronization
          </p>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleCalculateBestCard} className="bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] border-0">
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Best Card
            </Button>
            <Link href="/pay">
              <Button variant="outline" className="border-[#C5AA67]/40 text-[#C5AA67] hover:bg-[#C5AA67]/10">
                <Sparkles className="w-4 h-4 mr-2" />
                Test Interchange
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="border-[#C5AA67]/40 text-[#C5AA67] hover:bg-[#C5AA67]/10">
                <DollarSign className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </Link>
          </div>
        </div>

        {/* Wallet Overview */}
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

        {/* Card Portfolio Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#E8D8B0] mb-6">Your Linked Cards</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#1A1209]/80 border border-[#3D2E1A] rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-[#261B0E] rounded w-3/4 mb-4" />
                  <div className="h-3 bg-[#261B0E] rounded w-1/2 mb-2" />
                  <div className="h-3 bg-[#261B0E] rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card) => {
                const isTopCard = card.value === maxValue;
                return (
                  <TiltCard
                    key={card.key}
                    card={card}
                    isTopCard={isTopCard}
                    onClick={() => handleCardClick(card)}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Card Details Modal */}
        {selectedCard && cardDetails && (
          <CardDetailModal
            selectedCard={selectedCard}
            cardDetails={cardDetails}
            onClose={closeCardDetails}
          />
        )}

        {/* Integration Status */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-[#261B0E]/80 border border-[#3D2E1A] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[#4ECDA4] rounded-full"></div>
              <p className="text-[#8B8070] text-sm">Fivetran</p>
            </div>
            <p className="text-xl font-bold text-[#E8D8B0]">Data Sync</p>
            <p className="text-[#6B5E52] text-xs mt-2">Live rates & balances</p>
          </div>

          <div className="bg-[#261B0E]/80 border border-[#3D2E1A] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[#4ECDA4] rounded-full"></div>
              <p className="text-[#8B8070] text-sm">MongoDB</p>
            </div>
            <p className="text-xl font-bold text-[#E8D8B0]">Data Store</p>
            <p className="text-[#6B5E52] text-xs mt-2">Portfolio persistence</p>
          </div>

          <div className="bg-[#261B0E]/80 border border-[#3D2E1A] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[#4ECDA4] rounded-full"></div>
              <p className="text-[#8B8070] text-sm">Gemini AI</p>
            </div>
            <p className="text-xl font-bold text-[#E8D8B0]">Optimization</p>
            <p className="text-[#6B5E52] text-xs mt-2">Smart allocation</p>
          </div>
        </section>

        {/* Core Flow Info */}
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
      </main>
    </div>
  );
}

function TiltCard({ card, isTopCard, onClick }: {
  card: any;
  isTopCard: boolean;
  onClick: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

  const shineX = useTransform(mouseX, [-0.5, 0.5], ['50%', '0%']);
  const shineY = useTransform(mouseY, [-0.5, 0.5], ['50%', '0%']);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = (e.clientX - rect.left) / width - 0.5;
    const mouseYVal = (e.clientY - rect.top) / height - 0.5;
    x.set(mouseXVal);
    y.set(mouseYVal);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  // Get top 3 earn rates
  const earnRates = card.earnRates ? Object.entries(card.earnRates)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3) : [];

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="relative cursor-pointer"
    >
      {/* Gradient border for top card */}
      {isTopCard && (
        <div
          className="absolute inset-0 rounded-xl blur-md opacity-70"
          style={{
            background: 'linear-gradient(45deg, #C5AA67, #4ECDA4, #C5AA67)',
            backgroundSize: '300% 300%',
            animation: 'gradientShift 3s ease infinite',
          }}
        />
      )}

      {/* Card content */}
      <motion.div
        className="relative bg-[#1A1209] border border-[#3D2E1A] rounded-xl p-6 overflow-hidden"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'translateZ(20px)',
        }}
      >
        {/* Specular highlight */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at var(--shine-x) var(--shine-y), rgba(255,255,255,0.15) 0%, transparent 50%)',
            '--shine-x': shineX,
            '--shine-y': shineY,
          } as any}
        />

        {/* TOP VALUE badge */}
        {isTopCard && (
          <div className="absolute top-3 right-3 bg-[#C5AA67] text-[#0D0A06] text-xs font-bold px-2 py-1 rounded-full">
            TOP VALUE
          </div>
        )}

        {/* Card info */}
        <div className="relative z-10">
          {/* Card image */}
          {card.cardImageUrl && (
            <div className="mb-3 flex justify-center">
              <img
                src={card.cardImageUrl}
                alt={card.name}
                className="h-20 w-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <p className="text-[#8B8070] text-xs mb-1">{card.issuer}</p>
          <p className="text-[#E8D8B0] font-bold text-lg mb-4">{card.name}</p>

          <div className="mb-4">
            <p className="text-[#6B5E52] text-xs">Balance (USD)</p>
            <p className="text-[#C5AA67] font-bold text-2xl">
              ${Math.round(card.value || 0).toLocaleString()}
            </p>
          </div>

          {/* Earn rate chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {earnRates.map(([category, rate]) => (
              <span
                key={category as string}
                className="text-xs bg-[#261B0E] text-[#C4B8A8] px-2 py-1 rounded"
              >
                {category as string} {rate as number}×
              </span>
            ))}
          </div>

          {/* Primary perk */}
          <div className="text-[#8B8070] text-xs border-t border-[#3D2E1A] pt-3">
            {card.perks?.[0] || 'No perks listed'}
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}
