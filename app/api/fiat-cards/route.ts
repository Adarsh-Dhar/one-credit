// app/api/fiat-cards/route.ts
//
// GET  /api/fiat-cards?userId=<id>   → returns all FiatCards for that user
// POST /api/fiat-cards               → creates a new FiatCard

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { FiatCard } from '@/lib/models/FiatCard';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

    const cards = await FiatCard.find({ user_id: userId }).lean();
    return NextResponse.json({ cards });
  } catch (err) {
    console.error('[GET /api/fiat-cards]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Card already exists for this user' }, { status: 409 });
    }
    console.error('[POST /api/fiat-cards]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}