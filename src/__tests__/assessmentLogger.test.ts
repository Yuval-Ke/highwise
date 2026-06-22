/**
 * Tests for assessmentLogger: queue key, queueAssessmentLog, flushAssessmentQueue.
 */

// ── localStorage mock ─────────────────────────────────────────────────────────
const store: Record<string, string> = {};
const localStorageMock = {
  getItem:    jest.fn((k: string) => store[k] ?? null),
  setItem:    jest.fn((k: string, v: string) => { store[k] = v; }),
  removeItem: jest.fn((k: string) => { delete store[k]; }),
  clear:      jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key:        jest.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(global, 'window',        { value: { localStorage: localStorageMock }, writable: true });

// ── navigator mock ────────────────────────────────────────────────────────────
Object.defineProperty(global, 'navigator', {
  value: { onLine: true, userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120' },
  writable: true,
  configurable: true,
});

// ── fetch mock ────────────────────────────────────────────────────────────────
global.fetch = jest.fn();

// ── module mocks ──────────────────────────────────────────────────────────────
jest.mock('@/lib/analytics', () => ({
  getInstallId: jest.fn(() => 'hw_test-install-id'),
}));

jest.mock('@/lib/calculateLLS', () => ({
  calculateLLS: jest.fn(() => 0),
}));

jest.mock('@/lib/appConfigStore', () => ({
  APP_VERSION: '0.3.0',
  getCachedConfig: jest.fn(() => null),
}));

jest.mock('@/lib/consentStore', () => ({
  getStoredConsent: jest.fn(() => null),
}));

// ── test data ─────────────────────────────────────────────────────────────────
import type { AssessmentLogInput } from '@/lib/assessmentLogger';
import type { DailyInput, UserProfile } from '@/types';

const DAILY: DailyInput = {
  altitudeData: {
    currentAltitude: 4000,
    plannedSleepAltitudeTonight: 4200,
    sleepAltitudeLastNight: 3800,
    sleepAltitudeTwoNightsAgo: 3400,
    sleepAltitudeThreeNightsAgo: 3000,
  },
  lls: { headache: 0, fatigue: 0, dizziness: 0, gastrointestinal: 0 },
  respiratoryRecentIllness: false,
  redFlags: {
    unsteadyWalking: false, severeFatigue: false,
    confusionOrAlteredMentalStatus: false, dyspneaAtRest: false,
    unusualHeadache: false, repeatedVomiting: false,
  },
};

const PROFILE: UserProfile = {
  previousAltitudeIllness: 'none',
  backgroundDiseases: [],
  tripContext: { countryId: 'nepal', trekId: 'everest_base_camp' },
};

const INPUT: AssessmentLogInput = {
  daily: DAILY,
  riskLevel: 'green',
  profile: PROFILE,
  villageLookupUsed: false,
};

// ── helpers ───────────────────────────────────────────────────────────────────
function mockFetch(status: number) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: status < 400, status });
}

