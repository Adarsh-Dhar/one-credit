// app/api/transactions/route.ts  (new file)
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models/Transaction';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'UserId required' }, { status: 400 });
  }

  await connectDB();
  const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();

  return NextResponse.json({ transactions });
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    userId, type, amountInr, cardId, category, merchant,
    isEmi, pointsEarned, rewardValueInr,
    // legacy fields
    amountOp, cardDebits, description, metadata,
  } = body;

  if (!userId || !type) {
    return NextResponse.json({ error: 'userId and type required' }, { status: 400 });
  }

  await connectDB();
  const transaction = await Transaction.create({
    userId, type,
    amountInr: amountInr ?? 0,
    cardId: cardId ?? '',
    category: category ?? 'other',
    merchant: merchant ?? '',
    isEmi: isEmi ?? false,
    pointsEarned: pointsEarned ?? 0,
    rewardValueInr: rewardValueInr ?? 0,
    // legacy
    amountOp: amountOp ?? 0,
    cardDebits, description, metadata,
  });

  return NextResponse.json({ transaction });
}
