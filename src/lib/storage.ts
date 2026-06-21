import type { UserProfile, AltitudeData, LLSInput, RedFlags, RiskLevel, AltitudeLocationSelections } from "@/types";

const NS = "nativ_";
export const STORAGE_KEYS = {
  userProfile: `${NS}user_profile`,
  assessments: `${NS}assessments`,
  currentAssessment: `${NS}current_assessment`,
} as const;

export function hasUserProfile(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEYS.userProfile) !== null;
}

export function saveUserProfile(data: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(data));
}

export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.userProfile);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveAltitudeData(data: AltitudeData): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEYS.currentAssessment);
  const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  localStorage.setItem(
    STORAGE_KEYS.currentAssessment,
    JSON.stringify({ ...existing, altitudeData: data })
  );
}

export function saveLLSData(data: LLSInput): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEYS.currentAssessment);
  const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  localStorage.setItem(
    STORAGE_KEYS.currentAssessment,
    JSON.stringify({ ...existing, lls: data })
  );
}

export function saveRespiratoryData(respiratoryRecentIllness: boolean, redFlags: RedFlags): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEYS.currentAssessment);
  const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  localStorage.setItem(
    STORAGE_KEYS.currentAssessment,
    JSON.stringify({ ...existing, respiratoryRecentIllness, redFlags })
  );
}

export function saveThreeDaysData(value: boolean): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEYS.currentAssessment);
  const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  localStorage.setItem(
    STORAGE_KEYS.currentAssessment,
    JSON.stringify({ ...existing, threeDaysMildIllness: value })
  );
}

export function saveAltitudeLocationSelections(data: AltitudeLocationSelections): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEYS.currentAssessment);
  const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  localStorage.setItem(
    STORAGE_KEYS.currentAssessment,
    JSON.stringify({ ...existing, altitudeLocationSelections: data })
  );
}

export function getAltitudeLocationSelections(): AltitudeLocationSelections {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEYS.currentAssessment);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return (parsed.altitudeLocationSelections as AltitudeLocationSelections) ?? {};
  } catch {
    return {};
  }
}

export type SavedAssessment = {
  id: string;
  createdAt: string;
  altitudeData: AltitudeData;
  lls: LLSInput;
  respiratoryRecentIllness: boolean;
  redFlags: RedFlags;
  threeDaysMildIllness?: boolean;
  medicalBackgroundSnapshot: {
    previousAltitudeIllness: string;
    backgroundDiseases: string[];
  };
  result: {
    level: RiskLevel;
    riskLevelText: string;
    mainRecommendation: string;
    actions: string[];
    displayReasons: Array<{ title: string; text: string }>;
  };
};

export function saveCompletedAssessment(record: SavedAssessment): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEYS.assessments);
  const existing: SavedAssessment[] = raw ? (JSON.parse(raw) as SavedAssessment[]) : [];
  existing.push(record);
  localStorage.setItem(STORAGE_KEYS.assessments, JSON.stringify(existing));
}

export function clearCurrentAssessment(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.currentAssessment);
}

export function clearAllData(): void {
  if (typeof window === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(NS)) toRemove.push(key);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}
