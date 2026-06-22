import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildAndValidateSnapshot } from '@/lib/publishService';
import { logoutAction, } from '../login/actions';
import { createCountry, createTrek, publishDataset } from './actions';

export const dynamic = 'force-dynamic';

export default async function DatasetPage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/admin/login');

  const adminUser = await requireAdmin(user.id);
  if (!adminUser) redirect('/admin/login?error=unauthorized');

  const isOwner = adminUser.role === 'owner';

  // ── Data ──────────────────────────────────────────────────────────────────
  const supabase = createServerSupabaseClient();

  const [{ data: countries }, { data: treks }, { data: currentVersion }] = await Promise.all([
    supabase.from('countries').select('id, country_code, name_en, name_he, is_active, sort_order').order('sort_order'),
    supabase.from('treks').select('id, trek_id, country_id, name_en, name_he, is_active, is_popular, needs_review, sort_order').order('sort_order'),
    supabase.from('dataset_versions').select('dataset_version, published_at').eq('is_current', true).maybeSingle(),
  ]);

  // ── Publish preview (owner only) ──────────────────────────────────────────
  let publishPreview: Awaited<ReturnType<typeof buildAndValidateSnapshot>> | null = null;
  if (isOwner) {
    try { publishPreview = await buildAndValidateSnapshot(); } catch { /* non-fatal */ }
  }

  return (
    <div>
      <nav className="admin-nav">
        <span className="admin-nav-brand">HighWise Admin</span>
        <Link href="/admin/dataset" className="admin-nav-link active">Dataset</Link>
        <div className="admin-nav-spacer" />
        <span className="admin-nav-user">{adminUser.email} · {adminUser.role}</span>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary btn-sm">Sign out</button>
        </form>
      </nav>

      <div className="admin-page">
        <h1 className="admin-page-title">Dataset Management</h1>

        {/* Current published version */}
        <div className="admin-card">
          <p className="admin-card-title">Published Version</p>
          {currentVersion ? (
            <p>
              <strong>v{currentVersion.dataset_version}</strong>
              <span className="text-muted"> — published {new Date(currentVersion.published_at).toLocaleString()}</span>
            </p>
          ) : (
            <p className="text-muted">No dataset published yet. Draft data will be served via the fallback bundle.</p>
          )}
        </div>

        {/* Publish panel (owner only) */}
        {isOwner && publishPreview && (
          <div className="publish-panel">
            <p className="publish-panel-title">Publish Dataset</p>

            {publishPreview.validationErrors.length > 0 ? (
              <div>
                <p className="text-danger" style={{ marginBottom: 8 }}>
                  ⛔ {publishPreview.validationErrors.length} validation error(s) block publish:
                </p>
                <ul className="change-list">
                  {publishPreview.validationErrors.map((e, i) => (
                    <li key={i}><strong>{e.entity}:</strong> {e.message}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>
                {publishPreview.warnings.length > 0 && (
                  <div className="alert alert-warn" style={{ marginBottom: 12 }}>
                    ⚠️ {publishPreview.warnings.length} warning(s) — publish is allowed but review recommended.
                  </div>
                )}
                {publishPreview.changeSummary && (
                  <ul className="change-list">
                    {publishPreview.changeSummary.treksAdded.length > 0 && (
                      <li>Treks added: {publishPreview.changeSummary.treksAdded.join(', ')}</li>
                    )}
                    {publishPreview.changeSummary.treksRemoved.length > 0 && (
                      <li className="text-danger">Treks removed: {publishPreview.changeSummary.treksRemoved.join(', ')}</li>
                    )}
                    {publishPreview.changeSummary.altitudeChanges.map((ch, i) => (
                      <li key={i} className="change-altitude">
                        Altitude change: {ch.trekNameEn} / {ch.locationNameEn}: {ch.oldAltitudeM}m → {ch.newAltitudeM}m
                      </li>
                    ))}
                    {publishPreview.changeSummary.locationsAdded.length > 0 && (
                      <li>Locations added: {publishPreview.changeSummary.locationsAdded.length}</li>
                    )}
                    {publishPreview.changeSummary.locationsRemoved.length > 0 && (
                      <li className="text-danger">Locations removed: {publishPreview.changeSummary.locationsRemoved.length}</li>
                    )}
                  </ul>
                )}
                <form action={publishDataset} style={{ marginTop: 12 }}>
                  <input type="hidden" name="confirmed" value="true" />
                  <button type="submit" className="btn btn-success">
                    Publish Dataset
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Countries + Treks */}
        {(countries ?? []).map(country => {
          const countryTreks = (treks ?? []).filter(t => t.country_id === country.id);
          return (
            <div key={country.id} className="admin-card">
              <div className="admin-section-header">
                <p className="admin-card-title">
                  {country.name_en} ({country.country_code})
                  {!country.is_active && <span className="badge badge-red" style={{ marginLeft: 8 }}>inactive</span>}
                </p>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Trek ID</th>
                    <th>Name</th>
                    <th>Popular</th>
                    <th>Active</th>
                    <th>Review</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {countryTreks.map(trek => (
                    <tr key={trek.id}>
                      <td><code style={{ fontSize: 11 }}>{trek.trek_id}</code></td>
                      <td>{trek.name_en}</td>
                      <td>{trek.is_popular ? '★' : ''}</td>
                      <td>
                        <span className={`badge ${trek.is_active ? 'badge-green' : 'badge-red'}`}>
                          {trek.is_active ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td>
                        {trek.needs_review && <span className="needs-review-flag">⚠ review</span>}
                      </td>
                      <td>
                        <Link href={`/admin/dataset/${trek.trek_id}`} className="btn btn-secondary btn-sm">
                          Locations
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add trek form */}
              <details style={{ marginTop: 16 }}>
                <summary className="text-muted" style={{ cursor: 'pointer' }}>+ Add trek to {country.name_en}</summary>
                <form action={createTrek} className="admin-form" style={{ marginTop: 12, maxWidth: 600 }}>
                  <input type="hidden" name="country_id" value={country.id} />
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Trek ID (slug)</label>
                      <input name="trek_id" className="form-input" placeholder="e.g. annapurna_circuit" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Region</label>
                      <input name="region" className="form-input" placeholder="e.g. Annapurna region" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Name (English)</label>
                      <input name="name_en" className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Name (Hebrew)</label>
                      <input name="name_he" className="form-input" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aliases (comma-separated)</label>
                    <input name="aliases" className="form-input" placeholder="annapurna, אנאפורנה" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Popular?</label>
                      <select name="is_popular" className="form-select">
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sort order</label>
                      <input name="sort_order" type="number" className="form-input" defaultValue="0" />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Add Trek</button>
                  </div>
                </form>
              </details>
            </div>
          );
        })}

        {/* Add country form */}
        <div className="admin-card">
          <p className="admin-card-title">Add Country</p>
          <form action={createCountry} className="admin-form" style={{ maxWidth: 500 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Country Code (slug)</label>
                <input name="country_code" className="form-input" placeholder="e.g. peru" required />
              </div>
              <div className="form-group">
                <label className="form-label">Sort order</label>
                <input name="sort_order" type="number" className="form-input" defaultValue="0" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name (English)</label>
                <input name="name_en" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Name (Hebrew)</label>
                <input name="name_he" className="form-input" required />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Add Country</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
