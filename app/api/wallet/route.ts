// app/api/wallet/route.ts  (new file)
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email }).lean();

  if (!user) {
    // Auto-create demo user on first load
    const newUser = await User.create({
      email,
      portfolio: {
        cards: {
          skyward:   { miles: 60000 },
          goldFork:  { points: 30000 },
          clearCash: { cash: 150 },
        },
      },
    });
    return NextResponse.json({ totalOp: 150000, cards: newUser.portfolio.cards });
  }

  const cards = (user as any).portfolio?.cards;
  const totalOp =
    (cards?.skyward?.miles ?? 0) * 1.5 +
    (cards?.goldFork?.points ?? 0) * 1.5 +
    (cards?.clearCash?.cash ?? 0) * 100;

  return NextResponse.json({ totalOp, cards });
}
