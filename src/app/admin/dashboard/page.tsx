import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logoutAction } from '../login/actions';

export const dynamic = 'force-dynamic';

// ── Aggregate helpers ─────────────────────────────────────────────────────────

type LogRow = {
  created_at: string;
  risk_result: string | null;
  trek_id: string | null;
  lls_score: number | null;
  respiratory_illness: boolean | null;
  red_flags: string[] | null;
  village_lookup_used: boolean;
  dataset_version: string | null;
  dataset_source: string | null;
  device_category: string | null;
  browser: string | null;
};

function countMap(items: (string | null)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const item of items) {
    const k = item ?? '(none)';
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries()).sort(([, a], [, b]) => b - a);
}

function buildStats(logs: LogRow[]) {
  const total = logs.length;

  // By day (last 14 days, descending)
  const dayMap = new Map<string, number>();
  for (const log of logs) {
    const day = log.created_at.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const byDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14);

  // Risk distribution
  const riskOrder = ['green', 'yellow', 'orange', 'red'] as const;
  const riskMap: Record<string, number> = { green: 0, yellow: 0, orange: 0, red: 0 };
  for (const log of logs) {
    const k = log.risk_result ?? '';
    if (k in riskMap) riskMap[k]++;
  }
  const riskDist = riskOrder.map(k => [k, riskMap[k]] as [string, number]);

  // Top treks
  const topTreks = countMap(logs.map(l => l.trek_id)).slice(0, 10);

  // Avg LLS
  const llsValues = logs.filter(l => l.lls_score !== null).map(l => l.lls_score!);
  const avgLLS = llsValues.length
    ? (llsValues.reduce((a, b) => a + b, 0) / llsValues.length).toFixed(1)
    : null;

  // Counts
  const respiratoryCount = logs.filter(l => l.respiratory_illness === true).length;
  const redFlagsCount    = logs.filter(l => Array.isArray(l.red_flags) && l.red_flags.length > 0).length;
  const villageLookupCount = logs.filter(l => l.village_lookup_used === true).length;

  // Dataset versions
  const datasetVersions = countMap(logs.map(l => l.dataset_version));
  const datasetSources  = countMap(logs.map(l => l.dataset_source));

  // Device / browser
  const deviceSummary  = countMap(logs.map(l => l.device_category));
  const browserSummary = countMap(logs.map(l => l.browser));

  return {
    total, byDay, riskDist, topTreks,
    avgLLS, respiratoryCount, redFlagsCount, villageLookupCount,
    datasetVersions, datasetSources, deviceSummary, browserSummary,
  };
}

// ── Risk badge ────────────────────────────────────────────────────────────────

function riskBadgeClass(risk: string): string {
  if (risk === 'green')  return 'badge badge-green';
  if (risk === 'red')    return 'badge badge-red';
  if (risk === 'yellow') return 'badge badge-yellow';
  return 'badge badge-gray';
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/admin/login');

  const adminUser = await requireAdmin(user.id);
  if (!adminUser) redirect('/admin/login?error=unauthorized');

  // ── Data ──────────────────────────────────────────────────────────────────
  const supabase = createServerSupabaseClient();

  const { data: rawLogs, error } = await supabase
    .from('assessment_logs')
    .select('created_at, risk_result, trek_id, lls_score, respiratory_illness, red_flags, village_lookup_used, dataset_version, dataset_source, device_category, browser')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) console.error('[dashboard] assessment_logs query failed:', error.message);

  const logs = (rawLogs ?? []) as LogRow[];
  const stats = buildStats(logs);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <nav className="admin-nav">
        <span className="admin-nav-brand">HighWise Admin</span>
        <Link href="/admin/dataset" className="admin-nav-link">Dataset</Link>
        <Link href="/admin/dashboard" className="admin-nav-link active">Dashboard</Link>
        <Link href="/admin/import" className="admin-nav-link">Import</Link>
        <div className="admin-nav-spacer" />
        <span className="admin-nav-user">{adminUser.email} · {adminUser.role}</span>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary btn-sm">Sign out</button>
        </form>
      </nav>

      <div className="admin-page">
        <h1 className="admin-page-title">Dashboard</h1>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            Could not load assessment data: {error.message}
          </div>
        )}

        {/* ── Overview stats ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total assessments', value: stats.total },
            { label: 'Avg LLS score',     value: stats.avgLLS ?? '—' },
            { label: 'Respiratory illness', value: stats.respiratoryCount },
            { label: 'Had red flags',     value: stats.redFlagsCount },
            { label: 'Village lookup used', value: stats.villageLookupCount },
          ].map(({ label, value }) => (
            <div key={label} className="admin-card" style={{ padding: '16px 20px', margin: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#1a1a2e' }}>{value}</div>
              <div className="text-muted" style={{ marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Risk distribution ──────────────────────────────────────────── */}
        <div className="admin-card">
          <div className="admin-card-title">Risk distribution</div>
          {stats.total === 0 ? (
            <p className="text-muted">No data yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Level</th><th>Count</th><th>Share</th></tr>
              </thead>
              <tbody>
                {stats.riskDist.map(([level, count]) => (
                  <tr key={level}>
                    <td><span className={riskBadgeClass(level)}>{level}</span></td>
                    <td>{count}</td>
                    <td className="text-muted">
                      {stats.total > 0 ? `${((count / stats.total) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Assessments by day ─────────────────────────────────────────── */}
        <div className="admin-card">
          <div className="admin-card-title">Assessments by day (last 14)</div>
          {stats.byDay.length === 0 ? (
            <p className="text-muted">No data yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Date</th><th>Count</th></tr>
              </thead>
              <tbody>
                {stats.byDay.map(([day, count]) => (
                  <tr key={day}>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{day}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Top treks ──────────────────────────────────────────────────── */}
        <div className="admin-card">
          <div className="admin-card-title">Top treks (by assessment count)</div>
          {stats.topTreks.length === 0 ? (
            <p className="text-muted">No data yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Trek ID</th><th>Count</th></tr>
              </thead>
              <tbody>
                {stats.topTreks.map(([trek, count]) => (
                  <tr key={trek}>
                    <td style={{ fontFamily: 'monospace' }}>{trek}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Dataset versions & sources ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="admin-card" style={{ margin: 0 }}>
            <div className="admin-card-title">Dataset versions</div>
            {stats.datasetVersions.length === 0 ? (
              <p className="text-muted">No data yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Version</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {stats.datasetVersions.map(([v, count]) => (
                    <tr key={v}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="admin-card" style={{ margin: 0 }}>
            <div className="admin-card-title">Dataset source</div>
            {stats.datasetSources.length === 0 ? (
              <p className="text-muted">No data yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Source</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {stats.datasetSources.map(([src, count]) => (
                    <tr key={src}>
                      <td><span className="badge badge-gray">{src}</span></td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Device / browser ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div className="admin-card" style={{ margin: 0 }}>
            <div className="admin-card-title">Device category</div>
            {stats.deviceSummary.length === 0 ? (
              <p className="text-muted">No data yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Category</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {stats.deviceSummary.map(([cat, count]) => (
                    <tr key={cat}><td>{cat}</td><td>{count}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="admin-card" style={{ margin: 0 }}>
            <div className="admin-card-title">Browser</div>
            {stats.browserSummary.length === 0 ? (
              <p className="text-muted">No data yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Browser</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {stats.browserSummary.map(([br, count]) => (
                    <tr key={br}><td>{br}</td><td>{count}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p className="text-muted" style={{ marginTop: 24, fontSize: 11 }}>
          Showing all non-deleted assessment logs · {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC
        </p>
      </div>
    </div>
  );
}
