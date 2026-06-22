/**
 * Tests for getPublicConfig() and GET /api/public/config.
 *
 * @/lib/supabase/server is mocked globally — service tests exercise the real
 * getPublicConfig() against a controlled Supabase client stub.
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
import { getPublicConfig } from '@/lib/configService';
import * as configService from '@/lib/configService';
import type { PublicAppConfig } from '@/types/backend';

const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<
  typeof createServerSupabaseClient
>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockRows(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    schema_version: '1',
    config_version: '1.0.0',
    dataset_version: '0.0.0',
    sync_enabled: true,
    sync_interval: 3600,
    maintenance_mode: false,
    maintenance_message: null,
    app_disabled: false,
    disabled_message: null,
    min_supported_version: '0.1.0',
    payment_mode: 'disabled',
    location_enabled: false,
    current_altitude_from_location_enabled: false,
    ascent_tracking_enabled: false,
    send_location_data_enabled: false,
    ...overrides,
  };
  const ts = '2026-06-22T10:00:00.000Z';
  return Object.entries(defaults).map(([key, value]) => ({ key, value, updated_at: ts }));
}

function buildSupabaseMock(
  rows: { key: string; value: unknown; updated_at: string }[],
  error: unknown = null
) {
  const orderMock = jest.fn().mockResolvedValue({ data: rows, error });
  const selectMock = jest.fn().mockReturnValue({ order: orderMock });
  const fromMock = jest.fn().mockReturnValue({ select: selectMock });
  mockCreateClient.mockReturnValue({ from: fromMock } as never);
  return { fromMock, selectMock, orderMock };
}

const fullMockConfig: PublicAppConfig = {
  schemaVersion: '1',
  configVersion: '1.0.0',
  datasetVersion: '0.0.0',
  syncEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: null,
  appDisabled: false,
  disabledMessage: null,
  minSupportedVersion: '0.1.0',
  paymentMode: 'disabled',
  syncInterval: 3600,
  updatedAt: '2026-06-22T10:00:00.000Z',
  consentVersion: '1',
  locationEnabled: false,
  currentAltitudeFromLocationEnabled: false,
  ascentTrackingEnabled: false,
  sendLocationDataEnabled: false,
};

// ── Service: getPublicConfig() ────────────────────────────────────────────────

describe('getPublicConfig()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a correctly typed PublicAppConfig from DB rows', async () => {
    buildSupabaseMock(makeMockRows());
    const result = await getPublicConfig();

    expect(result.schemaVersion).toBe('1');
    expect(result.configVersion).toBe('1.0.0');
    expect(result.datasetVersion).toBe('0.0.0');
    expect(result.syncEnabled).toBe(true);
    expect(result.syncInterval).toBe(3600);
    expect(result.maintenanceMode).toBe(false);
    expect(result.maintenanceMessage).toBeNull();
    expect(result.appDisabled).toBe(false);
    expect(result.disabledMessage).toBeNull();
    expect(result.minSupportedVersion).toBe('0.1.0');
    expect(result.paymentMode).toBe('disabled');
    expect(result.locationEnabled).toBe(false);
    expect(result.currentAltitudeFromLocationEnabled).toBe(false);
    expect(result.ascentTrackingEnabled).toBe(false);
    expect(result.sendLocationDataEnabled).toBe(false);
    expect(typeof result.updatedAt).toBe('string');
  });

  it('has all required PublicAppConfig keys', async () => {
    buildSupabaseMock(makeMockRows());
    const result = await getPublicConfig();

    const expectedKeys: Array<keyof PublicAppConfig> = [
      'schemaVersion', 'configVersion', 'datasetVersion',
      'syncEnabled', 'maintenanceMode', 'maintenanceMessage',
      'appDisabled', 'disabledMessage', 'minSupportedVersion',
      'paymentMode', 'syncInterval', 'updatedAt',
      'locationEnabled', 'currentAltitudeFromLocationEnabled',
      'ascentTrackingEnabled', 'sendLocationDataEnabled',
    ];
    for (const key of expectedKeys) {
      expect(result).toHaveProperty(key);
    }
  });

  it('never includes internal DB fields', async () => {
    buildSupabaseMock(makeMockRows());
    const result = await getPublicConfig();

    for (const key of ['id', 'description', 'is_sensitive', 'updated_by', 'created_at']) {
      expect(result).not.toHaveProperty(key);
    }
  });

  it('coerces boolean fields to actual booleans', async () => {
    buildSupabaseMock(makeMockRows({ app_disabled: false, sync_enabled: true }));
    const result = await getPublicConfig();

    expect(typeof result.appDisabled).toBe('boolean');
    expect(typeof result.syncEnabled).toBe('boolean');
    expect(typeof result.locationEnabled).toBe('boolean');
    expect(typeof result.maintenanceMode).toBe('boolean');
    expect(typeof result.sendLocationDataEnabled).toBe('boolean');
  });

  it('coerces syncInterval to a number', async () => {
    buildSupabaseMock(makeMockRows({ sync_interval: 1800 }));
    const result = await getPublicConfig();
    expect(typeof result.syncInterval).toBe('number');
    expect(result.syncInterval).toBe(1800);
  });

  it('uses safe defaults when config keys are missing from DB', async () => {
    buildSupabaseMock([]);
    const result = await getPublicConfig();

    expect(result.appDisabled).toBe(false);
    expect(result.syncEnabled).toBe(true);
    expect(result.paymentMode).toBe('disabled');
    expect(result.syncInterval).toBe(3600);
    expect(result.locationEnabled).toBe(false);
  });

  it('picks the most recent updatedAt across all rows', async () => {
    const rows = [
      { key: 'app_disabled',  value: false, updated_at: '2026-01-01T00:00:00Z' },
      { key: 'sync_enabled',  value: true,  updated_at: '2026-06-15T12:00:00Z' },
      { key: 'sync_interval', value: 3600,  updated_at: '2026-03-01T00:00:00Z' },
    ];
    buildSupabaseMock(rows);
    const result = await getPublicConfig();
    expect(result.updatedAt).toBe('2026-06-15T12:00:00Z');
  });

  it('throws when Supabase returns an error', async () => {
    buildSupabaseMock([], { message: 'DB error', code: '500' });
    await expect(getPublicConfig()).rejects.toThrow('Failed to load app config');
  });
});

// ── Route handler: GET /api/public/config ─────────────────────────────────────

describe('GET /api/public/config route', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    spy = jest.spyOn(configService, 'getPublicConfig');
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns 200 with PublicAppConfig shape on success', async () => {
    spy.mockResolvedValue(fullMockConfig);

    const { GET } = await import('@/app/api/public/config/route');
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(fullMockConfig);
  });

  it('returns 503 when getPublicConfig throws', async () => {
    spy.mockRejectedValue(new Error('Supabase down'));

    const { GET } = await import('@/app/api/public/config/route');
    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  it('response body does not contain service role key value', async () => {
    const secretPlaceholder = 'test-service-role-key-value';
    process.env.SUPABASE_SERVICE_ROLE_KEY = secretPlaceholder;
    spy.mockResolvedValue(fullMockConfig);

    const { GET } = await import('@/app/api/public/config/route');
    const response = await GET();
    const body = await response.json();

    expect(JSON.stringify(body)).not.toContain(secretPlaceholder);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('response body does not expose internal DB fields', async () => {
    spy.mockResolvedValue(fullMockConfig);

    const { GET } = await import('@/app/api/public/config/route');
    const response = await GET();
    const body = await response.json();

    for (const field of ['id', 'is_sensitive', 'description', 'updated_by', 'created_at']) {
      expect(body).not.toHaveProperty(field);
    }
  });
});
