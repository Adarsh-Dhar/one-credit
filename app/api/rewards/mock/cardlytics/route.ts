import { NextRequest, NextResponse } from 'next/server';
import { handleCardlyticsRequest } from '@/lib/mock-apis/cardlytics-banyan';

export async function GET(request: NextRequest) {
  // Guard: only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({}, { status: 404 });
  }

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    // Trigger a sync cycle so rates drift on every GET
    handleCardlyticsRequest('POST', '/v2/offers', {});
    const response = handleCardlyticsRequest('GET', '/v2/offers', searchParams);

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Guard: only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({}, { status: 404 });
  }

  try {
    const body = await request.json();
    const response = handleCardlyticsRequest('POST', '/v2/offers', body);

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
