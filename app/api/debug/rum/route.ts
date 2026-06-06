import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { RUMSignals } from '@/lib/models/RUMSignals';
import { connectDB } from '@/lib/mongodb';

// Blocked in production — dev/staging only
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const doc = await RUMSignals.findOne({ userId: session.user.email }).lean();

  if (!doc) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(doc);
}
