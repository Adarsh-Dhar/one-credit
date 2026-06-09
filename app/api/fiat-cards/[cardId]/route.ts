// app/api/fiat-cards/[cardId]/route.ts
//
// PATCH /api/fiat-cards/:cardId
//   body: { action: 'activate_rotation' }
//   → sets rewards_structure.rotating_categories.is_active = true in MongoDB

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import { FiatCard } from '@/lib/models/FiatCard';
import logger from '@/lib/logger';
import { toErrorResponse, UnauthorizedError } from '@/lib/errors';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    await connectDB();

    const { cardId } = await params;
    const body = await req.json();
    const { action } = body;

    if (action === 'activate_rotation') {
      const card = await FiatCard.findOneAndUpdate(
        { card_id: cardId, user_id: session.user.id },
        { $set: { 'rewards_structure.rotating_categories.is_active': true } },
        { new: true }
      );

      if (!card) {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 });
      }

      logger.info({ cardId, userId: session.user.id }, '[PATCH /api/fiat-cards] rotation activated');
      return NextResponse.json({
        success: true,
        rotating_categories: card.rewards_structure?.rotating_categories,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    logger.error({ error: err }, '[PATCH /api/fiat-cards/:cardId]');
    const { error: errResponse, status } = toErrorResponse(err);
    return NextResponse.json(errResponse, { status });
  }
}