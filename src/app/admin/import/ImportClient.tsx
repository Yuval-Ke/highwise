'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { parseCsvText } from '@/lib/trekCsvImport';
import { validateCsvRows, type ValidationResult } from '@/lib/trekCsvImportValidation';
import { importTrekCsv, type ImportActionResult } from './actions';

interface Props {
  countryCodes: string[];
  adminEmail: string;
  adminRole: string;
  logoutAction: () => Promise<void>;
}

type PageState =
  | { kind: 'idle' }
  | { kind: 'previewing'; validation: ValidationResult }
  | { kind: 'importing' }
  | { kind: 'conflict'; result: Extract<ImportActionResult, { status: 'conflict' }> }
  | { kind: 'resolving' }
  | { kind: 'success'; trekId: string; locationCount: number; mode: string }
  | { kind: 'error'; message: string };

export default function ImportClient({ countryCodes, adminEmail, adminRole, logoutAction }: Props) {
  const [csvText, setCsvText] = useState('');
  const [pageState, setPageState] = useState<PageState>({ kind: 'idle' });

  const handleCsvChange = useCallback((text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setPageState({ kind: 'idle' });
      return;
    }
    const { rows, fatalError } = parseCsvText(text);
    if (fatalError) {
      setPageState({
        kind: 'previewing',
        validation: { blockers: [fatalError], warnings: [], previewData: null, processedRows: null },
      });
      return;
    }
    const validation = validateCsvRows(rows, countryCodes);
    setPageState({ kind: 'previewing', validation });
  }, [countryCodes]);

  const handleImport = async () => {
    if (pageState.kind !== 'previewing') return;
    const { processedRows, previewData } = pageState.validation;
    if (!processedRows || !previewData) return;

    setPageState({ kind: 'importing' });
    const result = await importTrekCsv({
      countryId:   previewData.countryId,
      trekId:      previewData.trekId,
      trekNameEn:  previewData.trekNameEn,
      trekNameHe:  previewData.trekNameHe,
      region:      previewData.region,
      trekAliases: processedRows[0]?.trekAliases ?? [],
      rows:        processedRows,
    });

    if (result.status === 'success') {
      setPageState({ kind: 'success', trekId: result.trekId, locationCount: result.locationCount, mode: 'new' });
    } else if (result.status === 'conflict') {
      setPageState({ kind: 'conflict', result });
    } else {
      setPageState({ kind: 'error', message: result.message });
    }
  };

  const handleConflictResolve = async (resolution: 'replace' | 'add_only') => {
    if (pageState.kind !== 'conflict') return;
    const { rows, fatalError } = parseCsvText(csvText);
    if (fatalError) return;
    const validation = validateCsvRows(rows, countryCodes);
    if (!validation.processedRows || !validation.previewData) return;

    setPageState({ kind: 'resolving' });
    const result = await importTrekCsv({
      countryId:          validation.previewData.countryId,
      trekId:             validation.previewData.trekId,
      trekNameEn:         validation.previewData.trekNameEn,
      trekNameHe:         validation.previewData.trekNameHe,
      region:             validation.previewData.region,
      trekAliases:        validation.processedRows[0]?.trekAliases ?? [],
      rows:               validation.processedRows,
      conflictResolution: resolution,
    });

    if (result.status === 'success') {
      setPageState({
        kind: 'success',
        trekId: result.trekId,
        locationCount: result.locationCount,
        mode: resolution === 'replace' ? 'replace' : 'add_only',
      });
    } else {
      setPageState({ kind: 'error', message: result.status === 'error' ? result.message : 'Unexpected error.' });
    }
  };

  const handleReset = () => {
    setCsvText('');
    setPageState({ kind: 'idle' });
  };

  const validation = pageState.kind === 'previewing' ? pageState.validation : null;
  const canImport = validation !== null && validation.blockers.length === 0 && validation.processedRows !== null;
  const isLoading = pageState.kind === 'importing' || pageState.kind === 'resolving';

  return (
    <div>
      <nav className="admin-nav">
        <span className="admin-nav-brand">HighWise Admin</span>
        <Link href="/admin/dataset" className="admin-nav-link">Dataset</Link>
        <Link href="/admin/dashboard" className="admin-nav-link">Dashboard</Link>
        <Link href="/admin/audit" className="admin-nav-link">Audit</Link>
        <Link href="/admin/logs" className="admin-nav-link">Logs</Link>
        <Link href="/admin/import" className="admin-nav-link active">Import</Link>
        <div className="admin-nav-spacer" />
        <span className="admin-nav-user">{adminEmail} · {adminRole}</span>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary btn-sm">Sign out</button>
        </form>
      </nav>

      <div className="admin-page">
        <h1 className="admin-page-title">Import Trek CSV</h1>

        {/* ── Success ─────────────────────────────────────────────────────── */}
        {pageState.kind === 'success' && (
          <div>
            <div className="form-success" style={{ marginBottom: 20, fontSize: 14 }}>
              ✓ Imported as draft: <strong>{pageState.trekId}</strong> — {pageState.locationCount} location(s)
              {pageState.mode === 'replace' && ' (existing locations replaced)'}
              {pageState.mode === 'add_only' && ' (new locations added)'}
              . Review and publish from <Link href="/admin/dataset" style={{ color: '#22543d' }}>Dataset Management</Link>.
            </div>
            <button className="btn btn-secondary" onClick={handleReset}>Import another trek</button>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {pageState.kind === 'error' && (
          <div>
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              Import failed: {pageState.message}
            </div>
            <button className="btn btn-secondary" onClick={() => setPageState({ kind: 'previewing', validation: validateCsvRows(parseCsvText(csvText).rows, countryCodes) })}>
              Back
            </button>
          </div>
        )}

        {/* ── Conflict dialog ──────────────────────────────────────────────── */}
        {pageState.kind === 'conflict' && (
          <div className="admin-card">
            <p className="admin-card-title" style={{ color: '#c05621' }}>⚠ Trek already exists</p>
            <p style={{ marginBottom: 16 }}>
              A trek with ID <code>{pageState.result.existingTrek.trekId}</code> already exists
              (<strong>{pageState.result.existingTrek.nameEn}</strong> — {pageState.result.existingTrek.locationCount} location(s)).
              Choose how to continue:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
              <button
                className="btn btn-warning"
                disabled={isLoading}
                onClick={() => handleConflictResolve('replace')}
              >
                Replace existing draft locations
              </button>
              <button
                className="btn btn-primary"
                disabled={isLoading}
                onClick={() => handleConflictResolve('add_only')}
              >
                Add only new locations
              </button>
              <button
                className="btn btn-secondary"
                disabled={isLoading}
                onClick={() => setPageState({ kind: 'previewing', validation: validateCsvRows(parseCsvText(csvText).rows, countryCodes) })}
              >
                Cancel — go back to preview
              </button>
            </div>
            {isLoading && <p className="text-muted" style={{ marginTop: 12 }}>Importing…</p>}
          </div>
        )}

        {/* ── Main import form (idle / previewing / importing) ─────────────── */}
        {(pageState.kind === 'idle' || pageState.kind === 'previewing' || pageState.kind === 'importing') && (
          <>
            <div className="admin-card">
              <p className="admin-card-title">Paste CSV</p>
              <p className="text-muted" style={{ marginBottom: 12 }}>
                Paste a ChatGPT-generated trek CSV. Preview and validation appear automatically.
              </p>
              <div className="form-group">
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 180, fontFamily: 'monospace', fontSize: 12 }}
                  placeholder={`countryId,trekId,trekNameEn,trekNameHe,region,trekAliases,locationId,nameEn,nameHe,altitudeMeters,order,section,locationType,aliases,needsReview,sourceNotes\nnepal,manaslu_circuit,...`}
                  value={csvText}
                  onChange={e => handleCsvChange(e.target.value)}
                  disabled={isLoading}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* ── Blockers ──────────────────────────────────────────────────── */}
            {validation && validation.blockers.length > 0 && (
              <div className="admin-card">
                <p className="admin-card-title" style={{ color: '#c53030' }}>
                  ⛔ {validation.blockers.length} blocker(s) — fix before importing
                </p>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {validation.blockers.map((b, i) => (
                    <li key={i} className="text-danger" style={{ fontSize: 13, marginBottom: 4 }}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Warnings ──────────────────────────────────────────────────── */}
            {validation && validation.warnings.length > 0 && (
              <div className="alert alert-warn">
                <strong>⚠ {validation.warnings.length} warning(s)</strong>
                <ul style={{ paddingLeft: 20, margin: '8px 0 0 0' }}>
                  {validation.warnings.map((w, i) => (
                    <li key={i} style={{ fontSize: 12, marginBottom: 2 }}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Preview summary ───────────────────────────────────────────── */}
            {validation?.previewData && (
              <div className="admin-card">
                <p className="admin-card-title">Preview</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Country',    value: validation.previewData.countryId },
                    { label: 'Trek ID',    value: validation.previewData.trekId },
                    { label: 'Name EN',    value: validation.previewData.trekNameEn },
                    { label: 'Name HE',    value: validation.previewData.trekNameHe || '—' },
                    { label: 'Region',     value: validation.previewData.region || '—' },
                    { label: 'Locations',  value: String(validation.previewData.locationCount) },
                    { label: 'Min alt.',   value: `${validation.previewData.minAltitude}m` },
                    { label: 'Max alt.',   value: `${validation.previewData.maxAltitude}m` },
                    { label: 'Needs review', value: `${validation.previewData.needsReviewCount} / ${validation.previewData.locationCount}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px' }}>
                      <div className="text-muted" style={{ fontSize: 11, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Location table */}
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Location ID</th>
                        <th>Name EN</th>
                        <th>Name HE</th>
                        <th>Alt (m)</th>
                        <th>Section</th>
                        <th>Type</th>
                        <th>Review</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.previewData.rows.map((r, i) => (
                        <tr key={i}>
                          <td>{r.order}</td>
                          <td><code style={{ fontSize: 11 }}>{r.locationId}</code></td>
                          <td>{r.nameEn}</td>
                          <td>{r.nameHe || <span className="text-muted">—</span>}</td>
                          <td><strong>{r.altitudeMeters}</strong></td>
                          <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{r.section}</span></td>
                          <td>{r.locationType}</td>
                          <td>{r.needsReview && <span className="needs-review-flag">⚠</span>}</td>
                          <td><span className="text-muted" style={{ fontSize: 11 }}>{r.sourceNotes || '—'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="form-actions" style={{ marginTop: 16 }}>
                  <button
                    className="btn btn-primary"
                    disabled={!canImport || isLoading}
                    onClick={handleImport}
                  >
                    {isLoading ? 'Importing…' : 'Import as Draft'}
                  </button>
                  <span className="text-muted" style={{ fontSize: 12, alignSelf: 'center' }}>
                    Data will not be published until you click Publish Dataset in Dataset Management.
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
