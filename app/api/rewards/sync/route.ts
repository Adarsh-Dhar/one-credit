import { NextRequest, NextResponse } from 'next/server';
import { runFullSync, syncSource } from '@/lib/mock-apis/sync-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { source } = body;

    let report;
    if (source) {
      report = await syncSource(source);
    } else {
      report = await runFullSync();
    }

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { getLastSyncStatus } = await import('@/lib/fivetran/rewards-connector');
    const report = await getLastSyncStatus();
    
    if (!report) {
      return NextResponse.json({
        message: 'No sync reports found. Run a sync first via POST /api/rewards/sync'
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
