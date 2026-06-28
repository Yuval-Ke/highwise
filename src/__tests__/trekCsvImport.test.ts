import { parseCsvText } from '@/lib/trekCsvImport';
import { validateCsvRows } from '@/lib/trekCsvImportValidation';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_HEADER =
  'countryId,trekId,trekNameEn,trekNameHe,region,trekAliases,locationId,nameEn,nameHe,altitudeMeters,order,section,locationType,aliases,needsReview,sourceNotes';

function row(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    countryId:     'nepal',
    trekId:        'manaslu_circuit',
    trekNameEn:    'Manaslu Circuit',
    trekNameHe:    'סובב מנאסלו',
    region:        'Manaslu',
    trekAliases:   'Manaslu Trek;Manaslu Loop',
    locationId:    'soti_khola',
    nameEn:        'Soti Khola',
    nameHe:        'סוטי קולה',
    altitudeMeters:'710',
    order:         '1',
    section:       'on_route',
    locationType:  'village',
    aliases:       'Sotikhola;Soti',
    needsReview:   'true',
    sourceNotes:   'common trekking stop',
  };
  const merged = { ...defaults, ...overrides };
  return [
    merged.countryId, merged.trekId, merged.trekNameEn, merged.trekNameHe,
    merged.region, merged.trekAliases, merged.locationId, merged.nameEn,
    merged.nameHe, merged.altitudeMeters, merged.order, merged.section,
    merged.locationType, merged.aliases, merged.needsReview, merged.sourceNotes,
  ].join(',');
}

const VALID_CSV = [VALID_HEADER, row()].join('\n');
const VALID_COUNTRY_CODES = ['nepal'];

// ── parseCsvText ──────────────────────────────────────────────────────────────

