// HighWise v0.3 — backend type contracts
//
// Three categories of types live here:
//   1. Primitive union types shared across layers
//   2. Public API contracts — the stable payloads consumed by the app
//      (PublicAppConfig, PublishedDataset and its sub-types).
//      The public app and any future native client MUST depend only on these,
//      never on Supabase table shape directly.
//   3. DB row types — mirror the Supabase table columns (camelCase).
//      Used in admin API routes and the Admin Dashboard.

// ─── 1. Primitive union types ────────────────────────────────────────────────

export type AdminRole = 'owner' | 'admin';

export type PaymentMode = 'disabled' | 'trial' | 'premium';

export type RiskResult = 'green' | 'yellow' | 'orange' | 'red';

/** Where the dataset served to the app came from. */
export type DatasetSource = 'synced' | 'cached' | 'bundled';

/** How the altitude value for a field was obtained. */
export type LocationSource =
  | 'none'
  | 'manual'
  | 'village_lookup'
  | 'device_current_location'
  | 'device_tracking';

/** Sensitive admin actions that are recorded in audit_logs. */
export type AuditActionType =
  | 'publish_dataset'
  | 'app_disable'
  | 'app_enable'
  | 'config_change'
  | 'export'
  | 'soft_delete'
  | 'altitude_change'
  | 'record_status_change'
  | 'admin_user_change';

export type SyncType = 'config' | 'dataset' | 'assessment_logs';

// ─── 2. Public API contracts ─────────────────────────────────────────────────

/**
 * Payload returned by GET /api/public/config.
 * The public app checks this on start, on connectivity return, and in the background.
 * Must not contain any admin-only or sensitive operational data.
 */
export interface PublicAppConfig {
  schemaVersion: string;
  configVersion: string;
  datasetVersion: string;
  syncEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  appDisabled: boolean;
  disabledMessage: string | null;
  minSupportedVersion: string;
  paymentMode: PaymentMode;
  /** Sync check interval in seconds. */
  syncInterval: number;
  updatedAt: string;
  // Location feature flags — all false in v0.3
  locationEnabled: boolean;
  currentAltitudeFromLocationEnabled: boolean;
  ascentTrackingEnabled: boolean;
  sendLocationDataEnabled: boolean;
}

/** A country entry in the published dataset. Contains only public-facing fields. */
export interface PublishedCountry {
  countryCode: string;
  nameEn: string;
  nameHe: string;
  sortOrder: number;
}

/** A trek entry in the published dataset. Contains only public-facing fields. */
export interface PublishedTrek {
  trekId: string;
  countryCode: string;
  nameEn: string;
  nameHe: string;
  aliases: string[];
  region: string;
  isPopular: boolean;
  sortOrder: number;
}

/** A location entry in the published dataset. Contains only public-facing fields. */
export interface PublishedLocation {
  locationId: string;
  trekId: string;
  nameEn: string;
  nameHe: string;
  aliases: string[];
  /** Altitude in metres. */
  altitudeM: number;
  routeOrder: number;
  section: string;
  locationType: string;
}

/**
 * Payload returned by GET /api/public/dataset.
 * Serves only the current published snapshot — no drafts, no admin notes,
 * no needsReview flags, no internal fields.
 */
export interface PublishedDataset {
  schemaVersion: string;
  datasetVersion: string;
  publishedAt: string;
  countries: PublishedCountry[];
  treks: PublishedTrek[];
  locations: PublishedLocation[];
}

// ─── 3. DB row types ─────────────────────────────────────────────────────────
// Field names are camelCase versions of the snake_case DB columns.

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Country {
  id: string;
  countryCode: string;
  nameEn: string;
  nameHe: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Trek {
  id: string;
  /** UUID of the parent country row. */
  countryId: string;
  /** Stable slug, e.g. 'everest_base_camp'. Must match nativ_user_profile.tripContext.trekId. */
  trekId: string;
  nameEn: string;
  nameHe: string;
  aliases: string[];
  region: string;
  isPopular: boolean;
  isActive: boolean;
  needsReview: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  /** UUID of the parent trek row. */
  trekId: string;
  /** Stable slug scoped to the trek, e.g. 'lukla'. */
  locationId: string;
  nameEn: string;
  nameHe: string;
  aliases: string[];
  /** Altitude in metres. */
  altitudeM: number;
  routeOrder: number;
  section: string;
  locationType: string;
  needsReview: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfigRow {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  isSensitive: boolean;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetVersion {
  id: string;
  datasetVersion: string;
  schemaVersion: string;
  payloadJson: PublishedDataset;
  isCurrent: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AssessmentLog {
  id: string;

  // Identity
  installId: string;
  sessionId: string;

  // Timestamps
  createdAt: string;
  completedAt: string | null;

  // Flow state
  flowCompleted: boolean;
  abandonmentStep: string | null;

  // App / dataset context
  appVersion: string;
  datasetVersion: string | null;
  configVersion: string | null;
  interfaceLanguage: string;
  datasetSource: DatasetSource;
  wasOffline: boolean;

  // Device / environment
  deviceCategory: string | null;
  browser: string | null;
  os: string | null;

  // Trek / location context
  countryId: string | null;
  trekId: string | null;
  locationId: string | null;
  altitudeSource: LocationSource | null;
  villageLookupUsed: boolean;

  // Entered altitudes (metres)
  altitudeCurrentM: number | null;
  altitudePlannedM: number | null;
  altitudeLastNightM: number | null;
  altitude2NightsAgoM: number | null;
  altitude3NightsAgoM: number | null;

  // Internal medical data — never shown to the public user
  llsScore: number | null;
  llsSeverity: string | null;
  symptomHeadache: number | null;
  symptomFatigue: number | null;
  symptomDizziness: number | null;
  symptomGi: number | null;
  redFlags: string[] | null;
  respiratoryIllness: boolean | null;

  // Result
  riskResult: RiskResult | null;

  // UX metrics
  screenTimesJson: Record<string, number> | null;

  // Location-ready infrastructure (all null in v0.3; populated only when flags enabled)
  locationPermissionStatus: string | null;
  locationUsed: boolean | null;
  locationSource: LocationSource | null;
  deviceAltitudeMeters: number | null;
  deviceAltitudeAccuracyMeters: number | null;
  deviceLatitude: number | null;
  deviceLongitude: number | null;
  deviceLocationAccuracyMeters: number | null;
  deviceLocationTimestamp: string | null;
  ascentTrackingEnabled: boolean | null;
  ascentRateEstimated: number | null;
  ascentProfileSummary: unknown | null;

  // Sync tracking
  syncedAt: string | null;
  syncAttempts: number;

  // Soft delete (owner only)
  deletedAt: string | null;
}

export interface SyncLog {
  id: string;
  installId: string;
  syncType: SyncType;
  startedAt: string;
  completedAt: string | null;
  success: boolean | null;
  errorMessage: string | null;
  /** Number of assessment log records sent in this batch. */
  recordsSent: number | null;
  durationMs: number | null;
  datasetVersionBefore: string | null;
  datasetVersionAfter: string | null;
}

export interface AuditLog {
  id: string;
  /** admin_users.id of the actor; null if the user was deleted. */
  performedBy: string | null;
  performedAt: string;
  actionType: AuditActionType;
  /** Type of the affected entity, e.g. 'dataset', 'location', 'config'. */
  entityType: string | null;
  /** ID or slug of the affected entity. */
  entityId: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  notes: string | null;
}
