/**
 * Tests for getPublishedDataset() and GET /api/public/dataset.
 *
 * @/lib/supabase/server is mocked globally — service tests exercise the real
 * getPublishedDataset() against a controlled Supabase client stub.
 * Route handler tests use jest.spyOn to stub the service function itself.
 */

// ── next/server shim ─────────────────────────────────────────────────────────
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: () => Promise.resolve(data),
    }),
  },
}));

// ── Supabase server client mock ───────────────────────────────────────────────
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPublishedDataset } from '@/lib/datasetService';
import * as datasetService from '@/lib/datasetService';
import type { PublishedDataset } from '@/types/backend';

const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<
  typeof createServerSupabaseClient
>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleDataset: PublishedDataset = {
  schemaVersion: '1',
  datasetVersion: '1.0.0',
  publishedAt: '2026-06-22T10:00:00Z',
  countries: [{ countryCode: 'nepal', nameEn: 'Nepal', nameHe: 'נפאל', sortOrder: 1 }],
  treks: [
    {
      trekId: 'everest_base_camp',
      countryCode: 'nepal',
      nameEn: 'Everest Base Camp',
      nameHe: 'מסלול בסיס אוורסט',
      aliases: ['EBC'],
      region: 'Khumbu',
      isPopular: true,
      sortOrder: 1,
    },
  ],
  locations: [
    {
      locationId: 'lukla',
      trekId: 'everest_base_camp',
      nameEn: 'Lukla',
      nameHe: 'לוקלה',
      aliases: ['Tenzing-Hillary Airport'],
      altitudeM: 2860,
      routeOrder: 1,
      section: 'ascent',
      locationType: 'village',
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDatasetSupabaseMock(
  payload: PublishedDataset | null,
  error: unknown = null
) {
  const maybeSingleMock = jest.fn().mockResolvedValue({
    data: payload ? { payload_json: payload } : null,
    error,
  });
  const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
  const fromMock = jest.fn().mockReturnValue({ select: selectMock });
  mockCreateClient.mockReturnValue({ from: fromMock } as never);
  return { fromMock, selectMock, eqMock, maybeSingleMock };
}

// ── Service: getPublishedDataset() ────────────────────────────────────────────

describe('getPublishedDataset()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when no current dataset exists', async () => {
    buildDatasetSupabaseMock(null);
    const result = await getPublishedDataset();
    expect(result).toBeNull();
  });

  it('returns the payload_json of the current dataset version', async () => {
    buildDatasetSupabaseMock(sampleDataset);
    const result = await getPublishedDataset();

    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe('1');
    expect(result!.datasetVersion).toBe('1.0.0');
    expect(result!.countries).toHaveLength(1);
    expect(result!.treks).toHaveLength(1);
    expect(result!.locations).toHaveLength(1);
  });

  it('queries only payload_json — no admin metadata selected', async () => {
    const { selectMock } = buildDatasetSupabaseMock(sampleDataset);
    await getPublishedDataset();
    expect(selectMock).toHaveBeenCalledWith('payload_json');
  });

  it('filters by is_current = true', async () => {
    const { eqMock } = buildDatasetSupabaseMock(sampleDataset);
    await getPublishedDataset();
    expect(eqMock).toHaveBeenCalledWith('is_current', true);
  });

  it('throws when Supabase returns an error', async () => {
    buildDatasetSupabaseMock(null, { message: 'DB error', code: '500' });
    await expect(getPublishedDataset()).rejects.toThrow('Failed to load published dataset');
  });

  it('published dataset does not contain internal admin fields', async () => {
    buildDatasetSupabaseMock(sampleDataset);
    const result = await getPublishedDataset();
    const resultStr = JSON.stringify(result);

    for (const field of ['needs_review', 'is_active', 'admin_notes', 'updated_by',
                         'is_sensitive', 'published_by', 'notes', 'id']) {
      expect(result).not.toHaveProperty(field);
      expect(resultStr).not.toContain(`"${field}"`);
    }
  });

  it('location entries expose only public fields', async () => {
    buildDatasetSupabaseMock(sampleDataset);
    const result = await getPublishedDataset();
    const location = result!.locations[0];

    expect(location).toHaveProperty('locationId');
    expect(location).toHaveProperty('trekId');
    expect(location).toHaveProperty('altitudeM');
    expect(location).toHaveProperty('section');
    expect(location).toHaveProperty('locationType');
    expect(location).not.toHaveProperty('needs_review');
    expect(location).not.toHaveProperty('is_active');
    expect(location).not.toHaveProperty('id');
  });
});

// ── Route handler: GET /api/public/dataset ────────────────────────────────────

describe('GET /api/public/dataset route', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    spy = jest.spyOn(datasetService, 'getPublishedDataset');
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns 404 when no published dataset exists', async () => {
    spy.mockResolvedValue(null);

    const { GET } = await import('@/app/api/public/dataset/route');
    const response = await GET();

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 200 with dataset payload when dataset exists', async () => {
    spy.mockResolvedValue(sampleDataset);

    const { GET } = await import('@/app/api/public/dataset/route');
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(sampleDataset);
  });

  it('returns 503 when getPublishedDataset throws', async () => {
    spy.mockRejectedValue(new Error('Supabase unavailable'));

    const { GET } = await import('@/app/api/public/dataset/route');
    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  it('response body does not expose service role key', async () => {
    const secretPlaceholder = 'test-service-role-secret-value';
    process.env.SUPABASE_SERVICE_ROLE_KEY = secretPlaceholder;
    spy.mockResolvedValue(sampleDataset);

    const { GET } = await import('@/app/api/public/dataset/route');
    const response = await GET();
    const body = await response.json();

    expect(JSON.stringify(body)).not.toContain(secretPlaceholder);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('response contains countries, treks, and locations arrays', async () => {
    spy.mockResolvedValue(sampleDataset);

    const { GET } = await import('@/app/api/public/dataset/route');
    const response = await GET();
    const body = await response.json() as PublishedDataset;

    expect(Array.isArray(body.countries)).toBe(true);
    expect(Array.isArray(body.treks)).toBe(true);
    expect(Array.isArray(body.locations)).toBe(true);
  });

  it('response does not expose draft records or admin metadata', async () => {
    spy.mockResolvedValue(sampleDataset);

    const { GET } = await import('@/app/api/public/dataset/route');
    const response = await GET();
    const body = await response.json();
    const bodyStr = JSON.stringify(body);

    for (const field of ['needs_review', 'is_active', 'published_by', 'admin_notes', 'is_sensitive']) {
      expect(bodyStr).not.toContain(`"${field}"`);
    }
  });
});
