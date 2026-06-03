import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/extension/analyze
 * Analyzes a product and calculates OP costs for all user cards
 */
export async function POST(request: NextRequest) {
  try {
    const { product, userId } = await request.json();

    if (!product || !userId) {
      return NextResponse.json(
        { error: 'Missing product or userId' },
        { status: 400 }
      );
    }

    // Fetch user's cards
    const cardsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/fiat-cards?userId=${userId}`,
      { cache: 'no-store' }
    );
    const cardsData = await cardsResponse.json();

    if (!cardsData.cards) {
      return NextResponse.json(
        { error: 'Failed to fetch user cards' },
        { status: 500 }
      );
    }

    // Calculate OP costs for each card
    const analyzed = cardsData.cards.map((card: any) => {
      const earnRate = card.rewards_structure?.base_multiplier || 1;
      const rewardsEarned = product.price * earnRate;
      
      // Simplified OP cost calculation
      const bestRedemptionCpp = card.best_redemption_cpp || 1.0;
      const opportunityMultiplier = bestRedemptionCpp;
      const netDollarCost = product.price - (rewardsEarned * (card.points_value_cents || 1) / 100);
      const opCost = Math.round(netDollarCost * opportunityMultiplier * 100);

      return {
        ...card,
        rewardsEarned: Math.round(rewardsEarned * 100) / 100,
        netDollarCost: Math.round(netDollarCost * 100) / 100,
        opportunityMultiplier,
        opCost,
      };
    });

    // Sort by OP cost (ascending)
    analyzed.sort((a: any, b: any) => a.opCost - b.opCost);

    // Add ranks
    analyzed.forEach((card: any, idx: number) => {
      card.rank = idx + 1;
    });

    return NextResponse.json({
      product,
      cards: analyzed,
      winner: analyzed[0],
      savings: analyzed[analyzed.length - 1].opCost - analyzed[0].opCost,
    });
  } catch (error) {
    console.error('[OneCredit Extension] Error analyzing product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
