import type { DailyInput, RiskLevel, UserProfile } from '@/types';
import type { DatasetSource, RiskResult } from '@/types/backend';
import { calculateLLS } from '@/lib/calculateLLS';
import { getInstallId } from '@/lib/analytics';
import { getStoredConsent } from '@/lib/consentStore';
import { APP_VERSION, getCachedConfig } from '@/lib/appConfigStore';

export const ASSESSMENT_QUEUE_KEY = 'nativ_assessment_sync_queue';
const MAX_ATTEMPTS = 5;

export interface AssessmentLogInput {
  daily: DailyInput;
  riskLevel: RiskLevel;
  profile: UserProfile;
  villageLookupUsed: boolean;
}

// Payload sent to POST /api/public/assessment-log
export interface LogPayload {
  installId: string;
  sessionId: string;
  createdAt: string;
  completedAt: string;
  flowCompleted: true;
  abandonmentStep: null;
  appVersion: string;
  datasetVersion: string | null;
  configVersion: string | null;
  interfaceLanguage: 'he';
  datasetSource: DatasetSource;
  wasOffline: boolean;
  deviceCategory: string | null;
  browser: string | null;
  os: string | null;
  countryId: string | null;
  trekId: string | null;
  locationId: null;
  altitudeSource: 'none';
  villageLookupUsed: boolean;
  altitudeCurrentM: number;
  altitudePlannedM: number;
  altitudeLastNightM: number;
  altitude2NightsAgoM: number;
  altitude3NightsAgoM: number;
  llsScore: number;
  llsSeverity: string;
  symptomHeadache: number;
  symptomFatigue: number;
  symptomDizziness: number;
  symptomGi: number;
  redFlags: string[];
  respiratoryIllness: boolean;
  riskResult: RiskResult;
  screenTimesJson: null;
  // Location-ready infrastructure — all null in v0.3 (flags are off by default)
  locationPermissionStatus: null;
  locationUsed: null;
  locationSource: null;
  deviceAltitudeMeters: null;
  deviceAltitudeAccuracyMeters: null;
  deviceLatitude: null;
  deviceLongitude: null;
  deviceLocationAccuracyMeters: null;
  deviceLocationTimestamp: null;
  ascentTrackingEnabled: null;
  ascentRateEstimated: null;
  ascentProfileSummary: null;
}

type QueueEntry = {
  sessionId: string;
  queuedAt: string;
  attempts: number;
  payload: LogPayload;
};

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'hs_' + crypto.randomUUID();
  }
  return 'hs_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
}

function getDatasetSource(): DatasetSource {
  if (typeof window === 'undefined') return 'bundled';
  return localStorage.getItem('nativ_dataset_cache') ? 'cached' : 'bundled';
}

function parseDevice(): { deviceCategory: string; browser: string | null; os: string | null } {
  if (typeof navigator === 'undefined') return { deviceCategory: 'desktop', browser: null, os: null };
  const ua = navigator.userAgent;

  let deviceCategory = 'desktop';
  if (/iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) deviceCategory = 'tablet';
  else if (/Mobi|Android|iPhone|iPod/i.test(ua)) deviceCategory = 'mobile';

  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
    ? 'Opera'
    : /Chrome\//i.test(ua)
    ? 'Chrome'
    : /Firefox\//i.test(ua)
    ? 'Firefox'
    : /Safari\//i.test(ua)
    ? 'Safari'
    : null;

  const os = /Windows NT/i.test(ua)
    ? 'Windows'
    : /iPhone|iPad|iPod/i.test(ua)
    ? 'iOS'
    : /Android/i.test(ua)
    ? 'Android'
    : /Mac OS X/i.test(ua)
    ? 'macOS'
    : /Linux/i.test(ua)
    ? 'Linux'
    : null;

  return { deviceCategory, browser, os };
}

function readQueue(): QueueEntry[] {
  try {
    const raw = localStorage.getItem(ASSESSMENT_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueEntry[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(entries: QueueEntry[]): void {
  try {
    localStorage.setItem(ASSESSMENT_QUEUE_KEY, JSON.stringify(entries));
  } catch {
    // storage full — silently ignore
  }
}

/** Queues a completed assessment for background sync. Fire-and-forget safe; never throws. */
export function queueAssessmentLog(input: AssessmentLogInput): void {
  if (typeof window === 'undefined') return;
  try {
    const { daily, riskLevel, profile, villageLookupUsed } = input;
    const now = new Date().toISOString();
    const config = getCachedConfig();
    const llsScore = calculateLLS(daily.lls);
    const llsSeverity = llsScore <= 2 ? 'low_or_none' : llsScore <= 5 ? 'moderate' : 'high';
    const activeRedFlags = Object.entries(daily.redFlags)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const { deviceCategory, browser, os } = parseDevice();

    const payload: LogPayload = {
      installId: getInstallId(),
      sessionId: newSessionId(),
      createdAt: now,
      completedAt: now,
      flowCompleted: true,
      abandonmentStep: null,
      appVersion: APP_VERSION,
      datasetVersion: config?.datasetVersion ?? null,
      configVersion: config?.configVersion ?? null,
      interfaceLanguage: 'he',
      datasetSource: getDatasetSource(),
      wasOffline: !navigator.onLine,
      deviceCategory,
      browser,
      os,
      countryId: profile.tripContext?.countryId ?? null,
      trekId: profile.tripContext?.trekId ?? null,
      locationId: null,
      altitudeSource: 'none',
      villageLookupUsed,
      altitudeCurrentM: daily.altitudeData.currentAltitude,
      altitudePlannedM: daily.altitudeData.plannedSleepAltitudeTonight,
      altitudeLastNightM: daily.altitudeData.sleepAltitudeLastNight,
      altitude2NightsAgoM: daily.altitudeData.sleepAltitudeTwoNightsAgo,
      altitude3NightsAgoM: daily.altitudeData.sleepAltitudeThreeNightsAgo,
      llsScore,
      llsSeverity,
      symptomHeadache: daily.lls.headache,
      symptomFatigue: daily.lls.fatigue,
      symptomDizziness: daily.lls.dizziness,
      symptomGi: daily.lls.gastrointestinal,
      redFlags: activeRedFlags,
      respiratoryIllness: daily.respiratoryRecentIllness,
      riskResult: riskLevel as RiskResult,
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

    const queue = readQueue();
    queue.push({ sessionId: payload.sessionId, queuedAt: now, attempts: 0, payload });
    writeQueue(queue);
  } catch {
    // analytics-class errors must never surface to the user
  }
}

/** Sends queued assessment logs to the backend. Consent-gated; never throws. */
export async function flushAssessmentQueue(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  try {
    if (!getStoredConsent()?.accepted) return;

    const queue = readQueue();
    if (queue.length === 0) return;

    const remaining: QueueEntry[] = [];
    for (const entry of queue) {
      if (entry.attempts >= MAX_ATTEMPTS) continue; // drop permanently after too many failures
      try {
        const res = await fetch('/api/public/assessment-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.payload),
        });
        // 2xx = inserted; 409 = duplicate session_id already stored → both are success
        if (res.ok || res.status === 409) continue;
        remaining.push({ ...entry, attempts: entry.attempts + 1 });
      } catch {
        remaining.push({ ...entry, attempts: entry.attempts + 1 });
      }
    }
    writeQueue(remaining);
  } catch {
    // ignore
  }
}
