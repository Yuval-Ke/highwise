export const CONSENT_KEY = 'nativ_privacy_consent';

export interface StoredConsent {
  accepted: true;
  acceptedAt: string;
  consentVersion: string;
}

export function getStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredConsent;
  } catch {
    return null;
  }
}

export function setConsent(consentVersion: string): void {
  if (typeof window === 'undefined') return;
  const consent: StoredConsent = {
    accepted: true,
    acceptedAt: new Date().toISOString(),
    consentVersion,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
}

export function hasValidConsent(currentVersion: string): boolean {
  const stored = getStoredConsent();
  return stored?.accepted === true && stored.consentVersion === currentVersion;
}

export function clearConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONSENT_KEY);
}