describe('parseCsvText()', () => {
  it('parses a valid single-row CSV correctly', () => {
    const { rows, fatalError } = parseCsvText(VALID_CSV);
    expect(fatalError).toBeNull();
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.countryId).toBe('nepal');
    expect(r.trekId).toBe('manaslu_circuit');
    expect(r.trekNameEn).toBe('Manaslu Circuit');
    expect(r.locationId).toBe('soti_khola');
    expect(r.nameEn).toBe('Soti Khola');
    expect(r.altitudeMeters).toBe(710);
    expect(r.order).toBe(1);
    expect(r.section).toBe('on_route');
    expect(r.locationType).toBe('village');
  });

  it('parses semicolon-separated trekAliases into array', () => {
    const { rows } = parseCsvText(VALID_CSV);
    expect(rows[0].trekAliases).toEqual(['Manaslu Trek', 'Manaslu Loop']);
  });

  it('parses semicolon-separated aliases into array', () => {
    const { rows } = parseCsvText(VALID_CSV);
    expect(rows[0].aliases).toEqual(['Sotikhola', 'Soti']);
  });

  it('returns empty array for empty aliases field', () => {
    const csv = [VALID_HEADER, row({ aliases: '', trekAliases: '' })].join('\n');
    const { rows } = parseCsvText(csv);
    expect(rows[0].aliases).toEqual([]);
    expect(rows[0].trekAliases).toEqual([]);
  });

  it('trims whitespace from all values', () => {
    const csv = [VALID_HEADER, row({ nameEn: '  Soti Khola  ', countryId: ' nepal ' })].join('\n');
    const { rows } = parseCsvText(csv);
    expect(rows[0].nameEn).toBe('Soti Khola');
    expect(rows[0].countryId).toBe('nepal');
  });

  it('parses needsReview=true as true', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ needsReview: 'true' })].join('\n'));
    expect(rows[0].needsReview).toBe(true);
  });

  it('parses needsReview=false as false', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ needsReview: 'false' })].join('\n'));
    expect(rows[0].needsReview).toBe(false);
  });

  it('parses needsReview=yes as true', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ needsReview: 'yes' })].join('\n'));
    expect(rows[0].needsReview).toBe(true);
  });

  it('parses needsReview=no as false', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ needsReview: 'no' })].join('\n'));
    expect(rows[0].needsReview).toBe(false);
  });

  it('parses needsReview=1 as true', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ needsReview: '1' })].join('\n'));
    expect(rows[0].needsReview).toBe(true);
  });

  it('parses needsReview=0 as false', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ needsReview: '0' })].join('\n'));
    expect(rows[0].needsReview).toBe(false);
  });

  it('defaults needsReview to false when empty', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ needsReview: '' })].join('\n'));
    expect(rows[0].needsReview).toBe(false);
  });

  it('defaults section to "on_route" when empty', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ section: '' })].join('\n'));
    expect(rows[0].section).toBe('on_route');
  });

  it('defaults locationType to "village" when empty', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ locationType: '' })].join('\n'));
    expect(rows[0].locationType).toBe('village');
  });

  it('returns null altitudeMeters for non-numeric value', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ altitudeMeters: 'abc' })].join('\n'));
    expect(rows[0].altitudeMeters).toBeNull();
  });

  it('returns null order for non-numeric value', () => {
    const { rows } = parseCsvText([VALID_HEADER, row({ order: 'abc' })].join('\n'));
    expect(rows[0].order).toBeNull();
  });

  it('handles a quoted field containing a comma', () => {
    const csv = [
      VALID_HEADER,
      row({ sourceNotes: '"common stop, altitude varies"' }),
    ].join('\n');
    const { rows } = parseCsvText(csv);
    expect(rows[0].sourceNotes).toBe('common stop, altitude varies');
  });

  it('returns fatalError for empty CSV', () => {
    const { fatalError } = parseCsvText('');
    expect(fatalError).not.toBeNull();
  });

  it('returns fatalError when required header columns are missing', () => {
    const { fatalError } = parseCsvText('countryId,trekId\nnepallmanaslu');
    expect(fatalError).not.toBeNull();
    expect(fatalError).toContain('missing required columns');
  });

  it('parses multiple data rows', () => {
    const csv = [
      VALID_HEADER,
      row({ locationId: 'soti_khola', order: '1' }),
      row({ locationId: 'machha_khola', order: '2' }),
    ].join('\n');
    const { rows } = parseCsvText(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1].locationId).toBe('machha_khola');
  });

  it('ignores blank lines between rows', () => {
    const csv = [VALID_HEADER, '', row(), ''].join('\n');
    const { rows } = parseCsvText(csv);
    expect(rows).toHaveLength(1);
  });
});

// ── validateCsvRows ───────────────────────────────────────────────────────────

