import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';

export async function withAuth(
  req: NextRequest,
  handler: (userId: string, req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    return await handler(session.user.id, req);
  } catch (err) {
    logger.error({ error: err }, '[API]');
    const { error: errResponse, status } = toErrorResponse(err);
    return NextResponse.json(errResponse, { status });
  }
}
