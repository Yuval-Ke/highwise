'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasValidConsent } from '@/lib/consentStore';
import { getCachedConfig } from '@/lib/appConfigStore';

const DEFAULT_CONSENT_VERSION = '1';

const GATED_PATHS = [
  '/profile',
  '/trek',
  '/assessment',
  '/symptoms',
  '/respiratory',
  '/result',
  '/three-day',
];

function isGatedPath(pathname: string): boolean {
  return GATED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function consentVersion(): string {
  const config = getCachedConfig();
  return config?.consentVersion ?? DEFAULT_CONSENT_VERSION;
}

export function ConsentGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Start allowed — useEffect redirects immediately if consent missing on gated paths.
  // This matches AppStatusGuard's pattern: render first, gate in the effect.
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    if (!isGatedPath(pathname)) {
      setAllowed(true);
      return;
    }
    if (hasValidConsent(consentVersion())) {
      setAllowed(true);
    } else {
      setAllowed(false);
      router.replace('/consent');
    }
  }, [pathname, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