describe('validateCsvRows()', () => {
  function parse(csv: string) {
    return parseCsvText(csv).rows;
  }

  it('valid CSV produces no blockers and returns previewData', () => {
    const rows = parse(VALID_CSV);
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers).toHaveLength(0);
    expect(result.previewData).not.toBeNull();
    expect(result.processedRows).not.toBeNull();
  });

  it('empty rows array produces blocker', () => {
    const result = validateCsvRows([], VALID_COUNTRY_CODES);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it('missing required field trekId produces blocker', () => {
    const rows = parse([VALID_HEADER, row({ trekId: '' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('"trekId"'))).toBe(true);
  });

  it('missing required field locationId produces blocker', () => {
    const rows = parse([VALID_HEADER, row({ locationId: '' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('"locationId"'))).toBe(true);
  });

  it('missing required field altitudeMeters (non-numeric) produces blocker', () => {
    const rows = parse([VALID_HEADER, row({ altitudeMeters: 'abc' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('altitudeMeters'))).toBe(true);
  });

  it('altitude < 0 produces blocker', () => {
    const rows = parse([VALID_HEADER, row({ altitudeMeters: '-1' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('out of range'))).toBe(true);
  });

  it('altitude > 9000 produces blocker', () => {
    const rows = parse([VALID_HEADER, row({ altitudeMeters: '9001' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('out of range'))).toBe(true);
  });

  it('altitude exactly 9000 is allowed', () => {
    const rows = parse([VALID_HEADER, row({ altitudeMeters: '9000' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('out of range'))).toBe(false);
  });

  it('invalid snake_case trekId produces blocker', () => {
    const rows = parse([VALID_HEADER, row({ trekId: 'Manaslu Circuit' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('trekId'))).toBe(true);
  });

  it('invalid snake_case locationId produces blocker', () => {
    const rows = parse([VALID_HEADER, row({ locationId: 'Soti Khola' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('locationId'))).toBe(true);
  });

  it('unknown countryId produces blocker', () => {
    const rows = parse([VALID_HEADER, row({ countryId: 'peru' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('countryId') && b.includes('peru'))).toBe(true);
  });

  it('duplicate locationId produces blocker', () => {
    const csv = [
      VALID_HEADER,
      row({ locationId: 'soti_khola', order: '1' }),
      row({ locationId: 'soti_khola', order: '2' }),
    ].join('\n');
    const rows = parse(csv);
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('Duplicate locationId'))).toBe(true);
  });

  it('duplicate order produces blocker', () => {
    const csv = [
      VALID_HEADER,
      row({ locationId: 'soti_khola', order: '1' }),
      row({ locationId: 'machha_khola', order: '1' }),
    ].join('\n');
    const rows = parse(csv);
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('Duplicate order'))).toBe(true);
  });

  it('multiple trekId values produce blocker', () => {
    const csv = [
      VALID_HEADER,
      row({ trekId: 'manaslu_circuit', locationId: 'soti_khola', order: '1' }),
      row({ trekId: 'everest_base_camp', locationId: 'lukla', order: '2' }),
    ].join('\n');
    const rows = parse(csv);
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('multiple trek IDs'))).toBe(true);
  });

  it('invalid section (not main, not valid) produces blocker', () => {
    const rows = parse([VALID_HEADER, row({ section: 'unknown_section' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers.some(b => b.includes('section') && b.includes('unknown_section'))).toBe(true);
  });

  it('section "main" is converted to "on_route" with a warning (not a blocker)', () => {
    const rows = parse([VALID_HEADER, row({ section: 'main' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('"main"') && w.includes('"on_route"'))).toBe(true);
    expect(result.processedRows![0].section).toBe('on_route');
  });

  it('missing trekNameHe produces warning but not blocker', () => {
    const rows = parse([VALID_HEADER, row({ trekNameHe: '' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('trekNameHe'))).toBe(true);
  });

  it('missing nameHe produces warning but not blocker', () => {
    const rows = parse([VALID_HEADER, row({ nameHe: '' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('Hebrew name'))).toBe(true);
  });

  it('missing sourceNotes produces warning but not blocker', () => {
    const rows = parse([VALID_HEADER, row({ sourceNotes: '' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('sourceNotes'))).toBe(true);
  });

  it('needsReview=true produces warning but not blocker', () => {
    const rows = parse([VALID_HEADER, row({ needsReview: 'true' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('needsReview'))).toBe(true);
  });

  it('order gaps produce warning but not blocker', () => {
    const csv = [
      VALID_HEADER,
      row({ locationId: 'a', order: '1' }),
      row({ locationId: 'b', order: '2' }),
      row({ locationId: 'c', order: '4' }),
    ].join('\n');
    const rows = parse(csv);
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('gaps'))).toBe(true);
  });

  it('previewData counts are correct', () => {
    const csv = [
      VALID_HEADER,
      row({ locationId: 'a', order: '1', altitudeMeters: '1000', needsReview: 'true' }),
      row({ locationId: 'b', order: '2', altitudeMeters: '3000', needsReview: 'false' }),
    ].join('\n');
    const rows = parse(csv);
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.previewData!.locationCount).toBe(2);
    expect(result.previewData!.minAltitude).toBe(1000);
    expect(result.previewData!.maxAltitude).toBe(3000);
    expect(result.previewData!.needsReviewCount).toBe(1);
  });

  it('processedRows is null when blockers exist', () => {
    const rows = parse([VALID_HEADER, row({ trekId: '' })].join('\n'));
    const result = validateCsvRows(rows, VALID_COUNTRY_CODES);
    expect(result.processedRows).toBeNull();
    expect(result.previewData).toBeNull();
  });
});
