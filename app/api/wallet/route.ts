// app/api/wallet/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { FiatCard, IFiatCard, FIAT_CARD_PROJECTION } from '@/lib/models/FiatCard';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';
import { transformFiatCardToWalletDetail } from '@/lib/cardTransformers';
import { calculateCardValue } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = session.user.id;
    const fiatCards = await FiatCard.find({ user_id: userId })
      .select({ ...FIAT_CARD_PROJECTION, op_redemption: 1 })
      .lean() as IFiatCard[];

    let totalValue = 0;
    const cardDetails = fiatCards.map((card) => {
      const creditTokenBalance = card.credit_token_balance || 0;
      const pointsBalance = card.points_balance || 0;
      const pointsValueCents = card.points_value_cents || 1.0;

      const value = calculateCardValue(card.currency_type, creditTokenBalance, pointsBalance, pointsValueCents);

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