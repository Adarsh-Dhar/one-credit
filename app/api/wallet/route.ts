// app/api/wallet/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { FiatCard } from '@/lib/models/FiatCard';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  await connectDB();
  let user = await User.findOne({ email }).lean() as any;

  // Get fiat cards from database with actual balances
  const fiatCards = await FiatCard.find({ user_id: 'usr_88374' }).lean();

  if (!user) {
    // Auto-create demo user
    const created = await User.create({
      email,
      portfolio: { cards: {} },
    });
    user = created.toObject();
  }

  // Calculate total OP from credit_token_balance (rewards) not current_balance_owed (debt)
  let totalOp = 0;
  const cardDetails = fiatCards.map((card: any) => {
    const creditTokenBalance = card.credit_token_balance || 0;
    const pointsBalance = card.points_balance || 0;
    const pointsValueCents = card.points_value_cents || 1.0;
    
    // OP value comes from rewards (credit_token_balance or points_balance), not debt
    let opValue = 0;
    if (card.currency_type === 'POINTS') {
      opValue = pointsBalance * pointsValueCents;
    } else {
      opValue = creditTokenBalance;
    }
    
    totalOp += opValue;

    // Extract earn rates from rewards structure
    const rewardsStructure = card.rewards_structure || {};
    const earnRates = {
      flights: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('travel'))?.multiplier ?? rewardsStructure.base_multiplier,
      hotel: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('hotel'))?.multiplier ?? rewardsStructure.base_multiplier,
      dining: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('dining'))?.multiplier ?? rewardsStructure.base_multiplier,
      groceries: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('grocer'))?.multiplier ?? rewardsStructure.base_multiplier,
      fuel: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('gas'))?.multiplier ?? rewardsStructure.base_multiplier,
      shopping: rewardsStructure.fixed_categories?.find((c: any) => c.category.includes('shop'))?.multiplier ?? rewardsStructure.base_multiplier,
      general: rewardsStructure.base_multiplier,
    };

    return {
      key: card.card_id,
      name: card.display_name,
      issuer: card.network,
      type: card.card_type,
      color: 'from-slate-600 to-slate-800',
      currency: card.currency_type.toLowerCase(),
      balance: card.current_balance_owed || 0, // Debt (what you owe)
      limit: card.credit_limit || 0,
      opValue: opValue, // Rewards (what you can spend)
      opRate: card.currency_type === 'USD' ? 100 : (pointsValueCents || 1.0),
      earnRates,
      redemptionRate: card.redemption_rate_display || (card.currency_type === 'USD' ? '$1.00 = 100 OP' : `1 Point = ${pointsValueCents || 1.0} OP`),
      perks: [
        ...(card.benefits_and_credits?.airline_perks || []),
        ...(card.benefits_and_credits?.general_perks || []),
      ],
      annualFee: card.financials?.annual_fee || 0,
    };
  });

  return NextResponse.json({ totalOp, cards: cardDetails });
}
