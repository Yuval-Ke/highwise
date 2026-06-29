import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logoutAction } from '../../login/actions';
import { createLocation, updateLocation, deleteLocation, updateTrek, cloneTrek } from '../actions';

export const dynamic = 'force-dynamic';

const SECTIONS = ['pre_trek', 'on_route', 'ascent', 'descent', 'side_trip'];
const LOCATION_TYPES = ['village', 'city', 'settlement', 'camp', 'lodge_area', 'pass', 'junction'];

export default async function TrekDetailPage({
  params,
}: {
  params: Promise<{ trekId: string }>;
}) {
  const { trekId } = await params;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/admin/login');

  const adminUser = await requireAdmin(user.id);
  if (!adminUser) redirect('/admin/login?error=unauthorized');

  // ── Data ──────────────────────────────────────────────────────────────────
  const supabase = createServerSupabaseClient();

  const { data: trek } = await supabase
    .from('treks')
    .select('id, trek_id, country_id, name_en, name_he, aliases, region, is_popular, is_active, needs_review, sort_order')
    .eq('trek_id', trekId)
    .maybeSingle();

  if (!trek) notFound();

  const { data: locations } = await supabase
    .from('locations')
    .select('id, location_id, name_en, name_he, aliases, altitude_m, route_order, section, location_type, needs_review, is_active')
    .eq('trek_id', trek.id)
    .order('route_order');

  return (
    <div>
      <nav className="admin-nav">
        <span className="admin-nav-brand">HighWise Admin</span>
        <Link href="/admin/dataset" className="admin-nav-link">Dataset</Link>
        <Link href="/admin/dashboard" className="admin-nav-link">Dashboard</Link>
        <Link href="/admin/audit" className="admin-nav-link">Audit</Link>
        <Link href="/admin/logs" className="admin-nav-link">Logs</Link>
        <Link href="/admin/import" className="admin-nav-link">Import</Link>
        <span className="admin-nav-link active">{trek.name_en}</span>
        <div className="admin-nav-spacer" />
        <span className="admin-nav-user">{adminUser.email} · {adminUser.role}</span>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary btn-sm">Sign out</button>
        </form>
      </nav>

      <div className="admin-page">
        <h1 className="admin-page-title">
          {trek.name_en}
          {trek.needs_review && <span className="needs-review-flag" style={{ marginLeft: 12 }}>⚠ needs review</span>}
          {!trek.is_active && <span className="badge badge-red" style={{ marginLeft: 8 }}>inactive</span>}
        </h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Trek ID: <code>{trek.trek_id}</code> · {trek.name_he}
        </p>

        {/* Trek edit */}
        <div className="admin-card">
          <p className="admin-card-title">Trek Settings</p>
          <form action={updateTrek} className="admin-form" style={{ maxWidth: 600 }}>
            <input type="hidden" name="id" value={trek.id} />
            <input type="hidden" name="trek_id" value={trek.trek_id} />
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name (English)</label>
                <input name="name_en" className="form-input" defaultValue={trek.name_en} required />
              </div>
              <div className="form-group">
                <label className="form-label">Name (Hebrew)</label>
                <input name="name_he" className="form-input" defaultValue={trek.name_he} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Region</label>
                <input name="region" className="form-input" defaultValue={trek.region} />
              </div>
              <div className="form-group">
                <label className="form-label">Sort order</label>
                <input name="sort_order" type="number" className="form-input" defaultValue={trek.sort_order} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Aliases (comma-separated)</label>
              <input name="aliases" className="form-input" defaultValue={(trek.aliases ?? []).join(', ')} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Popular?</label>
                <select name="is_popular" className="form-select" defaultValue={String(trek.is_popular)}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Active?</label>
                <select name="is_active" className="form-select" defaultValue={String(trek.is_active)}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Needs review?</label>
                <select name="needs_review" className="form-select" defaultValue={String(trek.needs_review)}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save Trek</button>
            </div>
          </form>

          {/* Clone trek */}
          <details style={{ marginTop: 20 }}>
            <summary className="text-muted" style={{ cursor: 'pointer' }}>Clone this trek…</summary>
            <form action={cloneTrek} className="admin-form" style={{ marginTop: 12, maxWidth: 500 }}>
              <input type="hidden" name="source_trek_id" value={trek.id} />
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">New trek ID (slug)</label>
                  <input name="new_trek_id" className="form-input" placeholder={`${trek.trek_id}_v2`} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New name (English)</label>
                  <input name="new_name_en" className="form-input" defaultValue={`${trek.name_en} (copy)`} required />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-secondary">Clone Trek + Locations</button>
              </div>
            </form>
          </details>
        </div>

        {/* Locations table */}
        <div className="admin-card">
          <div className="admin-section-header">
            <p className="admin-card-title">Locations ({(locations ?? []).length})</p>
          </div>

          <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>ID</th>
                <th>Name</th>
                <th>Altitude (m)</th>
                <th>Section</th>
                <th>Type</th>
                <th>Active</th>
                <th>Review</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(locations ?? []).map(loc => (
                <tr key={loc.id}>
                  <td>{loc.route_order}</td>
                  <td><code style={{ fontSize: 11 }}>{loc.location_id}</code></td>
                  <td>
                    {loc.name_en}<br />
                    <span className="text-muted">{loc.name_he}</span>
                  </td>
                  <td><strong>{loc.altitude_m}</strong></td>
                  <td>{loc.section}</td>
                  <td>{loc.location_type}</td>
                  <td>
                    <span className={`badge ${loc.is_active ? 'badge-green' : 'badge-red'}`}>
                      {loc.is_active ? 'yes' : 'no'}
                    </span>
                  </td>
                  <td>{loc.needs_review && <span className="needs-review-flag">⚠</span>}</td>
                  <td>
                    <details>
                      <summary className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>Edit</summary>
                      <form action={updateLocation} className="admin-form" style={{ padding: '12px 0', minWidth: 500 }}>
                        <input type="hidden" name="id" value={loc.id} />
                        <input type="hidden" name="trek_slug" value={trek.trek_id} />
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Name EN</label>
                            <input name="name_en" className="form-input" defaultValue={loc.name_en} required />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Name HE</label>
                            <input name="name_he" className="form-input" defaultValue={loc.name_he} required />
                          </div>
                        </div>
                        <div className="form-row-3">
                          <div className="form-group">
                            <label className="form-label">Altitude (m)</label>
                            <input name="altitude_m" type="number" className="form-input" defaultValue={loc.altitude_m} required />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Route order</label>
                            <input name="route_order" type="number" className="form-input" defaultValue={loc.route_order} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Section</label>
                            <select name="section" className="form-select" defaultValue={loc.section}>
                              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Location type</label>
                            <select name="location_type" className="form-select" defaultValue={loc.location_type}>
                              {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Active?</label>
                            <select name="is_active" className="form-select" defaultValue={String(loc.is_active)}>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Needs review?</label>
                            <select name="needs_review" className="form-select" defaultValue={String(loc.needs_review)}>
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Aliases (comma-separated)</label>
                          <input name="aliases" className="form-input" defaultValue={(loc.aliases ?? []).join(', ')} />
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="btn btn-primary">Save</button>
                        </div>
                      </form>
                      <form action={deleteLocation} style={{ marginTop: 8 }}>
                        <input type="hidden" name="id" value={loc.id} />
                        <input type="hidden" name="trek_slug" value={trek.trek_id} />
                        <button type="submit" className="btn btn-danger btn-sm">Delete location</button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Add location form */}
          <details style={{ marginTop: 20 }}>
            <summary className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>+ Add Location</summary>
            <form action={createLocation} className="admin-form" style={{ marginTop: 12 }}>
              <input type="hidden" name="trek_id" value={trek.id} />
              <input type="hidden" name="trek_slug" value={trek.trek_id} />
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Location ID (slug)</label>
                  <input name="location_id" className="form-input" placeholder="e.g. namche_bazaar" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Altitude (m)</label>
                  <input name="altitude_m" type="number" className="form-input" min={0} max={9000} required />
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
                <input name="aliases" className="form-input" placeholder="namche, נמצ'ה" />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Route order</label>
                  <input name="route_order" type="number" className="form-input" defaultValue="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <select name="section" className="form-select">
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location type</label>
                  <select name="location_type" className="form-select">
                    {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Needs review?</label>
                <select name="needs_review" className="form-select">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Add Location</button>
              </div>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}
