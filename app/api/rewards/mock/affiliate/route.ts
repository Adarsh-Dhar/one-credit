import { NextRequest, NextResponse } from 'next/server';
import { handleAffiliateRequest } from '@/lib/mock-apis/rakuten-impact';

export async function GET(request: NextRequest) {
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams);
    const response = handleAffiliateRequest('GET', '/v2/publishers/offers', query);
    
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
    const response = handleAffiliateRequest('POST', '/v2/sync', body);
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
