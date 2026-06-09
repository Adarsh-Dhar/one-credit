// app/api/transactions/route.ts  (new file)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models/Transaction';
import { FiatCard } from '@/lib/models/FiatCard';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';
import {
  validateSufficientCredit,
  calculatePointsEarned,
  calculateTokensEarned,
  getBalanceUpdateField,
} from '@/lib/cardBalanceHelpers';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'UserId required' }, { status: 400 });
    }

    // Verify the requested userId matches the authenticated user
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();

    return NextResponse.json({ transactions });
  } catch (error) {
    logger.error({ error }, '[GET /api/transactions]');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId, type, amountUsd, cardId, category, merchant,
      isEmi, pointsEarned, rewardValueUsd,
      pointsRedeemed, valueReceivedUsd,
    } = body;

    if (!userId || !type) {
      return NextResponse.json({ error: 'userId and type required' }, { status: 400 });
    }

    // Verify the requested userId matches the authenticated user
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // For spend transactions, validate credit limit and update balances
    if (type === 'spend' && cardId && amountUsd) {
      const card = await FiatCard.findOne({
        card_id: cardId,
        user_id: userId,
      });

      if (!card) {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 });
      }

      // Validate credit limit
      const creditValidation = validateSufficientCredit(card, amountUsd);
      if (!creditValidation.isValid) {
        return NextResponse.json(
          {
            error: creditValidation.error,
            availableCredit: creditValidation.availableCredit,
          },
          { status: 400 }
        );
      }

      // Calculate points/tokens if not provided
      let calculatedPointsEarned = pointsEarned ?? 0;
      let calculatedRewardValueUsd = rewardValueUsd ?? 0;

      if (!pointsEarned && (card.currency_type === 'POINTS' || card.currency_type === 'MILES')) {
        const pointsResult = calculatePointsEarned(card, amountUsd, category || 'other');
        calculatedPointsEarned = pointsResult.pointsEarned;
        const pointsValueCents = card.points_value_cents || 1.0;
        calculatedRewardValueUsd = (calculatedPointsEarned * pointsValueCents) / 100;
      } else if (!pointsEarned && card.currency_type === 'USD') {
        const tokensEarned = calculateTokensEarned(card, amountUsd);
        const tokenVelocity = card.op_redemption?.token_velocity ?? 1.0;
        calculatedRewardValueUsd = tokensEarned / tokenVelocity;
      }

      // Update card balances
      const updateFields: any = {
        current_balance_owed: (card.current_balance_owed || 0) + amountUsd,
        monthly_balance_owed: (card.monthly_balance_owed || 0) + amountUsd,
      };

      const balanceField = getBalanceUpdateField(card);
      if (card.currency_type === 'POINTS' || card.currency_type === 'MILES') {
        updateFields[balanceField] = (card[balanceField] || 0) + calculatedPointsEarned;
      } else if (card.currency_type === 'USD') {
        const tokensEarned = calculateTokensEarned(card, amountUsd);
        updateFields[balanceField] = (card[balanceField] || 0) + tokensEarned;
      }

      await FiatCard.updateOne(
        { _id: card._id },
        { $set: updateFields }
      );

      // Create transaction with calculated values
      const transaction = await Transaction.create({
        userId, type,
        amountUsd: amountUsd ?? 0,
        cardId: cardId ?? '',
        category: category ?? 'other',
        merchant: merchant ?? '',
        isEmi: isEmi ?? false,
        pointsEarned: calculatedPointsEarned,
        rewardValueUsd: calculatedRewardValueUsd,
        pointsRedeemed: pointsRedeemed ?? 0,
        valueReceivedUsd: valueReceivedUsd ?? 0,
      });

      return NextResponse.json({ transaction });
    }

    // For non-spend transactions, create without balance updates
    const transaction = await Transaction.create({
      userId, type,
      amountUsd: amountUsd ?? 0,
      cardId: cardId ?? '',
      category: category ?? 'other',
      merchant: merchant ?? '',
      isEmi: isEmi ?? false,
      pointsEarned: pointsEarned ?? 0,
      rewardValueUsd: rewardValueUsd ?? 0,
      pointsRedeemed: pointsRedeemed ?? 0,
      valueReceivedUsd: valueReceivedUsd ?? 0,
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    logger.error({ error }, '[POST /api/transactions]');
    const { error: err, status } = toErrorResponse(error);
    return NextResponse.json(err, { status });
  }
}
