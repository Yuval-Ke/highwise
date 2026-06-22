import type { PublicAppConfig } from '@/types/backend';

export const APP_VERSION = '0.3.0';
const CACHE_KEY = 'nativ_app_config_cache';

export function getCachedConfig(): PublicAppConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PublicAppConfig;
  } catch {
    return null;
  }
}

export function setCachedConfig(config: PublicAppConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(config));
}

export function clearCachedConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

/** Fetches fresh config from /api/public/config. Times out after 5 s. */
export async function fetchConfig(): Promise<PublicAppConfig | null> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/api/public/config', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    const config = (await res.json()) as PublicAppConfig;
    setCachedConfig(config);
    return config;
  } catch {
    return null;
  }
}

/** Compares semver strings. Returns true if `current` is below `minimum`. */
export function isVersionTooOld(current: string, minimum: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [ca, cb, cc] = parse(current);
  const [ma, mb, mc] = parse(minimum);
  if (ca !== ma) return ca < ma;
  if (cb !== mb) return cb < mb;
  return cc < mc;
}
