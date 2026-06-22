/**
 * Tests for consentStore: localStorage key, structure, version matching.
 */

const store: Record<string, string> = {};
const localStorageMock = {
  getItem:    jest.fn((k: string) => store[k] ?? null),
  setItem:    jest.fn((k: string, v: string) => { store[k] = v; }),
  removeItem: jest.fn((k: string) => { delete store[k]; }),
  clear:      jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock }, writable: true });

describe('consentStore', () => {
  beforeEach(() => { localStorageMock.clear(); jest.clearAllMocks(); });

  it('getStoredConsent returns null when nothing stored', async () => {
    const { getStoredConsent } = await import('@/lib/consentStore');
    expect(getStoredConsent()).toBeNull();
  });

  it('setConsent stores accepted=true, consentVersion, and ISO acceptedAt', async () => {
    const { setConsent, getStoredConsent } = await import('@/lib/consentStore');
    setConsent('1');
    const result = getStoredConsent();
    expect(result).not.toBeNull();
    expect(result!.accepted).toBe(true);
    expect(result!.consentVersion).toBe('1');
    expect(result!.acceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('stores under nativ_privacy_consent key', async () => {
    const { setConsent } = await import('@/lib/consentStore');
    setConsent('1');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('nativ_privacy_consent', expect.any(String));
  });

  it('hasValidConsent returns true when version matches stored version', async () => {
    const { setConsent, hasValidConsent } = await import('@/lib/consentStore');
    setConsent('1');
    expect(hasValidConsent('1')).toBe(true);
  });

  it('hasValidConsent returns false when version does not match stored version', async () => {
    const { setConsent, hasValidConsent } = await import('@/lib/consentStore');
    setConsent('1');
    expect(hasValidConsent('2')).toBe(false);
  });

  it('hasValidConsent returns false when nothing is stored', async () => {
    const { hasValidConsent } = await import('@/lib/consentStore');
    expect(hasValidConsent('1')).toBe(false);
  });

  it('clearConsent removes the stored consent', async () => {
    const { setConsent, clearConsent, getStoredConsent } = await import('@/lib/consentStore');
    setConsent('1');
    clearConsent();
    expect(getStoredConsent()).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('nativ_privacy_consent');
  });

  it('CONSENT_KEY export equals nativ_privacy_consent', async () => {
    const { CONSENT_KEY } = await import('@/lib/consentStore');
    expect(CONSENT_KEY).toBe('nativ_privacy_consent');
  });

  it('getStoredConsent returns null on corrupt JSON', async () => {
    store['nativ_privacy_consent'] = 'not-valid-json{{{';
    const { getStoredConsent } = await import('@/lib/consentStore');
    expect(getStoredConsent()).toBeNull();
  });

  it('hasValidConsent returns false if accepted field is missing', async () => {
    store['nativ_privacy_consent'] = JSON.stringify({ consentVersion: '1', acceptedAt: new Date().toISOString() });
    const { hasValidConsent } = await import('@/lib/consentStore');
    expect(hasValidConsent('1')).toBe(false);
  });
});
