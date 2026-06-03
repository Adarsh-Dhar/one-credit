import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/extension/checkout
 * Records when user selects a card at checkout via extension
 */
export async function POST(request: NextRequest) {
  try {
    const { product, selectedCard, userId, savings } = await request.json();

    if (!product || !selectedCard || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Log the transaction for analytics
    const transaction = {
      type: 'extension_checkout',
      userId,
      product,
      selectedCard,
      savings,
      timestamp: new Date().toISOString(),
    };

    console.log('[OneCredit Extension] Checkout recorded:', transaction);

    // You can store this in a database if needed
    // await db.transactions.create(transaction);

    return NextResponse.json({
      success: true,
      message: 'Checkout recorded',
      transaction,
    });
  } catch (error) {
    console.error('[OneCredit Extension] Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
