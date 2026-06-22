/**
 * Tests for publish service: validation rules, change summary, schema integrity.
 * Supabase is mocked — no real network calls.
 */

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildAndValidateSnapshot, commitSnapshot } from '@/lib/publishService';
import type { PublishedDataset } from '@/types/backend';

const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>;

// ── DB fixture helpers ────────────────────────────────────────────────────────

const COUNTRY = {
  id: 'cid-1',
  country_code: 'nepal',
  name_en: 'Nepal',
  name_he: 'נפאל',
  sort_order: 1,
};

const TREK = {
  id: 'tid-1',
  trek_id: 'everest_base_camp',
  country_id: 'cid-1',
  name_en: 'Everest Base Camp',
  name_he: 'מחנה הבסיס של האוורסט',
  aliases: ['ebc'],
  region: 'Everest region',
  is_popular: true,
  sort_order: 1,
  needs_review: false,
};

const LOCATION = {
  id: 'lid-1',
  trek_id: 'tid-1',
  location_id: 'lukla',
  name_en: 'Lukla',
  name_he: 'לוקלה',
  aliases: ['lukla airport'],
  altitude_m: 2860,
  route_order: 10,
  section: 'pre_trek',
  location_type: 'village',
  needs_review: false,
};

function buildMock(
  countries = [COUNTRY],
  treks = [TREK],
  locations = [LOCATION],
  currentVersionPayload: unknown = null
) {
  const maybeSingleMock = jest.fn().mockResolvedValue({
    data: currentVersionPayload
      ? { payload_json: currentVersionPayload, dataset_version: '1.0.0' }
      : null,
    error: null,
  });
  const eqCurrentMock  = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const selectCurrentMock = jest.fn().mockReturnValue({ eq: eqCurrentMock });

  const fromMock = jest.fn().mockImplementation((table: string) => {
    if (table === 'countries') {
      const orderMock = jest.fn().mockResolvedValue({ data: countries, error: null });
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ order: orderMock }) }) };
    }
    if (table === 'treks') {
      const orderMock = jest.fn().mockResolvedValue({ data: treks, error: null });
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ order: orderMock }) }) };
    }
    if (table === 'locations') {
      const orderMock = jest.fn().mockResolvedValue({ data: locations, error: null });
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ order: orderMock }) }) };
    }
    if (table === 'dataset_versions') {
      return {
        select: selectCurrentMock,
        update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });

  mockCreateClient.mockReturnValue({ from: fromMock } as never);
  return { fromMock };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('buildAndValidateSnapshot()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a valid snapshot for well-formed data', async () => {
    buildMock();
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors).toHaveLength(0);
    expect(result.snapshot).not.toBeNull();
    expect(result.snapshot!.countries).toHaveLength(1);
    expect(result.snapshot!.treks).toHaveLength(1);
    expect(result.snapshot!.locations).toHaveLength(1);
  });

  it('snapshot contains schemaVersion, datasetVersion, publishedAt', async () => {
    buildMock();
    const result = await buildAndValidateSnapshot();
    expect(result.snapshot!.schemaVersion).toBe('1');
    expect(result.snapshot!.datasetVersion).toBeTruthy();
    expect(result.snapshot!.publishedAt).toBeTruthy();
  });

  it('blocks publish when trek has no active locations', async () => {
    buildMock([COUNTRY], [TREK], []);
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.validationErrors.some(e => e.message.includes('no active locations'))).toBe(true);
    expect(result.snapshot).toBeNull();
  });

  it('blocks publish when location has missing English name', async () => {
    buildMock([COUNTRY], [TREK], [{ ...LOCATION, name_en: '' }]);
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors.some(e => e.message.includes('Missing English name'))).toBe(true);
  });

  it('blocks publish when location has missing Hebrew name', async () => {
    buildMock([COUNTRY], [TREK], [{ ...LOCATION, name_he: '' }]);
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors.some(e => e.message.includes('Missing Hebrew name'))).toBe(true);
  });

  it('blocks publish when altitude is out of range', async () => {
    buildMock([COUNTRY], [TREK], [{ ...LOCATION, altitude_m: -100 }]);
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors.some(e => e.message.includes('out of range'))).toBe(true);
  });

  it('blocks publish when aliases array is empty', async () => {
    buildMock([COUNTRY], [TREK], [{ ...LOCATION, aliases: [] }]);
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors.some(e => e.message.includes('Aliases'))).toBe(true);
  });

  it('blocks publish when section is invalid', async () => {
    buildMock([COUNTRY], [TREK], [{ ...LOCATION, section: 'invalid_section' }]);
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors.some(e => e.message.includes('Invalid section'))).toBe(true);
  });

  it('blocks publish when locationType is invalid', async () => {
    buildMock([COUNTRY], [TREK], [{ ...LOCATION, location_type: 'unknown_type' }]);
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors.some(e => e.message.includes('Invalid locationType'))).toBe(true);
  });

  it('blocks publish when duplicate locationId within same trek', async () => {
    buildMock([COUNTRY], [TREK], [LOCATION, { ...LOCATION, id: 'lid-2' }]);
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors.some(e => e.message.includes('Duplicate locationId'))).toBe(true);
  });

  it('adds warning (not error) when needsReview is set on a location', async () => {
    buildMock([COUNTRY], [TREK], [{ ...LOCATION, needs_review: true }]);
    const result = await buildAndValidateSnapshot();
    expect(result.validationErrors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.snapshot).not.toBeNull();
  });

  it('snapshot does not expose internal admin fields', async () => {
    buildMock();
    const result = await buildAndValidateSnapshot();
    const str = JSON.stringify(result.snapshot);
    for (const field of ['needs_review', 'is_active', 'published_by', 'admin_notes', 'is_sensitive']) {
      expect(str).not.toContain(`"${field}"`);
    }
  });

  it('altitude changes appear in change summary', async () => {
    const currentPublished = {
      schemaVersion: '1',
      datasetVersion: '1.0.0',
      publishedAt: '2026-01-01T00:00:00Z',
      countries: [{ countryCode: 'nepal', nameEn: 'Nepal', nameHe: 'נפאל', sortOrder: 1 }],
      treks: [{
        trekId: 'everest_base_camp', countryCode: 'nepal',
        nameEn: 'Everest Base Camp', nameHe: 'מחנה הבסיס', aliases: ['ebc'],
        region: 'Everest region', isPopular: true, sortOrder: 1,
      }],
      locations: [{
        locationId: 'lukla', trekId: 'everest_base_camp',
        nameEn: 'Lukla', nameHe: 'לוקלה', aliases: ['lukla airport'],
        altitudeM: 2500,
        routeOrder: 10, section: 'pre_trek', locationType: 'village',
      }],
    };

    buildMock([COUNTRY], [TREK], [LOCATION], currentPublished);
    const result = await buildAndValidateSnapshot();
    expect(result.changeSummary).not.toBeNull();
    expect(result.changeSummary!.altitudeChanges.length).toBeGreaterThan(0);
    const change = result.changeSummary!.altitudeChanges[0];
    expect(change.oldAltitudeM).toBe(2500);
    expect(change.newAltitudeM).toBe(2860);
  });

  it('version increments from current published version', async () => {
    const currentPublished = {
      schemaVersion: '1', datasetVersion: '1.0.0', publishedAt: '2026-01-01T00:00:00Z',
      countries: [], treks: [], locations: [],
    };
    buildMock([COUNTRY], [TREK], [LOCATION], currentPublished);
    const result = await buildAndValidateSnapshot();
    expect(result.snapshot!.datasetVersion).toBe('1.0.1');
  });

  it('first publish uses version 1.0.0 when no prior version exists', async () => {
    buildMock();
    const result = await buildAndValidateSnapshot();
    expect(result.snapshot!.datasetVersion).toBe('1.0.0');
  });
});

