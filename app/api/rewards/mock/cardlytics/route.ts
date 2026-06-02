import { NextRequest, NextResponse } from 'next/server';
import { handleCardlyticsRequest } from '@/lib/mock-apis/cardlytics-banyan';

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
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
