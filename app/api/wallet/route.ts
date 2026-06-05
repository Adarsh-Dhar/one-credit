// app/api/wallet/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { FiatCard } from '@/lib/models/FiatCard';

function getCardColor(cardType: string, network: string): string {
  const typeColors: Record<string, string> = {
    travel: 'from-blue-600 to-purple-600',
    dining: 'from-orange-500 to-red-600',
    cashback: 'from-green-500 to-emerald-600',
    fuel: 'from-yellow-500 to-orange-600',
    shopping: 'from-pink-500 to-rose-600',
    crypto: 'from-violet-500 to-purple-600',
    general: 'from-slate-500 to-slate-700',
    business: 'from-indigo-600 to-blue-700',
    student: 'from-cyan-500 to-blue-600',
  };

  const networkColors: Record<string, string> = {
    AMEX: 'from-blue-500 to-blue-700',
    VISA: 'from-blue-600 to-indigo-700',
    MASTERCARD: 'from-orange-500 to-red-600',
    DISCOVER: 'from-orange-400 to-orange-600',
  };

  return typeColors[cardType] || networkColors[network] || 'from-slate-600 to-slate-800';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  await connectDB();
  
  let user = await User.findOne({ email }).lean() as any;

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get fiat cards from database with actual balances using the user's actual ID
  const userId = user._id?.toString();
  const fiatCards = await FiatCard.find({ user_id: userId }).lean();

  // Calculate total value from credit_token_balance (rewards) not current_balance_owed (debt)
  let totalValue = 0;
  const cardDetails = fiatCards.map((card: any) => {
    const creditTokenBalance = card.credit_token_balance || 0;
    const pointsBalance = card.points_balance || 0;
    const pointsValueCents = card.points_value_cents || 1.0;
    
    // Value comes from rewards (credit_token_balance or points_balance), not debt
    let value = 0;
    if (card.currency_type === 'POINTS') {
      value = pointsBalance * (pointsValueCents / 100); // Convert cents to USD
    } else {
      value = creditTokenBalance; // Already in USD
    }
    
    totalValue += value;

    // Extract earn rates from rewards structure
    const rewardsStructure = card.rewards_structure || {};
    const earnRates = {
      flights: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('travel'))?.multiplier ?? rewardsStructure.base_multiplier,
      hotel: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('hotel'))?.multiplier ?? rewardsStructure.base_multiplier,
      dining: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('dining'))?.multiplier ?? rewardsStructure.base_multiplier,
      groceries: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('grocer'))?.multiplier ?? rewardsStructure.base_multiplier,
      fuel: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('gas'))?.multiplier ?? rewardsStructure.base_multiplier,
      shopping: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('shop'))?.multiplier ?? rewardsStructure.base_multiplier,
      pharmacy: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('pharmacy') || c.category.includes('drug'))?.multiplier ?? rewardsStructure.base_multiplier,
      electronics: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('electronic') || c.category.includes('tech'))?.multiplier ?? rewardsStructure.base_multiplier,
      streaming: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('streaming') || c.category.includes('entertainment'))?.multiplier ?? rewardsStructure.base_multiplier,
      general: rewardsStructure.base_multiplier,
    };

    // Build points program info for POINTS-type cards
    let pointsProgram = null;
    if (card.currency_type === 'POINTS' || card.currency_type === 'MILES') {
      const transferPartners = card.benefits_and_credits?.transfer_partners || [];
      const cppMin = transferPartners.length > 0 ? Math.min(...transferPartners.map((p: any) => p.cpp_min)) : pointsValueCents;
      const cppMax = transferPartners.length > 0 ? Math.max(...transferPartners.map((p: any) => p.cpp_max)) : pointsValueCents;
      pointsProgram = {
        name: card.points_program_name || 'Unknown',
        cppMin,
        cppMax,
      };
    }

    return {
      key: card.card_id,
      name: card.display_name,
      issuer: card.network,
      type: card.card_type,
      color: getCardColor(card.card_type, card.network),
      currency: card.currency_type.toLowerCase(),
      balance: card.current_balance_owed || 0, // Debt (what you owe)
      limit: card.credit_limit || 0,
      value: value, // Rewards (what you can spend) in USD
      earnRates,
      redemptionRate: card.redemption_rate_display || (card.currency_type === 'USD' ? '$1.00' : `1 Point = $${(pointsValueCents / 100).toFixed(2)}`),
      statementCredits: card.benefits_and_credits?.statement_credits || [],
      portalBonuses: card.benefits_and_credits?.portal_bonuses || [],
      protections: card.benefits_and_credits?.purchase_protections || null,
      transferPartners: card.benefits_and_credits?.transfer_partners || [],
      pointsProgram,
      perks: [
        ...(card.benefits_and_credits?.airline_perks || []),
        ...(card.benefits_and_credits?.general_perks || []),
      ],
      annualFee: card.financials?.annual_fee || 0,
      cardImageUrl: card.card_image_url,
      cardDescription: card.card_description,
      pros: card.pros,
      cons: card.cons,
      features: card.features,
    };
  });

  return NextResponse.json({ totalValue, cards: cardDetails });
}