// ── commitSnapshot() ──────────────────────────────────────────────────────────

const SAMPLE_SNAPSHOT: PublishedDataset = {
  schemaVersion: '1',
  datasetVersion: 'v0.3.0-nepal-initial',
  publishedAt: '2026-06-22T00:00:00Z',
  countries: [],
  treks: [],
  locations: [],
};

function buildCommitMock() {
  const upsertMock  = jest.fn().mockResolvedValue({ error: null });
  const insertMock  = jest.fn().mockResolvedValue({ error: null });
  const eqMock      = jest.fn().mockResolvedValue({ error: null });
  const updateMock  = jest.fn().mockReturnValue({ eq: eqMock });

  const fromMock = jest.fn().mockImplementation((table: string) => {
    if (table === 'dataset_versions') return { update: updateMock, insert: insertMock };
    if (table === 'app_config')       return { upsert: upsertMock };
    return {};
  });

  mockCreateClient.mockReturnValue({ from: fromMock } as never);
  return { fromMock, updateMock, eqMock, insertMock, upsertMock };
}

describe('commitSnapshot()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts into dataset_versions with is_current=true', async () => {
    const { insertMock } = buildCommitMock();
    await commitSnapshot(SAMPLE_SNAPSHOT, 'user-abc');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ dataset_version: 'v0.3.0-nepal-initial', is_current: true, published_by: 'user-abc' })
    );
  });

  it('clears previous is_current before inserting', async () => {
    const { updateMock, eqMock } = buildCommitMock();
    await commitSnapshot(SAMPLE_SNAPSHOT, 'user-abc');
    expect(updateMock).toHaveBeenCalledWith({ is_current: false });
    expect(eqMock).toHaveBeenCalledWith('is_current', true);
  });

  it('upserts app_config dataset_version so SyncInit triggers client downloads', async () => {
    const { upsertMock } = buildCommitMock();
    await commitSnapshot(SAMPLE_SNAPSHOT, 'user-abc');
    expect(upsertMock).toHaveBeenCalledWith(
      { key: 'dataset_version', value: 'v0.3.0-nepal-initial' },
      { onConflict: 'key' }
    );
  });

  it('queries app_config table (not dataset_versions) for the config upsert', async () => {
    const { fromMock } = buildCommitMock();
    await commitSnapshot(SAMPLE_SNAPSHOT, 'user-abc');
    const calledTables = fromMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(calledTables).toContain('app_config');
    expect(calledTables).toContain('dataset_versions');
  });
});
