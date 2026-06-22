'use client';

import { useEffect, useState } from 'react';
import {
  getCachedConfig,
  fetchConfig,
  isVersionTooOld,
  APP_VERSION,
} from '@/lib/appConfigStore';
import type { PublicAppConfig } from '@/types/backend';

type Status =
  | { type: 'ok' }
  | { type: 'maintenance'; message: string | null }
  | { type: 'disabled'; message: string | null }
  | { type: 'version_too_old'; minVersion: string };

export function AppStatusGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>({ type: 'ok' });

  function applyConfig(config: PublicAppConfig) {
    if (config.appDisabled) {
      setStatus({ type: 'disabled', message: config.disabledMessage });
      return;
    }
    if (config.maintenanceMode) {
      setStatus({ type: 'maintenance', message: config.maintenanceMessage });
      return;
    }
    if (isVersionTooOld(APP_VERSION, config.minSupportedVersion)) {
      setStatus({ type: 'version_too_old', minVersion: config.minSupportedVersion });
      return;
    }
    setStatus({ type: 'ok' });
  }

  useEffect(() => {
    // Apply cached config immediately (no blocking delay)
    const cached = getCachedConfig();
    if (cached) applyConfig(cached);

    // Fetch fresh config in background
    fetchConfig().then(fresh => {
      if (fresh) applyConfig(fresh);
    });

    // Re-check when connectivity returns
    const onOnline = () => {
      fetchConfig().then(fresh => {
        if (fresh) applyConfig(fresh);
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  if (status.type === 'disabled') {
    return (
      <div style={overlay}>
        <div style={card}>
          <h2 style={heading}>האפליקציה אינה זמינה כרגע</h2>
          {status.message && <p style={body}>{status.message}</p>}
          <p style={body}>אנא נסה שוב מאוחר יותר.</p>
          <button
            style={retryBtn}
            onClick={() => fetchConfig().then(f => { if (f) applyConfig(f); })}
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (status.type === 'maintenance') {
    return (
      <>
        <div style={banner}>
          <strong>תחזוקה: </strong>
          {status.message ?? 'האפליקציה בתחזוקה. חלק מהפונקציות עלולות שלא לפעול.'}
        </div>
        {children}
      </>
    );
  }

  if (status.type === 'version_too_old') {
    return (
      <div style={overlay}>
        <div style={card}>
          <h2 style={heading}>יש לעדכן את האפליקציה</h2>
          <p style={body}>
            גרסה מינימלית נדרשת: {status.minVersion}. גרסתך הנוכחית: {APP_VERSION}.
          </p>
          <p style={body}>אנא רענן את הדף או עדכן את האפליקציה כדי להמשיך.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9999,
};

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: '32px 28px',
  maxWidth: 360,
  textAlign: 'center',
  direction: 'rtl',
};

const heading: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#1a1a2e',
};

const body: React.CSSProperties = {
  fontSize: 14, color: '#4a5568', marginBottom: 10, lineHeight: 1.6,
};

const retryBtn: React.CSSProperties = {
  marginTop: 16,
  padding: '10px 24px',
  background: '#3182ce',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
};

const banner: React.CSSProperties = {
  background: '#fef3c7',
  borderBottom: '1px solid #fcd34d',
  padding: '10px 16px',
  fontSize: 13,
  textAlign: 'center',
  direction: 'rtl',
};
