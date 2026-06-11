import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@/lib/models/User';
import { UnauthorizedError, toErrorResponse } from '@/lib/errors';
import logger from '@/lib/logger';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';

const SettingsSchema = z.object({
  email: z.string().email(),
  geminiApiKey: z.string().min(1, 'API key is required'),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user?.geminiApiKey) {
      return NextResponse.json({ hasApiKey: false, redactedKey: null });
    }

    // Redact the API key - show first 6 chars and last 4 chars with asterisks in between
    const key = user.geminiApiKey;
    const redactedKey = key.length > 10
      ? `${key.substring(0, 6)}${'*'.repeat(key.length - 10)}${key.substring(key.length - 4)}`
      : `${key.substring(0, 3)}${'*'.repeat(Math.max(0, key.length - 3))}`;

    return NextResponse.json({ hasApiKey: true, redactedKey });
  } catch (error) {
    logger.error({ error }, '[settings GET]');
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
    const validatedData = SettingsSchema.parse(body);

    await connectDB();

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
