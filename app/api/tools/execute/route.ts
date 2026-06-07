import { executeMCPTool } from '@/lib/mcp-tools';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { toolName, toolInput } = body;

    if (!toolName) {
      return NextResponse.json({ error: 'Tool name required' }, { status: 400 });
    }

    // ← was missing await — tool result was never returned
    const result = await executeMCPTool(toolName, toolInput ?? {});
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[tools/execute]');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute tool' },
      { status: 500 }
    );
  }
}
