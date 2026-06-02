import { NextRequest, NextResponse } from 'next/server';
import { handleNetworkOfferRequest, networkOfferStore } from '@/lib/mock-apis/visa-mastercard';

export async function GET(request: NextRequest) {
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams);
    // Drift rates on every GET
    networkOfferStore.sync();
    const response = handleNetworkOfferRequest('GET', '/v2/offers', query);
    
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
    const response = handleNetworkOfferRequest('POST', '/v2/sync', body);
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
