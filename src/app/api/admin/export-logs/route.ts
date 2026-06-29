import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { requireAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/auditLog';

// Self-auth: the middleware matcher is /admin/:path* and does NOT cover
// /api/admin/*. This route MUST authenticate itself or it leaks all logs.
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

const COLS = [
  'created_at', 'risk_result', 'trek_id', 'device_category',
  'browser', 'lls_score', 'dataset_version', 'dataset_source',
] as const;

function esc(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** GET — export non-deleted assessment logs in [from, to] as CSV. Admin, audited. */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = await requireAdmin(user.id);
  if (!admin) return NextResponse.json({ error: 'Admin role required' }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const to   = params.get('to')   || new Date().toISOString().slice(0, 10);
  const from = params.get('from') || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  if (isNaN(Date.parse(from)) || isNaN(Date.parse(to))) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('assessment_logs')
    .select(COLS.join(', '))
    .is('deleted_at', null)
    .gte('created_at', `${from}T00:00:00.000Z`)
    .lte('created_at', `${to}T23:59:59.999Z`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[export-logs]', error.message);
    return NextResponse.json({ error: 'Export failed' }, { status: 503 });
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const header = COLS.join(',');
  const body = rows.map((r) => COLS.map((c) => esc(r[c])).join(',')).join('\n');
  const csv = `${header}\n${body}`;

  await writeAuditLog({
    performedBy: user.id,
    actionType: 'export',
    entityType: 'assessment_log',
    notes: `${from}..${to}, ${rows.length} rows`,
  });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="assessment-logs-${from}_${to}.csv"`,
    },
  });
}
