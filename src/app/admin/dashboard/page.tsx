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

function countMap(items: (string | null)[]): KeyCount[] {
  const m = new Map<string, number>();
  for (const item of items) {
    const k = item ?? '(none)';
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([key, count]) => ({ key, count }));
}

type KeyCount = { key: string; count: number };

type DashStats = {
  total: number;
  avgLLS: number | string | null;
  respiratoryCount: number;
  redFlagsCount: number;
  villageLookupCount: number;
  byDay: KeyCount[];
  riskDist: KeyCount[];
  topTreks: KeyCount[];
  datasetVersions: KeyCount[];
  datasetSources: KeyCount[];
  deviceSummary: KeyCount[];
  browserSummary: KeyCount[];
};

/** Normalise either RPC output or buildStats output into [key, count] tuples. */
function toTuples(items: KeyCount[]): [string, number][] {
  return items.map((i) => [i.key, i.count] as [string, number]);
}

function buildStats(logs: LogRow[]): DashStats {
  const total = logs.length;

  // By day (last 14 days, descending)
  const dayMap = new Map<string, number>();
  for (const log of logs) {
    const day = log.created_at.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const byDay: KeyCount[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14)
    .map(([key, count]) => ({ key, count }));

  // Risk distribution
  const riskOrder = ['green', 'yellow', 'orange', 'red'] as const;
  const riskMap: Record<string, number> = { green: 0, yellow: 0, orange: 0, red: 0 };
  for (const log of logs) {
    const k = log.risk_result ?? '';
    if (k in riskMap) riskMap[k]++;
  }
  const riskDist: KeyCount[] = riskOrder.map(k => ({ key: k, count: riskMap[k] }));

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/admin/login');

  const adminUser = await requireAdmin(user.id);
  if (!adminUser) redirect('/admin/login?error=unauthorized');

  // ── Date range (default last 30 days) ───────────────────────────────────────
  const sp = await searchParams;
  const to   = sp.to   || new Date().toISOString().slice(0, 10);
  const from = sp.from || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const fromTs = `${from}T00:00:00.000Z`;
  const toTs   = `${to}T23:59:59.999Z`;

  // ── Data ──────────────────────────────────────────────────────────────────
  const supabase = createServerSupabaseClient();

  let error: { message: string } | null = null;
  let stats: DashStats | null = null;

  // Primary path: DB-side aggregation (no row cap, respects the date range).
  const { data: statsRaw, error: rpcError } = await supabase.rpc('get_dashboard_stats', {
    p_from: fromTs,
    p_to: toTs,
  });
  if (rpcError) {
    // Fallback: migration not yet applied — pull rows and aggregate in JS.
    // Kept intact so the dashboard renders before/after the migration is run.
    console.error('[dashboard] get_dashboard_stats RPC failed, using JS fallback:', rpcError.message);
    const { data: rawLogs, error: logsError } = await supabase
      .from('assessment_logs')
      .select('created_at, risk_result, trek_id, lls_score, respiratory_illness, red_flags, village_lookup_used, dataset_version, dataset_source, device_category, browser')
      .is('deleted_at', null)
      .gte('created_at', fromTs)
      .lte('created_at', toTs)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (logsError) error = logsError;
    stats = buildStats((rawLogs ?? []) as LogRow[]);
  } else {
    stats = statsRaw as DashStats;
  }

  // Render expects [key, count] tuples; both paths produce KeyCount[] arrays.
  const s = stats;
  const riskDist        = toTuples(s.riskDist ?? []);
  const byDay           = toTuples(s.byDay ?? []);
  const topTreks        = toTuples(s.topTreks ?? []);
  const datasetVersions = toTuples(s.datasetVersions ?? []);
  const datasetSources  = toTuples(s.datasetSources ?? []);
  const deviceSummary   = toTuples(s.deviceSummary ?? []);
  const browserSummary  = toTuples(s.browserSummary ?? []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <nav className="admin-nav">
        <span className="admin-nav-brand">HighWise Admin</span>
        <Link href="/admin/dataset" className="admin-nav-link">Dataset</Link>
        <Link href="/admin/dashboard" className="admin-nav-link active">Dashboard</Link>
        <Link href="/admin/audit" className="admin-nav-link">Audit</Link>
        <Link href="/admin/logs" className="admin-nav-link">Logs</Link>
        <Link href="/admin/import" className="admin-nav-link">Import</Link>
        <div className="admin-nav-spacer" />
        <span className="admin-nav-user">{adminUser.email} · {adminUser.role}</span>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary btn-sm">Sign out</button>
        </form>
      </nav>

      <div className="admin-page">
        <h1 className="admin-page-title">Dashboard</h1>

        {/* ── Date range + export (native GET form) ───────────────────────── */}
        <form method="get" className="admin-card" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="text-muted" style={{ fontSize: 13 }}>From
            <input type="date" name="from" defaultValue={from} style={{ marginLeft: 6 }} />
          </label>
          <label className="text-muted" style={{ fontSize: 13 }}>To
            <input type="date" name="to" defaultValue={to} style={{ marginLeft: 6 }} />
          </label>
          <button type="submit" className="btn btn-secondary btn-sm">Apply</button>
          <a className="btn btn-secondary btn-sm" href={`/api/admin/export-logs?from=${from}&to=${to}`}>Export CSV</a>
        </form>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            Could not load assessment data: {error.message}
          </div>
        )}

        {/* ── Overview stats ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total assessments', value: s.total },
            { label: 'Avg LLS score',     value: s.avgLLS ?? '—' },
            { label: 'Respiratory illness', value: s.respiratoryCount },
            { label: 'Had red flags',     value: s.redFlagsCount },
            { label: 'Village lookup used', value: s.villageLookupCount },
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
          {s.total === 0 ? (
            <p className="text-muted">No data yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Level</th><th>Count</th><th>Share</th></tr>
              </thead>
              <tbody>
                {riskDist.map(([level, count]) => (
                  <tr key={level}>
                    <td><span className={riskBadgeClass(level)}>{level}</span></td>
                    <td>{count}</td>
                    <td className="text-muted">
                      {s.total > 0 ? `${((count / s.total) * 100).toFixed(1)}%` : '—'}
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
          {byDay.length === 0 ? (
            <p className="text-muted">No data yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Date</th><th>Count</th></tr>
              </thead>
              <tbody>
                {byDay.map(([day, count]) => (
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
          {topTreks.length === 0 ? (
            <p className="text-muted">No data yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>Trek ID</th><th>Count</th></tr>
              </thead>
              <tbody>
                {topTreks.map(([trek, count]) => (
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
            {datasetVersions.length === 0 ? (
              <p className="text-muted">No data yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Version</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {datasetVersions.map(([v, count]) => (
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
            {datasetSources.length === 0 ? (
              <p className="text-muted">No data yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Source</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {datasetSources.map(([src, count]) => (
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
            {deviceSummary.length === 0 ? (
              <p className="text-muted">No data yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Category</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {deviceSummary.map(([cat, count]) => (
                    <tr key={cat}><td>{cat}</td><td>{count}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="admin-card" style={{ margin: 0 }}>
            <div className="admin-card-title">Browser</div>
            {browserSummary.length === 0 ? (
              <p className="text-muted">No data yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Browser</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {browserSummary.map(([br, count]) => (
                    <tr key={br}><td>{br}</td><td>{count}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p className="text-muted" style={{ marginTop: 24, fontSize: 11 }}>
          Non-deleted assessment logs · {from} to {to} · {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC
        </p>
      </div>
    </div>
  );
}
