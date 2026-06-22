import { createServerSupabaseClient } from './supabase/server';
import type { PublishedDataset, PublishedCountry, PublishedTrek, PublishedLocation } from '@/types/backend';

export interface ValidationError {
  entity: string;
  message: string;
}

export interface AltitudeChange {
  trekNameEn: string;
  locationNameEn: string;
  oldAltitudeM: number;
  newAltitudeM: number;
}

export interface ChangeSummary {
  countriesAdded: string[];
  treksAdded: string[];
  treksRemoved: string[];
  locationsAdded: string[];
  locationsRemoved: string[];
  altitudeChanges: AltitudeChange[];
  needsReviewCount: number;
}

export interface PublishResult {
  validationErrors: ValidationError[];
  warnings: string[];
  changeSummary: ChangeSummary | null;
  snapshot: PublishedDataset | null;
}

const VALID_SECTIONS = new Set(['pre_trek', 'on_route', 'ascent', 'descent', 'side_trip']);
const VALID_LOCATION_TYPES = new Set(['city', 'village', 'settlement', 'camp', 'lodge_area', 'pass', 'junction']);

function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '1.0.0';
  parts[2] += 1;
  return parts.join('.');
}

/** Builds a PublishedDataset snapshot from active DB rows and validates it. */
export async function buildAndValidateSnapshot(): Promise<PublishResult> {
  const supabase = createServerSupabaseClient();

  // Fetch all active countries
  const { data: countries, error: cErr } = await supabase
    .from('countries')
    .select('id, country_code, name_en, name_he, sort_order')
    .eq('is_active', true)
    .order('sort_order');
  if (cErr) throw new Error(`Failed to fetch countries: ${cErr.message}`);

  // Fetch all active treks
  const { data: treks, error: tErr } = await supabase
    .from('treks')
    .select('id, trek_id, country_id, name_en, name_he, aliases, region, is_popular, sort_order, needs_review')
    .eq('is_active', true)
    .order('sort_order');
  if (tErr) throw new Error(`Failed to fetch treks: ${tErr.message}`);

  // Fetch all active locations
  const { data: locations, error: lErr } = await supabase
    .from('locations')
    .select('id, trek_id, location_id, name_en, name_he, aliases, altitude_m, route_order, section, location_type, needs_review')
    .eq('is_active', true)
    .order('route_order');
  if (lErr) throw new Error(`Failed to fetch locations: ${lErr.message}`);

  // Build lookup maps
  const countryById = new Map((countries ?? []).map(c => [c.id, c]));
  const locationsByTrekDbId = new Map<string, typeof locations>();
  for (const loc of locations ?? []) {
    const bucket = locationsByTrekDbId.get(loc.trek_id) ?? [];
    bucket.push(loc);
    locationsByTrekDbId.set(loc.trek_id, bucket);
  }

  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Validate countries
  for (const c of countries ?? []) {
    if (!c.name_en?.trim()) errors.push({ entity: `Country ${c.country_code}`, message: 'Missing English name' });
    if (!c.name_he?.trim()) errors.push({ entity: `Country ${c.country_code}`, message: 'Missing Hebrew name' });
  }

  // Validate treks and locations
  let needsReviewCount = 0;
  for (const trek of treks ?? []) {
    const trekLabel = `Trek "${trek.trek_id}"`;
    if (!trek.name_en?.trim()) errors.push({ entity: trekLabel, message: 'Missing English name' });
    if (!trek.name_he?.trim()) errors.push({ entity: trekLabel, message: 'Missing Hebrew name' });
    if (!countryById.has(trek.country_id)) errors.push({ entity: trekLabel, message: 'References non-existent or inactive country' });

    const trekLocs = locationsByTrekDbId.get(trek.id) ?? [];
    if (trekLocs.length === 0) {
      errors.push({ entity: trekLabel, message: 'Has no active locations' });
    }

    if (trek.needs_review) {
      needsReviewCount++;
      warnings.push(`Trek "${trek.trek_id}" is marked needs_review`);
    }

    // Check for duplicate locationId within the trek
    const locationIdsSeen = new Set<string>();
    for (const loc of trekLocs) {
      const locLabel = `Location "${loc.location_id}" in "${trek.trek_id}"`;

      if (!loc.name_en?.trim()) errors.push({ entity: locLabel, message: 'Missing English name' });
      if (!loc.name_he?.trim()) errors.push({ entity: locLabel, message: 'Missing Hebrew name' });
      if (loc.altitude_m == null) errors.push({ entity: locLabel, message: 'Missing altitude' });
      else if (loc.altitude_m < 0 || loc.altitude_m > 9000) errors.push({ entity: locLabel, message: `Altitude ${loc.altitude_m}m out of range (0–9000)` });
      if (!loc.aliases || loc.aliases.length === 0) errors.push({ entity: locLabel, message: 'Aliases array must not be empty' });
      if (!VALID_SECTIONS.has(loc.section)) errors.push({ entity: locLabel, message: `Invalid section "${loc.section}"` });
      if (!VALID_LOCATION_TYPES.has(loc.location_type)) errors.push({ entity: locLabel, message: `Invalid locationType "${loc.location_type}"` });

      if (locationIdsSeen.has(loc.location_id)) {
        errors.push({ entity: locLabel, message: `Duplicate locationId "${loc.location_id}" within trek` });
      }
      locationIdsSeen.add(loc.location_id);

      if (loc.needs_review) {
        needsReviewCount++;
        warnings.push(`Location "${loc.location_id}" in "${trek.trek_id}" is marked needs_review`);
      }
    }
  }

  if (errors.length > 0) {
    return { validationErrors: errors, warnings, changeSummary: null, snapshot: null };
  }

  // Build snapshot
  const publishedCountries: PublishedCountry[] = (countries ?? []).map(c => ({
    countryCode: c.country_code,
    nameEn: c.name_en,
    nameHe: c.name_he,
    sortOrder: c.sort_order,
  }));

  const publishedTreks: PublishedTrek[] = (treks ?? []).map(t => ({
    trekId: t.trek_id,
    countryCode: countryById.get(t.country_id)?.country_code ?? '',
    nameEn: t.name_en,
    nameHe: t.name_he,
    aliases: t.aliases ?? [],
    region: t.region ?? '',
    isPopular: t.is_popular ?? false,
    sortOrder: t.sort_order ?? 0,
  }));

  const publishedLocations: PublishedLocation[] = (locations ?? []).map(l => ({
    locationId: l.location_id,
    trekId: (treks ?? []).find(t => t.id === l.trek_id)?.trek_id ?? '',
    nameEn: l.name_en,
    nameHe: l.name_he,
    aliases: l.aliases ?? [],
    altitudeM: l.altitude_m,
    routeOrder: l.route_order ?? 0,
    section: l.section,
    locationType: l.location_type,
  }));

  // Fetch current published snapshot for change summary
  const { data: currentVersion } = await supabase
    .from('dataset_versions')
    .select('payload_json, dataset_version')
    .eq('is_current', true)
    .maybeSingle();

  const currentDataset = currentVersion?.payload_json as PublishedDataset | null;
  const currentDbVersion = currentVersion?.dataset_version as string | null;

  // Compute next version
  const nextVersion = currentDbVersion ? incrementVersion(currentDbVersion) : '1.0.0';

  const snapshot: PublishedDataset = {
    schemaVersion: '1',
    datasetVersion: nextVersion,
    publishedAt: new Date().toISOString(),
    countries: publishedCountries,
    treks: publishedTreks,
    locations: publishedLocations,
  };

  // Build change summary
  const changeSummary = computeChangeSummary(currentDataset, snapshot);

  return { validationErrors: [], warnings, changeSummary, snapshot };
}

