// app/api/extension/card-count/route.ts
//
// GET  /api/extension/card-count?userId=<id>   → returns card count for extension
// This endpoint is for the extension and doesn't require NextAuth session
// It validates userId via a simple query param (in production, use proper API keys)

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FiatCard } from '@/lib/models/FiatCard';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId query param is required' }, { status: 400 });
    }

    await connectDB();

    const cards = await FiatCard.find({ user_id: userId }).lean();
    
    return NextResponse.json({ 
      cardCount: cards.length,
      cards: cards
    });
  } catch (err) {
    logger.error({ error: err }, '[GET /api/extension/card-count]');
    return NextResponse.json({ error: 'Failed to fetch card count' }, { status: 500 });
  }
}
