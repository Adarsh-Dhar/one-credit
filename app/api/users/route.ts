// app/api/users/route.ts  (new file)
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
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    email: (user as any).email,
    name:  (user as any).name,
    createdAt: (user as any).createdAt,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { email, name } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, name, portfolio: { cards: { skyward: { miles: 60000 }, goldFork: { points: 30000 }, clearCash: { cash: 150 } } } } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ email: (user as any).email });
}
