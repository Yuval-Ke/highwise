/**
 * Tests for POST /api/public/assessment-log.
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(data),
    }),
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';

const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<
  typeof createServerSupabaseClient
>;

function buildInsertMock(error: unknown = null) {
  const insertMock = jest.fn().mockResolvedValue({ data: null, error });
  const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
  mockCreateClient.mockReturnValue({ from: fromMock } as never);
  return { fromMock, insertMock };
}

const VALID_BODY = {
  installId: 'hw_test-install',
  sessionId: 'hs_abc-123',
  createdAt: '2026-06-22T10:00:00.000Z',
  completedAt: '2026-06-22T10:01:00.000Z',
  flowCompleted: true,
  abandonmentStep: null,
  appVersion: '0.3.0',
  datasetVersion: null,
  configVersion: null,
  interfaceLanguage: 'he',
  datasetSource: 'bundled',
  wasOffline: false,
  deviceCategory: 'desktop',
  browser: 'Chrome',
  os: 'Windows',
  countryId: 'nepal',
  trekId: 'everest_base_camp',
  locationId: null,
  altitudeSource: 'none',
  villageLookupUsed: false,
  altitudeCurrentM: 4000,
  altitudePlannedM: 4200,
  altitudeLastNightM: 3800,
  altitude2NightsAgoM: 3400,
  altitude3NightsAgoM: 3000,
  llsScore: 0,
  llsSeverity: 'low_or_none',
  symptomHeadache: 0,
  symptomFatigue: 0,
  symptomDizziness: 0,
  symptomGi: 0,
  redFlags: [],
  respiratoryIllness: false,
  riskResult: 'green',
  screenTimesJson: null,
  locationPermissionStatus: null,
  locationUsed: null,
  locationSource: null,
  deviceAltitudeMeters: null,
  deviceAltitudeAccuracyMeters: null,
  deviceLatitude: null,
  deviceLongitude: null,
  deviceLocationAccuracyMeters: null,
  deviceLocationTimestamp: null,
  ascentTrackingEnabled: null,
  ascentRateEstimated: null,
  ascentProfileSummary: null,
};

function makeRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as Request;
}

describe('POST /api/public/assessment-log', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 on successful insert', async () => {
    buildInsertMock();
    const { POST } = await import('@/app/api/public/assessment-log/route');
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('inserts into assessment_logs table', async () => {
    const { fromMock } = buildInsertMock();
    const { POST } = await import('@/app/api/public/assessment-log/route');
    await POST(makeRequest(VALID_BODY));
    expect(fromMock).toHaveBeenCalledWith('assessment_logs');
  });

  it('maps camelCase payload to snake_case DB columns', async () => {
    const { fromMock, insertMock } = buildInsertMock();
    const { POST } = await import('@/app/api/public/assessment-log/route');
    await POST(makeRequest(VALID_BODY));
    expect(fromMock).toHaveBeenCalledWith('assessment_logs');
    const inserted = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.install_id).toBe('hw_test-install');
    expect(inserted.session_id).toBe('hs_abc-123');
    expect(inserted.flow_completed).toBe(true);
    expect(inserted.altitude_current_m).toBe(4000);
    expect(inserted.lls_score).toBe(0);
    expect(inserted.risk_result).toBe('green');
  });

  it('returns 400 when installId is missing', async () => {
    const { POST } = await import('@/app/api/public/assessment-log/route');
    const res = await POST(makeRequest({ ...VALID_BODY, installId: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 when sessionId is missing', async () => {
    const { POST } = await import('@/app/api/public/assessment-log/route');
    const res = await POST(makeRequest({ ...VALID_BODY, sessionId: undefined }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when appVersion is missing', async () => {
    const { POST } = await import('@/app/api/public/assessment-log/route');
    const res = await POST(makeRequest({ ...VALID_BODY, appVersion: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 503 when Supabase insert fails', async () => {
    buildInsertMock({ message: 'DB error', code: '500' });
    const { POST } = await import('@/app/api/public/assessment-log/route');
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 200 (not 503) when session_id is a duplicate (code 23505)', async () => {
    buildInsertMock({ message: 'duplicate key', code: '23505' });
    const { POST } = await import('@/app/api/public/assessment-log/route');
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('response body does not contain service role key value', async () => {
    const secretPlaceholder = 'test-service-role-secret';
    process.env.SUPABASE_SERVICE_ROLE_KEY = secretPlaceholder;
    buildInsertMock();
    const { POST } = await import('@/app/api/public/assessment-log/route');
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain(secretPlaceholder);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
});
