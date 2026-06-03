import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/extension/status
 * Checks extension connection status
 */
export async function GET(request: NextRequest) {
  const extensionId = request.headers.get('x-extension-id');
  const userId = request.headers.get('x-user-id');

  return NextResponse.json({
    status: 'connected',
    version: '1.0.0',
    extensionId,
    userId,
    timestamp: new Date().toISOString(),
    supportedSites: ['amazon', 'walmart', 'bestbuy', 'target'],
  });
}
