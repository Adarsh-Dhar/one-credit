import { NextRequest, NextResponse } from 'next/server';
import { getActiveOffers, getNetworkDeals, getAffiliateDeals } from '@/lib/mock-apis/sync-engine';
import { API_LAYERS } from '@/lib/constants';

interface OffersResponse {
  cardlytics: unknown[];
  network: unknown[];
  affiliate: unknown[];
  totalCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const layer = searchParams.get('layer') || API_LAYERS.ALL;
    const category = searchParams.get('category') || undefined;
    const networks = searchParams.get('networks') || undefined;
    const network: string | string[] | undefined = networks
      ? networks.split(',').map(n => n.trim())
      : (searchParams.get('network') || undefined);
    const country = searchParams.get('country') || undefined;
    const minCashback = searchParams.get('minCashback') ? parseFloat(searchParams.get('minCashback')!) : undefined;
    const minEpc = searchParams.get('minEpc') ? parseFloat(searchParams.get('minEpc')!) : undefined;

    const data: OffersResponse = {
      cardlytics: [],
      network: [],
      affiliate: [],
      totalCount: 0
    };

    if (layer === API_LAYERS.ALL || layer === API_LAYERS.CARDLYTICS) {
      data.cardlytics = await getActiveOffers({
        category,
        minCashback
      });
    }

    if (layer === API_LAYERS.ALL || layer === API_LAYERS.NETWORK) {
      data.network = await getNetworkDeals({
        network,
        country,
        activeOnly: true
      });
    }

    if (layer === API_LAYERS.ALL || layer === API_LAYERS.AFFILIATE) {
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