function computeChangeSummary(
  current: PublishedDataset | null,
  next: PublishedDataset
): ChangeSummary {
  if (!current) {
    return {
      countriesAdded: next.countries.map(c => c.countryCode),
      treksAdded: next.treks.map(t => t.trekId),
      treksRemoved: [],
      locationsAdded: next.locations.map(l => `${l.trekId}/${l.locationId}`),
      locationsRemoved: [],
      altitudeChanges: [],
      needsReviewCount: 0,
    };
  }

  const currCountryCodes = new Set(current.countries.map(c => c.countryCode));
  const currTrekIds      = new Set(current.treks.map(t => t.trekId));
  const nextTrekIds      = new Set(next.treks.map(t => t.trekId));

  const currLocKey = (l: PublishedLocation) => `${l.trekId}/${l.locationId}`;
  const currLocMap = new Map(current.locations.map(l => [currLocKey(l), l]));
  const nextLocMap = new Map(next.locations.map(l => [currLocKey(l), l]));

  const altitudeChanges: AltitudeChange[] = [];
  for (const [key, nextLoc] of nextLocMap) {
    const prevLoc = currLocMap.get(key);
    if (prevLoc && prevLoc.altitudeM !== nextLoc.altitudeM) {
      const trek = next.treks.find(t => t.trekId === nextLoc.trekId);
      altitudeChanges.push({
        trekNameEn: trek?.nameEn ?? nextLoc.trekId,
        locationNameEn: nextLoc.nameEn,
        oldAltitudeM: prevLoc.altitudeM,
        newAltitudeM: nextLoc.altitudeM,
      });
    }
  }

  return {
    countriesAdded:   next.countries.filter(c => !currCountryCodes.has(c.countryCode)).map(c => c.countryCode),
    treksAdded:       next.treks.filter(t => !currTrekIds.has(t.trekId)).map(t => t.trekId),
    treksRemoved:     current.treks.filter(t => !nextTrekIds.has(t.trekId)).map(t => t.trekId),
    locationsAdded:   next.locations.filter(l => !currLocMap.has(currLocKey(l))).map(currLocKey),
    locationsRemoved: current.locations.filter(l => !nextLocMap.has(currLocKey(l))).map(currLocKey),
    altitudeChanges,
    needsReviewCount: 0,
  };
}

/** Commits a pre-validated snapshot to dataset_versions, making it current. */
export async function commitSnapshot(
  snapshot: PublishedDataset,
  publishedByUserId: string
): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Clear is_current on all prior versions
  await supabase
    .from('dataset_versions')
    .update({ is_current: false })
    .eq('is_current', true);

  const { error } = await supabase.from('dataset_versions').insert({
    dataset_version: snapshot.datasetVersion,
    schema_version: snapshot.schemaVersion,
    payload_json: snapshot,
    is_current: true,
    published_at: snapshot.publishedAt,
    published_by: publishedByUserId,
  });

  if (error) throw new Error(`Failed to commit snapshot: ${error.message}`);

  // Keep app_config in sync so SyncInit triggers client downloads.
  // Without this, GET /api/public/config still returns datasetVersion:'0.0.0'
  // and the public app never fetches the published dataset.
  const { error: cfgErr } = await supabase
    .from('app_config')
    .upsert(
      { key: 'dataset_version', value: snapshot.datasetVersion },
      { onConflict: 'key' }
    );
  if (cfgErr) throw new Error(`Failed to update config dataset_version: ${cfgErr.message}`);
}
