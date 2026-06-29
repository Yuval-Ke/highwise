'use client';

import { useState } from 'react';
import { softDeleteLogs } from './actions';

export type LogItem = {
  id: string;
  created_at: string;
  risk_result: string | null;
  trek_id: string | null;
  device_category: string | null;
  lls_score: number | null;
};

function riskBadgeClass(risk: string | null): string {
  if (risk === 'green')  return 'badge badge-green';
  if (risk === 'red')    return 'badge badge-red';
  if (risk === 'yellow') return 'badge badge-yellow';
  return 'badge badge-gray';
}

export default function LogsClient({ rows }: { rows: LogItem[] }) {
  const [allChecked, setAllChecked] = useState(false);

  if (rows.length === 0) {
    return <p className="text-muted">No assessment logs.</p>;
  }

  return (
    <form action={softDeleteLogs}>
      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>
              <input
                type="checkbox"
                aria-label="Select all on page"
                checked={allChecked}
                onChange={(e) => setAllChecked(e.target.checked)}
              />
            </th>
            <th>When (UTC)</th>
            <th>Risk</th>
            <th>Trek</th>
            <th>Device</th>
            <th>LLS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input type="checkbox" name="ids" value={row.id} defaultChecked={allChecked} key={`${row.id}-${allChecked}`} />
              </td>
              <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                {row.created_at.slice(0, 19).replace('T', ' ')}
              </td>
              <td><span className={riskBadgeClass(row.risk_result)}>{row.risk_result ?? '—'}</span></td>
              <td style={{ fontFamily: 'monospace' }}>{row.trek_id ?? '—'}</td>
              <td>{row.device_category ?? '—'}</td>
              <td>{row.lls_score ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="submit" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
        Soft-delete selected
      </button>
    </form>
  );
}
