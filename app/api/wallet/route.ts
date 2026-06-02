// app/api/wallet/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { getCards, computeTotalOp } from '@/lib/cards';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  await connectDB();
  let user = await User.findOne({ email }).lean() as any;

  // Get cards from database
  const CARDS = await getCards();

  if (!user) {
    // Auto-create demo user with all cards from database
    const defaultCards: Record<string, { balance: number }> = {};
    for (const card of CARDS) {
      defaultCards[card.key] = { balance: card.defaultBalance };
    }
    const created = await User.create({
      email,
      portfolio: { cards: defaultCards },
    });
    user = created.toObject();
  }

  const cards = user.portfolio?.cards ?? {};

  // Build flat balance map
  const balances: Record<string, number> = {};
  for (const card of CARDS) {
    balances[card.key] = cards[card.key]?.balance ?? card.defaultBalance;
  }

  const totalOp = await computeTotalOp(balances);

  // Return rich per-card data so the dashboard can display each card
  const cardDetails = CARDS.map((card) => ({
    key:      card.key,
    name:     card.name,
    issuer:   card.issuer,
    type:     card.type,
    color:    card.color,
    currency: card.currency,
    balance:  balances[card.key],
    opValue:  balances[card.key] * card.opRate,
    opRate:   card.opRate,
    perks:    card.perks,
    annualFee: card.annualFee,
  }));

  return NextResponse.json({ totalOp, cards: cardDetails, balances });
}
