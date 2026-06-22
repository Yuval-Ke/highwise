/**
 * Tests for appConfigStore: caching, version comparison, fetch logic.
 */

import type { PublicAppConfig } from '@/types/backend';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem:    jest.fn((k: string) => store[k] ?? null),
  setItem:    jest.fn((k: string, v: string) => { store[k] = v; }),
  removeItem: jest.fn((k: string) => { delete store[k]; }),
  clear:      jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock }, writable: true });

const BASE_CONFIG: PublicAppConfig = {
  schemaVersion: '1', configVersion: '1.0.0', datasetVersion: '1.0.0',
  syncEnabled: true, maintenanceMode: false, maintenanceMessage: null,
  appDisabled: false, disabledMessage: null, minSupportedVersion: '0.1.0',
  paymentMode: 'disabled', syncInterval: 3600, updatedAt: '2026-06-22T10:00:00Z',
  consentVersion: '1',
  locationEnabled: false, currentAltitudeFromLocationEnabled: false,
  ascentTrackingEnabled: false, sendLocationDataEnabled: false,
};

describe('getCachedConfig / setCachedConfig', () => {
  beforeEach(() => { localStorageMock.clear(); jest.clearAllMocks(); });

  it('returns null when nothing is cached', async () => {
    const { getCachedConfig } = await import('@/lib/appConfigStore');
    expect(getCachedConfig()).toBeNull();
  });

  it('returns stored config after setCachedConfig', async () => {
    const { getCachedConfig, setCachedConfig } = await import('@/lib/appConfigStore');
    setCachedConfig(BASE_CONFIG);
    const result = getCachedConfig();
    expect(result).not.toBeNull();
    expect(result!.configVersion).toBe('1.0.0');
  });

  it('stores under nativ_app_config_cache key', async () => {
    const { setCachedConfig } = await import('@/lib/appConfigStore');
    setCachedConfig(BASE_CONFIG);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('nativ_app_config_cache', expect.any(String));
  });
});

describe('isVersionTooOld()', () => {
  beforeEach(() => jest.clearAllMocks());

  let realIsVersionTooOld: typeof import('@/lib/appConfigStore').isVersionTooOld;

  beforeAll(async () => {
    const mod = await import('@/lib/appConfigStore');
    realIsVersionTooOld = mod.isVersionTooOld;
  });

  it('returns false when current equals minimum', () => {
    expect(realIsVersionTooOld('1.0.0', '1.0.0')).toBe(false);
  });

  it('returns false when current is newer (patch)', () => {
    expect(realIsVersionTooOld('1.0.5', '1.0.0')).toBe(false);
  });

  it('returns false when current is newer (minor)', () => {
    expect(realIsVersionTooOld('1.3.0', '1.0.0')).toBe(false);
  });

  it('returns false when current is newer (major)', () => {
    expect(realIsVersionTooOld('2.0.0', '1.9.9')).toBe(false);
  });

  it('returns true when current is older (patch)', () => {
    expect(realIsVersionTooOld('0.3.0', '0.4.0')).toBe(true);
  });

  it('returns true when current is older (minor)', () => {
    expect(realIsVersionTooOld('1.0.0', '1.1.0')).toBe(true);
  });

  it('returns true when current is older (major)', () => {
    expect(realIsVersionTooOld('0.9.9', '1.0.0')).toBe(true);
  });

  it('app version 0.3.0 is not too old when minimum is 0.1.0', () => {
    expect(realIsVersionTooOld('0.3.0', '0.1.0')).toBe(false);
  });
});

describe('appDisabled and maintenanceMode behavior', () => {
  beforeEach(() => { localStorageMock.clear(); jest.clearAllMocks(); });

  it('appDisabled flag is preserved in cache', async () => {
    const { setCachedConfig, getCachedConfig } = await import('@/lib/appConfigStore');
    setCachedConfig({ ...BASE_CONFIG, appDisabled: true, disabledMessage: 'Down for maintenance' });
    const cached = getCachedConfig();
    expect(cached!.appDisabled).toBe(true);
    expect(cached!.disabledMessage).toBe('Down for maintenance');
  });

  it('maintenanceMode flag is preserved in cache', async () => {
    const { setCachedConfig, getCachedConfig } = await import('@/lib/appConfigStore');
    setCachedConfig({ ...BASE_CONFIG, maintenanceMode: true, maintenanceMessage: 'Scheduled maintenance' });
    const cached = getCachedConfig();
    expect(cached!.maintenanceMode).toBe(true);
    expect(cached!.maintenanceMessage).toBe('Scheduled maintenance');
  });

  it('clearCachedConfig removes the cache', async () => {
    const { setCachedConfig, getCachedConfig, clearCachedConfig } = await import('@/lib/appConfigStore');
    setCachedConfig(BASE_CONFIG);
    clearCachedConfig();
    expect(getCachedConfig()).toBeNull();
  });

  it('config cache does not expose service role key', async () => {
    const { setCachedConfig } = await import('@/lib/appConfigStore');
    setCachedConfig(BASE_CONFIG);
    const storedValue = localStorageMock.setItem.mock.calls[0][1] as string;
    expect(storedValue).not.toContain('service_role');
    expect(storedValue).not.toContain('SUPABASE_SERVICE_ROLE');
  });
});
