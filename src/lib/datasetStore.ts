import type { PublishedDataset, PublishedLocation, PublishedTrek } from '@/types/backend';
import { NEPAL_DATA, type NCountry, type NTrek, type NLocation } from './nepalData';

export const DATASET_CACHE_KEY = 'nativ_dataset_cache';
export const DATASET_VERSION_KEY = 'nativ_dataset_version';

// ── Cache management ──────────────────────────────────────────────────────────

export function getCachedDataset(): PublishedDataset | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DATASET_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PublishedDataset;
  } catch {
    return null;
  }
}

export function setCachedDataset(dataset: PublishedDataset): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DATASET_CACHE_KEY, JSON.stringify(dataset));
  localStorage.setItem(DATASET_VERSION_KEY, dataset.datasetVersion);
}

export function getCachedDatasetVersion(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DATASET_VERSION_KEY);
}

/** Fetches dataset from /api/public/dataset. Times out after 10 s. Returns null on error. */
export async function fetchDataset(): Promise<PublishedDataset | null> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    const res = await fetch('/api/public/dataset', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    const dataset = (await res.json()) as PublishedDataset;
    // Basic shape validation before caching
    if (!dataset.countries || !dataset.treks || !dataset.locations) return null;
    setCachedDataset(dataset);
    return dataset;
  } catch {
    return null;
  }
}

// ── Conversion: PublishedDataset → NCountry (for Nepal) ──────────────────────

function publishedLocationToNLocation(l: PublishedLocation): NLocation {
  return {
    locationId: l.locationId,
    nameEn:     l.nameEn,
    nameHe:     l.nameHe,
    aliases:    l.aliases,
    altitudeMeters: l.altitudeM,
    order:      l.routeOrder,
    section:    l.section as NLocation['section'],
    locationType: l.locationType as NLocation['locationType'],
    sourceNote: '',
  };
}

function publishedTrekToNTrek(
  t: PublishedTrek,
  locations: PublishedLocation[]
): NTrek {
  return {
    trekId:    t.trekId,
    nameEn:    t.nameEn,
    nameHe:    t.nameHe,
    region:    t.region,
    aliases:   t.aliases,
    popular:   t.isPopular,
    locations: locations
      .filter(l => l.trekId === t.trekId)
      .sort((a, b) => a.routeOrder - b.routeOrder)
      .map(publishedLocationToNLocation),
  };
}

function datasetToNCountry(dataset: PublishedDataset, countryCode: string): NCountry | null {
  const country = dataset.countries.find(c => c.countryCode === countryCode);
  if (!country) return null;
  const treks = dataset.treks
    .filter(t => t.countryCode === countryCode)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(t => publishedTrekToNTrek(t, dataset.locations));

  return {
    countryId: 'nepal',
    nameEn:    country.nameEn,
    nameHe:    country.nameHe,
    treks,
  };
}

// ── Public API: active Nepal data ─────────────────────────────────────────────

/**
 * Returns the best available Nepal dataset following the fallback chain:
 *   1. Cached synced dataset (from nativ_dataset_cache)
 *   2. Bundled nepalData.ts
 *
 * Safe to call synchronously on the client. Never throws.
 */
export function getActiveNepalData(): NCountry {
  const cached = getCachedDataset();
  if (cached) {
    const converted = datasetToNCountry(cached, 'nepal');
    if (converted && converted.treks.length > 0) return converted;
  }
  return NEPAL_DATA;
}

// ── Active-dataset helpers (replace nepalData.ts helpers for dynamic data) ────

export function getActiveTrekById(trekId: string): NTrek | undefined {
  return getActiveNepalData().treks.find(t => t.trekId === trekId);
}

export function getActivePopularTreks(): NTrek[] {
  return getActiveNepalData().treks.filter(t => t.popular);
}

export function getActiveTreksByRegion(): Map<string, NTrek[]> {
  const map = new Map<string, NTrek[]>();
  for (const trek of getActiveNepalData().treks) {
    const bucket = map.get(trek.region) ?? [];
    bucket.push(trek);
    map.set(trek.region, bucket);
  }
  return map;
}

export function searchActiveTreks(query: string): NTrek[] {
  const treks = getActiveNepalData().treks;
  const q = query.trim().toLowerCase();
  if (!q) return treks;
  return treks.filter(t => {
    const hay = [t.nameEn.toLowerCase(), t.nameHe, ...t.aliases.map(a => a.toLowerCase())].join(' ');
    return hay.includes(q);
  });
}
