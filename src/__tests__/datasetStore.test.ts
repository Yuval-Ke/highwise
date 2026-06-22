/**
 * Tests for datasetStore fallback chain and conversion logic.
 * localStorage is mocked in each test.
 */

import type { PublishedDataset } from '@/types/backend';
import { NEPAL_DATA } from '@/lib/nepalData';

// ── localStorage mock ─────────────────────────────────────────────────────────

const store: Record<string, string> = {};
const localStorageMock = {
  getItem:    jest.fn((k: string) => store[k] ?? null),
  setItem:    jest.fn((k: string, v: string) => { store[k] = v; }),
  removeItem: jest.fn((k: string) => { delete store[k]; }),
  clear:      jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock }, writable: true });

const SAMPLE_DATASET: PublishedDataset = {
  schemaVersion: '1',
  datasetVersion: '1.0.0',
  publishedAt: '2026-06-22T10:00:00Z',
  countries: [{ countryCode: 'nepal', nameEn: 'Nepal', nameHe: 'נפאל', sortOrder: 1 }],
  treks: [{
    trekId: 'everest_base_camp',
    countryCode: 'nepal',
    nameEn: 'Everest Base Camp',
    nameHe: 'מחנה הבסיס',
    aliases: ['EBC'],
    region: 'Everest region',
    isPopular: true,
    sortOrder: 1,
  }],
  locations: [{
    locationId: 'lukla',
    trekId: 'everest_base_camp',
    nameEn: 'Lukla',
    nameHe: 'לוקלה',
    aliases: ['Tenzing-Hillary Airport'],
    altitudeM: 2860,
    routeOrder: 1,
    section: 'pre_trek',
    locationType: 'village',
  }],
};

describe('getCachedDataset / setCachedDataset', () => {
  beforeEach(() => { localStorageMock.clear(); jest.clearAllMocks(); });

  it('returns null when nothing is cached', async () => {
    const { getCachedDataset } = await import('@/lib/datasetStore');
    expect(getCachedDataset()).toBeNull();
  });

  it('returns stored dataset after setCachedDataset', async () => {
    const { getCachedDataset, setCachedDataset } = await import('@/lib/datasetStore');
    setCachedDataset(SAMPLE_DATASET);
    const result = getCachedDataset();
    expect(result).not.toBeNull();
    expect(result!.datasetVersion).toBe('1.0.0');
  });

  it('stores version in DATASET_VERSION_KEY', async () => {
    const { setCachedDataset, DATASET_VERSION_KEY, getCachedDatasetVersion } = await import('@/lib/datasetStore');
    setCachedDataset(SAMPLE_DATASET);
    expect(getCachedDatasetVersion()).toBe('1.0.0');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(DATASET_VERSION_KEY, '1.0.0');
  });
});

describe('getActiveNepalData() fallback chain', () => {
  beforeEach(() => { localStorageMock.clear(); jest.clearAllMocks(); });

  it('returns bundled NEPAL_DATA when cache is empty', async () => {
    const { getActiveNepalData } = await import('@/lib/datasetStore');
    const result = getActiveNepalData();
    expect(result).toBe(NEPAL_DATA);
  });

  it('returns converted cached dataset when cache is populated', async () => {
    const { getActiveNepalData, setCachedDataset } = await import('@/lib/datasetStore');
    setCachedDataset(SAMPLE_DATASET);
    const result = getActiveNepalData();
    expect(result.treks.length).toBeGreaterThan(0);
    expect(result.treks[0].trekId).toBe('everest_base_camp');
  });

  it('converted dataset preserves trek fields correctly', async () => {
    const { getActiveNepalData, setCachedDataset } = await import('@/lib/datasetStore');
    setCachedDataset(SAMPLE_DATASET);
    const result = getActiveNepalData();
    const trek = result.treks[0];
    expect(trek.nameEn).toBe('Everest Base Camp');
    expect(trek.nameHe).toBe('מחנה הבסיס');
    expect(trek.popular).toBe(true);
    expect(trek.aliases).toContain('EBC');
  });

  it('converted dataset maps altitudeM → altitudeMeters', async () => {
    const { getActiveNepalData, setCachedDataset } = await import('@/lib/datasetStore');
    setCachedDataset(SAMPLE_DATASET);
    const result = getActiveNepalData();
    const loc = result.treks[0].locations[0];
    expect(loc.altitudeMeters).toBe(2860);
    expect(loc.locationId).toBe('lukla');
  });

  it('falls back to NEPAL_DATA when cache has no nepal country', async () => {
    const { getActiveNepalData, setCachedDataset } = await import('@/lib/datasetStore');
    const noNepalDataset: PublishedDataset = { ...SAMPLE_DATASET, countries: [] };
    setCachedDataset(noNepalDataset);
    const result = getActiveNepalData();
    expect(result).toBe(NEPAL_DATA);
  });

  it('falls back to NEPAL_DATA when cached treks array is empty', async () => {
    const { getActiveNepalData, setCachedDataset } = await import('@/lib/datasetStore');
    const emptyTreksDataset: PublishedDataset = { ...SAMPLE_DATASET, treks: [], locations: [] };
    setCachedDataset(emptyTreksDataset);
    const result = getActiveNepalData();
    expect(result).toBe(NEPAL_DATA);
  });
});

describe('getActiveTrekById()', () => {
  beforeEach(() => { localStorageMock.clear(); jest.clearAllMocks(); });

  it('returns trek from bundled data when no cache', async () => {
    const { getActiveTrekById } = await import('@/lib/datasetStore');
    const result = getActiveTrekById('everest_base_camp');
    expect(result).toBeDefined();
    expect(result!.trekId).toBe('everest_base_camp');
  });

  it('returns undefined for unknown trek', async () => {
    const { getActiveTrekById } = await import('@/lib/datasetStore');
    expect(getActiveTrekById('nonexistent_trek')).toBeUndefined();
  });

  it('returns trek from cached dataset when cache is populated', async () => {
    const { getActiveTrekById, setCachedDataset } = await import('@/lib/datasetStore');
    setCachedDataset(SAMPLE_DATASET);
    const result = getActiveTrekById('everest_base_camp');
    expect(result).toBeDefined();
    expect(result!.locations).toHaveLength(1);
  });
});

describe('searchActiveTreks()', () => {
  beforeEach(() => { localStorageMock.clear(); jest.clearAllMocks(); });

  it('returns all treks for empty query', async () => {
    const { searchActiveTreks } = await import('@/lib/datasetStore');
    const results = searchActiveTreks('');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns matching treks by English name', async () => {
    const { searchActiveTreks } = await import('@/lib/datasetStore');
    const results = searchActiveTreks('everest');
    expect(results.some(t => t.trekId === 'everest_base_camp')).toBe(true);
  });
});

describe('Dataset sync does not break public flow', () => {
  beforeEach(() => { localStorageMock.clear(); jest.clearAllMocks(); });

  it('NEPAL_DATA still has 15 treks (bundled fallback intact)', () => {
    expect(NEPAL_DATA.treks.length).toBe(15);
  });

  it('bundled data is never replaced in memory — getActiveNepalData reads from cache each call', async () => {
    const { getActiveNepalData, setCachedDataset } = await import('@/lib/datasetStore');

    // Initially returns bundled data
    expect(getActiveNepalData()).toBe(NEPAL_DATA);

    // After caching, returns cached
    setCachedDataset(SAMPLE_DATASET);
    expect(getActiveNepalData()).not.toBe(NEPAL_DATA);

    // Clearing cache reverts to bundled
    localStorageMock.clear();
    expect(getActiveNepalData()).toBe(NEPAL_DATA);
  });
});
