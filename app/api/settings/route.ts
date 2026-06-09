import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@/lib/models/User';
import { UnauthorizedError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';
import { z } from 'zod';

const SettingsSchema = z.object({
  email: z.string().email(),
  geminiApiKey: z.string().min(1, 'API key is required'),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const body = await request.json();
    const validatedData = SettingsSchema.parse(body);

    // Update the user's geminiApiKey
    await User.findOneAndUpdate(
      { email: validatedData.email },
      { $set: { geminiApiKey: validatedData.geminiApiKey } },
      { upsert: true, new: true }
    );

    logger.info({ email: validatedData.email }, '[settings] Gemini API key saved');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, '[settings POST]');
    const { error: errResponse, status } = toErrorResponse(error);
    return NextResponse.json(errResponse, { status });
  }
}
