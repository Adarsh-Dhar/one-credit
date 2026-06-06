import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@/lib/models/User';
import { UnauthorizedError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';
import { z } from 'zod';

// Zod schema for profile validation
const ProfileSchema = z.object({
  homeAirport: z.string().optional(),
  topSpendCategories: z.array(z.enum(['dining', 'groceries', 'travel', 'gas', 'streaming', 'other'])).max(2).optional(),
  cardsOwned: z.array(z.string()).optional(),
  carryBalance: z.enum(['yes', 'sometimes', 'never']).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile: user.profile || null });
  } catch (error) {
    logger.error({ error }, '[profile GET]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const body = await request.json();
    const validatedData = ProfileSchema.parse(body);

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: { profile: validatedData } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ profile: user.profile });
  } catch (error) {
    logger.error({ error }, '[profile POST]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}
