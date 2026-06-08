// app/api/transactions/route.ts  (new file)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models/Transaction';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';

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
