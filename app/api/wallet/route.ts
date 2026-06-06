// app/api/wallet/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { FiatCard, IFiatCard } from '@/lib/models/FiatCard';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';
import { transformFiatCardToWalletDetail } from '@/lib/cardTransformers';



export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Use session.user.id directly (already in JWT via jwt callback)
    const userId = session.user.id;
    const fiatCards = await FiatCard.find({ user_id: userId })
      .select({
        card_id: 1,
        display_name: 1,
        network: 1,
        card_type: 1,
        currency_type: 1,
        credit_token_balance: 1,
        points_balance: 1,
        points_value_cents: 1,
        current_balance_owed: 1,
        credit_limit: 1,
        rewards_structure: 1,
        benefits_and_credits: 1,
        financials: 1,
        card_image_url: 1,
        card_description: 1,
        pros: 1,
        cons: 1,
        features: 1,
        op_redemption: 1,
      })
      .lean() as IFiatCard[];

    // Calculate total value from credit_token_balance (rewards) not current_balance_owed (debt)
    let totalValue = 0;
    const cardDetails = fiatCards.map((card) => {
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

      return transformFiatCardToWalletDetail(card, value);
    });

    return NextResponse.json({ totalValue, cards: cardDetails });
  } catch (error) {
    logger.error({ error }, '[GET /api/wallet]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}