function mockFetchError() {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('assessmentLogger', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('ASSESSMENT_QUEUE_KEY equals nativ_assessment_sync_queue', async () => {
    const { ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    expect(ASSESSMENT_QUEUE_KEY).toBe('nativ_assessment_sync_queue');
  });

  it('queueAssessmentLog adds one entry under the correct key', async () => {
    const { queueAssessmentLog, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    const raw = store[ASSESSMENT_QUEUE_KEY];
    expect(raw).toBeTruthy();
    const queue = JSON.parse(raw);
    expect(Array.isArray(queue)).toBe(true);
    expect(queue).toHaveLength(1);
  });

  it('queued entry has correct appVersion, installId, and riskResult', async () => {
    const { queueAssessmentLog, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    const [entry] = JSON.parse(store[ASSESSMENT_QUEUE_KEY]);
    expect(entry.payload.appVersion).toBe('0.3.0');
    expect(entry.payload.installId).toBe('hw_test-install-id');
    expect(entry.payload.riskResult).toBe('green');
  });

  it('queued entry has correct altitude fields', async () => {
    const { queueAssessmentLog, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    const [entry] = JSON.parse(store[ASSESSMENT_QUEUE_KEY]);
    expect(entry.payload.altitudeCurrentM).toBe(4000);
    expect(entry.payload.altitudePlannedM).toBe(4200);
    expect(entry.payload.altitudeLastNightM).toBe(3800);
    expect(entry.payload.altitude2NightsAgoM).toBe(3400);
    expect(entry.payload.altitude3NightsAgoM).toBe(3000);
  });

  it('queued entry has trek context from profile', async () => {
    const { queueAssessmentLog, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    const [entry] = JSON.parse(store[ASSESSMENT_QUEUE_KEY]);
    expect(entry.payload.countryId).toBe('nepal');
    expect(entry.payload.trekId).toBe('everest_base_camp');
  });

  it('queued entry has all location-ready fields as null', async () => {
    const { queueAssessmentLog, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    const [entry] = JSON.parse(store[ASSESSMENT_QUEUE_KEY]);
    const p = entry.payload;
    expect(p.locationId).toBeNull();
    expect(p.locationUsed).toBeNull();
    expect(p.locationSource).toBeNull();
    expect(p.deviceLatitude).toBeNull();
    expect(p.deviceLongitude).toBeNull();
    expect(p.deviceAltitudeMeters).toBeNull();
    expect(p.ascentTrackingEnabled).toBeNull();
  });

  it('altitudeSource is always "none" in v0.3', async () => {
    const { queueAssessmentLog, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    const [entry] = JSON.parse(store[ASSESSMENT_QUEUE_KEY]);
    expect(entry.payload.altitudeSource).toBe('none');
  });

  it('flowCompleted is always true when queued from result page', async () => {
    const { queueAssessmentLog, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    const [entry] = JSON.parse(store[ASSESSMENT_QUEUE_KEY]);
    expect(entry.payload.flowCompleted).toBe(true);
  });

  it('multiple calls accumulate entries in the queue', async () => {
    const { queueAssessmentLog, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    queueAssessmentLog(INPUT);
    const queue = JSON.parse(store[ASSESSMENT_QUEUE_KEY]);
    expect(queue).toHaveLength(2);
  });

  it('flushAssessmentQueue does nothing when no consent stored', async () => {
    const { queueAssessmentLog, flushAssessmentQueue } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    await flushAssessmentQueue();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('flushAssessmentQueue does nothing when offline', async () => {
    const { getStoredConsent } = await import('@/lib/consentStore');
    (getStoredConsent as jest.Mock).mockReturnValue({ accepted: true, consentVersion: '1', acceptedAt: new Date().toISOString() });
    Object.defineProperty(global, 'navigator', { value: { ...global.navigator, onLine: false }, configurable: true });

    const { queueAssessmentLog, flushAssessmentQueue } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    await flushAssessmentQueue();
    expect(global.fetch).not.toHaveBeenCalled();

    Object.defineProperty(global, 'navigator', { value: { ...global.navigator, onLine: true }, configurable: true });
  });

  it('flushAssessmentQueue sends POST and removes entry on success (201)', async () => {
    const { getStoredConsent } = await import('@/lib/consentStore');
    (getStoredConsent as jest.Mock).mockReturnValue({ accepted: true, consentVersion: '1', acceptedAt: new Date().toISOString() });
    mockFetch(201);

    const { queueAssessmentLog, flushAssessmentQueue, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    await flushAssessmentQueue();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/public/assessment-log',
      expect.objectContaining({ method: 'POST' })
    );
    const remaining = JSON.parse(store[ASSESSMENT_QUEUE_KEY] ?? '[]');
    expect(remaining).toHaveLength(0);
  });

  it('flushAssessmentQueue treats 409 (duplicate) as success and removes entry', async () => {
    const { getStoredConsent } = await import('@/lib/consentStore');
    (getStoredConsent as jest.Mock).mockReturnValue({ accepted: true, consentVersion: '1', acceptedAt: new Date().toISOString() });
    mockFetch(409);

    const { queueAssessmentLog, flushAssessmentQueue, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    await flushAssessmentQueue();

    const remaining = JSON.parse(store[ASSESSMENT_QUEUE_KEY] ?? '[]');
    expect(remaining).toHaveLength(0);
  });

  it('flushAssessmentQueue keeps entry in queue with incremented attempts on network error', async () => {
    const { getStoredConsent } = await import('@/lib/consentStore');
    (getStoredConsent as jest.Mock).mockReturnValue({ accepted: true, consentVersion: '1', acceptedAt: new Date().toISOString() });
    mockFetchError();

    const { queueAssessmentLog, flushAssessmentQueue, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    await flushAssessmentQueue();

    const remaining = JSON.parse(store[ASSESSMENT_QUEUE_KEY] ?? '[]');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].attempts).toBe(1);
  });

  it('flushAssessmentQueue keeps entry in queue on 503 response', async () => {
    const { getStoredConsent } = await import('@/lib/consentStore');
    (getStoredConsent as jest.Mock).mockReturnValue({ accepted: true, consentVersion: '1', acceptedAt: new Date().toISOString() });
    mockFetch(503);

    const { queueAssessmentLog, flushAssessmentQueue, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);
    await flushAssessmentQueue();

    const remaining = JSON.parse(store[ASSESSMENT_QUEUE_KEY] ?? '[]');
    expect(remaining).toHaveLength(1);
  });

  it('flushAssessmentQueue drops entries that have reached MAX_ATTEMPTS', async () => {
    const { getStoredConsent } = await import('@/lib/consentStore');
    (getStoredConsent as jest.Mock).mockReturnValue({ accepted: true, consentVersion: '1', acceptedAt: new Date().toISOString() });

    const { queueAssessmentLog, flushAssessmentQueue, ASSESSMENT_QUEUE_KEY } = await import('@/lib/assessmentLogger');
    queueAssessmentLog(INPUT);

    // Manually set attempts to max
    const queue = JSON.parse(store[ASSESSMENT_QUEUE_KEY]);
    queue[0].attempts = 5;
    store[ASSESSMENT_QUEUE_KEY] = JSON.stringify(queue);

    await flushAssessmentQueue();

    expect(global.fetch).not.toHaveBeenCalled();
    const remaining = JSON.parse(store[ASSESSMENT_QUEUE_KEY] ?? '[]');
    expect(remaining).toHaveLength(0);
  });
});
