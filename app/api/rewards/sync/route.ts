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
    // Use the same pattern as sync-engine to avoid type issues
    const { connectDB } = await import('@/lib/mongodb');
    const mongoose = await connectDB();
    
    if (!mongoose) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }
    
    // Access the raw MongoDB connection
    const collection = (mongoose as any).connection.db.collection('sync_reports');
    
    const report = await collection.findOne({}, { sort: { createdAt: -1 } });
    
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
