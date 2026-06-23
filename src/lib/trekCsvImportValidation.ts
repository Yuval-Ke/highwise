import type { ParsedRow } from './trekCsvImport';

export interface PreviewData {
  countryId: string;
  trekId: string;
  trekNameEn: string;
  trekNameHe: string;
  region: string;
  locationCount: number;
  minAltitude: number;
  maxAltitude: number;
  needsReviewCount: number;
  rows: ParsedRow[];
}

export interface ValidationResult {
  blockers: string[];
  warnings: string[];
  previewData: PreviewData | null;
  processedRows: ParsedRow[] | null;
}

const VALID_SECTIONS = new Set(['pre_trek', 'on_route', 'ascent', 'descent', 'side_trip']);
const VALID_LOCATION_TYPES = new Set(['city', 'village', 'settlement', 'camp', 'lodge_area', 'pass', 'junction']);
const ID_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const REQUIRED_FIELDS: Array<keyof ParsedRow> = [
  'countryId', 'trekId', 'trekNameEn', 'locationId', 'nameEn',
];

export function validateCsvRows(
  rows: ParsedRow[],
  validCountryCodes: string[],
): ValidationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    return { blockers: ['CSV has no data rows.'], warnings: [], previewData: null, processedRows: null };
  }

  const countrySet = new Set(validCountryCodes.map(c => c.toLowerCase()));

  // Collect trekIds to check single-trek rule
  const trekIdsSeen = new Set<string>();
  for (const row of rows) {
    if (row.trekId) trekIdsSeen.add(row.trekId);
  }
  if (trekIdsSeen.size > 1) {
    blockers.push(
      `CSV contains multiple trek IDs (${[...trekIdsSeen].join(', ')}) — import one trek at a time.`
    );
    return { blockers, warnings, previewData: null, processedRows: null };
  }

  // Per-row processing with section conversion
  const processedRows: ParsedRow[] = [];
  const locationIdsSeen = new Set<string>();
  const ordersSeen = new Set<number>();
  let sectionMainConverted = false;

  for (let i = 0; i < rows.length; i++) {
    const row = { ...rows[i] };
    const rowLabel = `Row ${i + 2}`;

    // Required text fields
    for (const field of REQUIRED_FIELDS) {
      const val = (row[field] as string | undefined) ?? '';
      if (!val.trim()) {
        blockers.push(`${rowLabel}: missing required field "${field}".`);
      }
    }

    // altitudeMeters
    if (row.altitudeMeters === null) {
      blockers.push(`${rowLabel}: altitudeMeters is not a valid number.`);
    } else if (row.altitudeMeters < 0 || row.altitudeMeters > 9000) {
      blockers.push(`${rowLabel}: altitudeMeters ${row.altitudeMeters} is out of range (0–9000).`);
    }

    // order
    if (row.order === null) {
      blockers.push(`${rowLabel}: order is not a valid number.`);
    }

    // ID format validation
    if (row.trekId && !ID_REGEX.test(row.trekId)) {
      blockers.push(`${rowLabel}: trekId "${row.trekId}" must be lowercase snake_case (e.g. manaslu_circuit).`);
    }
    if (row.locationId && !ID_REGEX.test(row.locationId)) {
      blockers.push(`${rowLabel}: locationId "${row.locationId}" must be lowercase snake_case.`);
    }
    if (row.countryId && !ID_REGEX.test(row.countryId)) {
      blockers.push(`${rowLabel}: countryId "${row.countryId}" must be lowercase snake_case.`);
    }

    // countryId must exist in DB
    if (row.countryId && ID_REGEX.test(row.countryId) && !countrySet.has(row.countryId.toLowerCase())) {
      blockers.push(`${rowLabel}: countryId "${row.countryId}" is not a known active country.`);
    }

    // Duplicate locationId
    if (row.locationId) {
      if (locationIdsSeen.has(row.locationId)) {
        blockers.push(`Duplicate locationId "${row.locationId}" — each location must be unique within the trek.`);
      }
      locationIdsSeen.add(row.locationId);
    }

    // Duplicate order
    if (row.order !== null) {
      if (ordersSeen.has(row.order)) {
        blockers.push(`Duplicate order value ${row.order} — each location must have a unique order.`);
      }
      ordersSeen.add(row.order);
    }

    // Section: convert 'main' → 'on_route'
    if (row.section === 'main') {
      row.section = 'on_route';
      sectionMainConverted = true;
    } else if (row.section && !VALID_SECTIONS.has(row.section)) {
      blockers.push(
        `${rowLabel}: section "${row.section}" is invalid. Valid values: pre_trek, on_route, ascent, descent, side_trip.`
      );
    }

    // locationType warning (not a blocker — stored in DB, caught at publish)
    if (row.locationType && !VALID_LOCATION_TYPES.has(row.locationType)) {
      warnings.push(
        `${rowLabel}: locationType "${row.locationType}" is not a standard value and may block publishing. Valid values: city, village, settlement, camp, lodge_area, pass, junction.`
      );
    }

    processedRows.push(row);
  }

  // Deferred section conversion warning (once, not per row)
  if (sectionMainConverted) {
    warnings.push('section "main" was converted to "on_route" (main is not a valid section value).');
  }

  // Order gaps warning
  if (ordersSeen.size > 1) {
    const sortedOrders = [...ordersSeen].sort((a, b) => a - b);
    const hasGap = sortedOrders.some((v, i) => i > 0 && v - sortedOrders[i - 1] > 1);
    if (hasGap) {
      warnings.push(`Order values have gaps: ${sortedOrders.join(', ')}. Review if intentional.`);
    }
  }

  // Warnings for missing optional but recommended fields
  const firstRow = rows[0];
  if (!firstRow.trekNameHe?.trim()) {
    warnings.push('Trek name in Hebrew (trekNameHe) is missing.');
  }
  const missingNameHe = rows.filter(r => !r.nameHe?.trim()).length;
  if (missingNameHe > 0) {
    warnings.push(`${missingNameHe} location(s) are missing Hebrew name (nameHe).`);
  }
  const missingAliases = rows.filter(r => r.aliases.length === 0).length;
  if (missingAliases > 0) {
    warnings.push(`${missingAliases} location(s) have no aliases.`);
  }
  const missingNotes = rows.filter(r => !r.sourceNotes?.trim()).length;
  if (missingNotes > 0) {
    warnings.push(`${missingNotes} location(s) are missing sourceNotes.`);
  }
  const needsReviewCount = rows.filter(r => r.needsReview).length;
  if (needsReviewCount > 0) {
    warnings.push(`${needsReviewCount} location(s) are marked needsReview=true and should be verified before publishing.`);
  }

  if (blockers.length > 0) {
    return { blockers, warnings, previewData: null, processedRows: null };
  }

  // Build preview (only when no blockers)
  const altitudes = processedRows.map(r => r.altitudeMeters!);
  const previewData: PreviewData = {
    countryId:       firstRow.countryId,
    trekId:          firstRow.trekId,
    trekNameEn:      firstRow.trekNameEn,
    trekNameHe:      firstRow.trekNameHe,
    region:          firstRow.region,
    locationCount:   processedRows.length,
    minAltitude:     Math.min(...altitudes),
    maxAltitude:     Math.max(...altitudes),
    needsReviewCount,
    rows:            processedRows,
  };

  return { blockers: [], warnings, previewData, processedRows };
}
