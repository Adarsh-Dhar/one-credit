// app/api/fiat-cards/route.ts
//
// GET  /api/fiat-cards?userId=<id>   → returns all FiatCards for that user
// POST /api/fiat-cards               → creates a new FiatCard

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { FiatCard } from '@/lib/models/FiatCard';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ValidationError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId query param is required' }, { status: 400 });
    }

    // Verify the requested userId matches the authenticated user
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cards = await FiatCard.find({ user_id: userId })
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
      })
      .lean();
    return NextResponse.json({ cards });
  } catch (err) {
    console.error('[GET /api/fiat-cards]', err);
    const { error: errResponse, status } = toErrorResponse(err);
    return NextResponse.json(errResponse, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { user_id, card_id } = body;

    if (!user_id || !card_id) {
      return NextResponse.json({ error: 'user_id and card_id are required' }, { status: 400 });
    }

    // Verify the requested userId matches the authenticated user
    if (session.user.id !== user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Upsert: update if exists, create if not
    const card = await FiatCard.findOneAndUpdate(
      { user_id, card_id },
      { $set: body },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ card }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      throw new ValidationError('Card already exists for this user');
    }
    logger.error({ error: err }, '[POST /api/fiat-cards]');
    const { error: errResponse, status } = toErrorResponse(err);
    return NextResponse.json(errResponse, { status });
  }
}