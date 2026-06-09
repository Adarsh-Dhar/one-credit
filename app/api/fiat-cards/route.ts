// app/api/fiat-cards/route.ts
//
// GET  /api/fiat-cards?userId=<id>   → returns all FiatCards for that user
// POST /api/fiat-cards               → creates a new FiatCard

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { FiatCard, FIAT_CARD_PROJECTION } from '@/lib/models/FiatCard';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ValidationError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';
import { MONGODB_CONFIG } from '@/lib/constants';

async function authenticateAndConnectDB() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { userId: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  await connectDB();

  return { userId: session.user.id, error: null };
}

export async function GET(req: NextRequest) {
  try {
    const { userId: authenticatedUserId, error } = await authenticateAndConnectDB();
    if (error) {
      return error;
    }

    const requestedUserId = req.nextUrl.searchParams.get('userId');
    if (!requestedUserId) {
      return NextResponse.json({ error: 'userId query param is required' }, { status: 400 });
    }

    // Verify the requested userId matches the authenticated user
    if (authenticatedUserId !== requestedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cards = await FiatCard.find({ user_id: requestedUserId })
      .select(FIAT_CARD_PROJECTION)
      .lean();
    return NextResponse.json({ cards });
  } catch (err) {
    logger.error({ error: err }, '[GET /api/fiat-cards]');
    const { error: errResponse, status } = toErrorResponse(err);
    return NextResponse.json(errResponse, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: authenticatedUserId, error } = await authenticateAndConnectDB();
    if (error) {
      return error;
    }

    const body = await req.json();
    const { user_id, card_id } = body;

    if (!user_id || !card_id) {
      return NextResponse.json({ error: 'user_id and card_id are required' }, { status: 400 });
    }

    // Verify the requested userId matches the authenticated user
    if (authenticatedUserId !== user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Whitelist allowed fields to prevent injection attacks
    const allowedFields = {
      card_id: body.card_id,
      display_name: body.display_name,
      network: body.network,
      card_type: body.card_type,
      currency_type: body.currency_type,
      credit_token_balance: body.credit_token_balance,
      points_balance: body.points_balance,
      points_value_cents: body.points_value_cents,
      current_balance_owed: body.current_balance_owed,
      credit_limit: body.credit_limit,
      rewards_structure: body.rewards_structure,
      benefits_and_credits: body.benefits_and_credits,
      financials: body.financials,
      card_image_url: body.card_image_url,
      card_description: body.card_description,
      pros: body.pros,
      cons: body.cons,
      features: body.features,
      op_redemption: body.op_redemption,
    };

    // Upsert: update if exists, create if not
    const card = await FiatCard.findOneAndUpdate(
      { user_id, card_id },
      { $set: allowedFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ card }, { status: 201 });
  } catch (err: unknown) {
    logger.error({ error: err }, '[POST /api/fiat-cards]');
    if (err && typeof err === 'object' && 'code' in err && err.code === MONGODB_CONFIG.DUPLICATE_KEY_ERROR_CODE) {
      const validationError = new ValidationError('Card already exists for this user');
      const { error: errResponse, status } = toErrorResponse(validationError);
      return NextResponse.json(errResponse, { status });
    }
    const { error: errResponse, status } = toErrorResponse(err);
    return NextResponse.json(errResponse, { status });
  }
}