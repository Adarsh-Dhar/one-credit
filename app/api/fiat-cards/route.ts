// app/api/fiat-cards/route.ts
//
// GET  /api/fiat-cards?userId=<id>   → returns all FiatCards for that user
// POST /api/fiat-cards               → creates a new FiatCard
//
// Example GET:
//   fetch('/api/fiat-cards?userId=usr_88374')
//
// Example POST body:
//   { ...card payload matching IFiatCard }

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FiatCard } from '@/lib/models/FiatCard';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId query param is required' }, { status: 400 });
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
    await connectDB();

    const body = await req.json();
    const { user_id, card_id } = body;

    if (!user_id || !card_id) {
      return NextResponse.json({ error: 'user_id and card_id are required' }, { status: 400 });
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