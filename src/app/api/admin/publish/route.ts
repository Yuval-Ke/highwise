import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { requireOwner } from '@/lib/adminAuth';
import { buildAndValidateSnapshot, commitSnapshot } from '@/lib/publishService';

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** GET — preview the publish: validation + change summary (no commit). */
export async function GET(): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const owner = await requireOwner(user.id);
  if (!owner) return NextResponse.json({ error: 'Owner role required' }, { status: 403 });

  try {
    const result = await buildAndValidateSnapshot();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/admin/publish]', err);
    return NextResponse.json({ error: 'Failed to build snapshot' }, { status: 503 });
  }
}

/** POST — validate then commit the snapshot. Body: { confirmed: true } */
export async function POST(request: Request): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const owner = await requireOwner(user.id);
  if (!owner) return NextResponse.json({ error: 'Owner role required' }, { status: 403 });

  let body: { confirmed?: boolean } = {};
  try { body = await request.json(); } catch { /* no body */ }

  if (!body.confirmed) {
    return NextResponse.json({ error: 'Must include confirmed: true' }, { status: 400 });
  }

  try {
    const result = await buildAndValidateSnapshot();
    if (result.validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', validationErrors: result.validationErrors },
        { status: 422 }
      );
    }
    if (!result.snapshot) {
      return NextResponse.json({ error: 'No snapshot built' }, { status: 500 });
    }
    await commitSnapshot(result.snapshot, user.id);
    return NextResponse.json({ success: true, datasetVersion: result.snapshot.datasetVersion });
  } catch (err) {
    console.error('[POST /api/admin/publish]', err);
    return NextResponse.json({ error: 'Publish failed' }, { status: 503 });
  }
}
