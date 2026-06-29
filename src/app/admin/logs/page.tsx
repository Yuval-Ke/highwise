import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logoutAction } from '../login/actions';
import LogsClient, { type LogItem } from './LogsClient';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/admin/login');

  const adminUser = await requireAdmin(user.id);
  if (!adminUser) redirect('/admin/login?error=unauthorized');

  // ── Data ──────────────────────────────────────────────────────────────────
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  // Service-role client: assessment_logs has no select policy. LLS is rendered
  // here server-side for the admin only — it never reaches a public client.
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('assessment_logs')
    .select('id, created_at, risk_result, trek_id, device_category, lls_score')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) console.error('[logs] assessment_logs query failed:', error.message);

  const rows = (data ?? []) as LogItem[];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <nav className="admin-nav">
        <span className="admin-nav-brand">HighWise Admin</span>
        <Link href="/admin/dataset" className="admin-nav-link">Dataset</Link>
        <Link href="/admin/dashboard" className="admin-nav-link">Dashboard</Link>
        <Link href="/admin/audit" className="admin-nav-link">Audit</Link>
        <Link href="/admin/logs" className="admin-nav-link active">Logs</Link>
        <Link href="/admin/import" className="admin-nav-link">Import</Link>
        <div className="admin-nav-spacer" />
        <span className="admin-nav-user">{adminUser.email} · {adminUser.role}</span>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary btn-sm">Sign out</button>
        </form>
      </nav>

      <div className="admin-page">
        <h1 className="admin-page-title">Assessment logs</h1>

        {adminUser.role !== 'owner' && (
          <div className="alert" style={{ marginBottom: 20 }}>
            Soft-delete is owner-only. You can view logs but deletions will be rejected.
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            Could not load logs: {error.message}
          </div>
        )}

        <div className="admin-card">
          <LogsClient rows={rows} />

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {page > 0 && (
              <Link href={`/admin/logs?page=${page - 1}`} className="btn btn-secondary btn-sm">
                ← Previous
              </Link>
            )}
            {rows.length === PAGE_SIZE && (
              <Link href={`/admin/logs?page=${page + 1}`} className="btn btn-secondary btn-sm">
                Next →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
