// app/api/extension/confirm-purchase/route.ts
//
// Endpoint to confirm a purchase and update card balances
// Validates credit limits, creates transaction record, and awards points/tokens

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { FiatCard } from '@/lib/models/FiatCard';
import { Transaction } from '@/lib/models/Transaction';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';
import {
  validateSufficientCredit,
  calculatePointsEarned,
  calculateTokensEarned,
  getBalanceUpdateField,
} from '@/lib/cardBalanceHelpers';
import { getEnv } from '@/lib/env';

async function logPurchaseToDynatrace(data: {
  userId: string; cardId: string; productName: string;
  price: number; category: string; merchant: string;
  pointsEarned: number; rewardValueUsd: number; timestamp: string;
}): Promise<void> {
  const env = getEnv()
  const DT_ENV_URL  = env.DT_ENV_URL  ?? ''
  const DT_API_TOKEN = env.DT_API_TOKEN ?? ''
  if (!DT_ENV_URL || !DT_API_TOKEN) {
    return
  }

  const IS_PLATFORM_URL = DT_ENV_URL.includes('.apps.dynatrace.com')
  const AUTH_SCHEME = IS_PLATFORM_URL ? 'Bearer' : 'Api-Token'

  const logEntry = {
    timestamp: data.timestamp,
    content: JSON.stringify({
      event: 'extension.purchase.confirmed',
      ...data,
    }),
    'log.source':   'one-credit',
    'service.name': 'extension-purchase',
    'severity':     'INFO',
    'user.id':      data.userId,
    'purchase.category': data.category,
    'purchase.merchant': data.merchant,
    'purchase.price':    data.price,
  }

  await fetch(`${DT_ENV_URL}/api/v2/logs/ingest`, {
    method: 'POST',
    headers: {
      Authorization:  `${AUTH_SCHEME} ${DT_API_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify([logEntry]),
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, product } = body;

    if (!cardId || !product) {
      return NextResponse.json(
        { error: 'cardId and product are required' },
        { status: 400 }
      );
    }

    const { price, category, merchant, isEmi } = product;

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid product price' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    await connectDB();

    // Fetch the user's card
    const card = await FiatCard.findOne({
      card_id: cardId,
      user_id: userId,
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Validate credit limit
    const creditValidation = validateSufficientCredit(card, price);
    if (!creditValidation.isValid) {
      return NextResponse.json(
        {
          error: creditValidation.error,
          availableCredit: creditValidation.availableCredit,
        },
        { status: 400 }
      );
    }

    // Calculate points/tokens earned
    let pointsEarned = 0;
    let rewardValueUsd = 0;

    if (card.currency_type === 'POINTS' || card.currency_type === 'MILES') {
      const pointsResult = calculatePointsEarned(card, price, category || 'other');
      pointsEarned = pointsResult.pointsEarned;
      // Calculate reward value using points_value_cents
      const pointsValueCents = card.points_value_cents || 1.0;
      rewardValueUsd = (pointsEarned * pointsValueCents) / 100;
    } else if (card.currency_type === 'USD') {
      const tokensEarned = calculateTokensEarned(card, price);
      // For USD cards, tokens are stored in credit_token_balance
      // Reward value is calculated from token velocity
      const tokenVelocity = card.op_redemption?.token_velocity ?? 1.0;
      rewardValueUsd = tokensEarned / tokenVelocity;
    }

    // Update card balances atomically
    const updateFields: any = {
      current_balance_owed: (card.current_balance_owed || 0) + price,
      monthly_balance_owed: (card.monthly_balance_owed || 0) + price,
    };

    const balanceField = getBalanceUpdateField(card);
    if (card.currency_type === 'POINTS' || card.currency_type === 'MILES') {
      updateFields[balanceField] = (card[balanceField] || 0) + pointsEarned;
    } else if (card.currency_type === 'USD') {
      const tokensEarned = calculateTokensEarned(card, price);
      updateFields[balanceField] = (card[balanceField] || 0) + tokensEarned;
    }

    await FiatCard.updateOne(
      { _id: card._id },
      { $set: updateFields }
    );

    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      cardId,
      type: 'spend',
      amountUsd: price,
      category: category || 'other',
      merchant: merchant || '',
      isEmi: isEmi || false,
      pointsEarned,
      rewardValueUsd,
    });

    // Log purchase to Dynatrace
    await logPurchaseToDynatrace({
      userId,
      cardId,
      productName: product.name ?? '',
      price,
      category: category ?? 'other',
      merchant: merchant ?? '',
      pointsEarned,
      rewardValueUsd,
      timestamp: new Date().toISOString(),
    })

    logger.info(
      {
        userId,
        cardId,
        amountUsd: price,
        pointsEarned,
        transactionId: transaction._id,
      },
      '[confirm-purchase] Purchase confirmed and balances updated'
    );

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction._id,
        amountUsd: transaction.amountUsd,
        pointsEarned,
        rewardValueUsd,
        newBalanceOwed: updateFields.current_balance_owed,
      },
    });
  } catch (error) {
    logger.error({ error }, '[POST /api/extension/confirm-purchase]');
    const { error: err, status } = toErrorResponse(error);
    return NextResponse.json(err, { status });
  }
}
