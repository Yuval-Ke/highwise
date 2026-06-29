import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logoutAction } from '../login/actions';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type AuditRow = {
  id: string;
  performed_by: string | null;
  performed_at: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  notes: string | null;
};

export default async function AuditPage({
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

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, performed_by, performed_at, action_type, entity_type, entity_id, notes')
    .order('performed_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) console.error('[audit] audit_logs query failed:', error.message);

  const rows = (data ?? []) as AuditRow[];

  // Actor email resolution: no batch getUserById exists, so list users once and
  // build an id→email Map. listUsers defaults to ~50/page; the admin set is tiny.
  const emailMap = new Map<string, string>();
  try {
    const { data: userList } = await supabase.auth.admin.listUsers();
    for (const u of userList?.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  } catch (err) {
    console.error('[audit] listUsers failed:', err);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <nav className="admin-nav">
        <span className="admin-nav-brand">HighWise Admin</span>
        <Link href="/admin/dataset" className="admin-nav-link">Dataset</Link>
        <Link href="/admin/dashboard" className="admin-nav-link">Dashboard</Link>
        <Link href="/admin/audit" className="admin-nav-link active">Audit</Link>
        <Link href="/admin/logs" className="admin-nav-link">Logs</Link>
        <Link href="/admin/import" className="admin-nav-link">Import</Link>
        <div className="admin-nav-spacer" />
        <span className="admin-nav-user">{adminUser.email} · {adminUser.role}</span>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary btn-sm">Sign out</button>
        </form>
      </nav>

      <div className="admin-page">
        <h1 className="admin-page-title">Audit log</h1>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            Could not load audit log: {error.message}
          </div>
        )}

        <div className="admin-card">
          {rows.length === 0 ? (
            <p className="text-muted">No audit entries.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When (UTC)</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.performed_at.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td>{(row.performed_by && emailMap.get(row.performed_by)) ?? row.performed_by ?? '—'}</td>
                    <td><span className="badge badge-gray">{row.action_type}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {row.entity_type ? `${row.entity_type}${row.entity_id ? ` · ${row.entity_id}` : ''}` : '—'}
                    </td>
                    <td className="text-muted">{row.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {page > 0 && (
              <Link href={`/admin/audit?page=${page - 1}`} className="btn btn-secondary btn-sm">
                ← Previous
              </Link>
            )}
            {rows.length === PAGE_SIZE && (
              <Link href={`/admin/audit?page=${page + 1}`} className="btn btn-secondary btn-sm">
                Next →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
