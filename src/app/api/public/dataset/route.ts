import { NextResponse } from 'next/server';
import { getPublishedDataset } from '@/lib/datasetService';

export async function GET(): Promise<NextResponse> {
  try {
    const dataset = await getPublishedDataset();

    if (!dataset) {
      return NextResponse.json(
        { error: 'No published dataset available' },
        { status: 404 }
      );
    }

    return NextResponse.json(dataset, {
      headers: {
        // Dataset changes infrequently; cache 5 min, stale up to 1 hour
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[GET /api/public/dataset]', err);
    return NextResponse.json(
      { error: 'Dataset temporarily unavailable' },
      { status: 503 }
    );
  }
}
