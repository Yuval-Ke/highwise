import { NextResponse } from 'next/server';
import { getPublicConfig } from '@/lib/configService';

export async function GET(): Promise<NextResponse> {
  try {
    const config = await getPublicConfig();
    return NextResponse.json(config, {
      headers: {
        // Fresh for 60 s; serve stale while revalidating for up to 5 min
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('[GET /api/public/config]', err);
    return NextResponse.json(
      { error: 'Configuration temporarily unavailable' },
      { status: 503 }
    );
  }
}
