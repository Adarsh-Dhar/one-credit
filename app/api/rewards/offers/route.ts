import { NextRequest, NextResponse } from 'next/server';
import { getActiveOffers, getNetworkDeals, getAffiliateDeals } from '@/lib/mock-apis/sync-engine';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const layer = searchParams.get('layer') || 'all';
    const category = searchParams.get('category') || undefined;
    const network = searchParams.get('network') || undefined;
    const country = searchParams.get('country') || undefined;
    const minCashback = searchParams.get('minCashback') ? parseFloat(searchParams.get('minCashback')!) : undefined;
    const minEpc = searchParams.get('minEpc') ? parseFloat(searchParams.get('minEpc')!) : undefined;

    const data: any = {
      cardlytics: [],
      network: [],
      affiliate: [],
      totalCount: 0
    };

    if (layer === 'all' || layer === 'cardlytics') {
      data.cardlytics = await getActiveOffers({
        category,
        minCashback
      });
    }

    if (layer === 'all' || layer === 'network') {
      data.network = await getNetworkDeals({
        network,
        country,
        activeOnly: true
      });
    }

    if (layer === 'all' || layer === 'affiliate') {
      data.affiliate = await getAffiliateDeals({
        vertical: category,
        network,
        minEpc
      });
    }

    data.totalCount = data.cardlytics.length + data.network.length + data.affiliate.length;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
