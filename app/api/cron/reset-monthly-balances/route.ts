// app/api/cron/reset-monthly-balances/route.ts
//
// Cron job endpoint to reset monthly balances on the 1st of each month
// Called by Vercel cron scheduler

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FiatCard } from '@/lib/models/FiatCard';
import logger from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  try {
    // Verify this is called by cron (check for cron secret header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const currentMonth = getCurrentMonthKey();
    logger.info(`[Cron] Starting monthly balance reset for ${currentMonth}`);

    // Get all cards that need to be reset
    const cardsToReset = await FiatCard.find({
      $or: [
        { last_reset_month: { $ne: currentMonth } },
        { last_reset_month: { $exists: false } },
        { last_reset_month: '' },
      ],
    });

    logger.info(`[Cron] Found ${cardsToReset.length} cards to reset`);

    let resetCount = 0;

    for (const card of cardsToReset) {
      const previousBalance = card.monthly_balance_owed || 0;

      await FiatCard.updateOne(
        { _id: card._id },
        {
          $set: {
            monthly_balance_owed: 0,
            last_reset_month: currentMonth,
          },
        }
      );

      logger.info(`[Cron] Reset ${card.display_name}: previous balance=$${previousBalance.toLocaleString()}`);
      resetCount++;
    }

    logger.info(`[Cron] Successfully reset ${resetCount} cards`);

    return NextResponse.json({
      success: true,
      message: `Reset ${resetCount} cards for month ${currentMonth}`,
      resetCount,
      currentMonth,
    });
  } catch (error) {
    logger.error({ error }, '[Cron] Error resetting monthly balances');
    const { error: err, status } = toErrorResponse(error);
    return NextResponse.json(err, { status });
  }
}
