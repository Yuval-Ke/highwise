export interface ParsedRow {
  countryId: string;
  trekId: string;
  trekNameEn: string;
  trekNameHe: string;
  region: string;
  trekAliases: string[];
  locationId: string;
  nameEn: string;
  nameHe: string;
  altitudeMeters: number | null;
  order: number | null;
  section: string;
  locationType: string;
  aliases: string[];
  needsReview: boolean;
  sourceNotes: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  fatalError: string | null;
}

const EXPECTED_COLUMNS = [
  'countryId', 'trekId', 'trekNameEn', 'trekNameHe', 'region', 'trekAliases',
  'locationId', 'nameEn', 'nameHe', 'altitudeMeters', 'order', 'section',
  'locationType', 'aliases', 'needsReview', 'sourceNotes',
] as const;

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseSemicolonList(value: string): string[] {
  return value.split(';').map(s => s.trim()).filter(Boolean);
}

function parseNeedsReview(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === 'true' || v === 'yes' || v === '1';
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return isNaN(n) ? null : n;
}

export function parseCsvText(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');

  if (lines.length === 0) {
    return { rows: [], fatalError: 'CSV is empty.' };
  }

  const headerFields = splitCsvLine(lines[0]).map(h => h.trim());

  const missing = EXPECTED_COLUMNS.filter(col => !headerFields.includes(col));
  if (missing.length > 0) {
    return {
      rows: [],
      fatalError: `CSV header is missing required columns: ${missing.join(', ')}`,
    };
  }

  const colIndex = (name: string) => headerFields.indexOf(name);

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    const get = (col: string) => (fields[colIndex(col)] ?? '').trim();

    const rawSection = get('section');
    const section = rawSection === '' ? 'on_route' : rawSection;

    const rawLocationType = get('locationType');
    const locationType = rawLocationType === '' ? 'village' : rawLocationType;

    rows.push({
      countryId:    get('countryId'),
      trekId:       get('trekId'),
      trekNameEn:   get('trekNameEn'),
      trekNameHe:   get('trekNameHe'),
      region:       get('region'),
      trekAliases:  parseSemicolonList(get('trekAliases')),
      locationId:   get('locationId'),
      nameEn:       get('nameEn'),
      nameHe:       get('nameHe'),
      altitudeMeters: parseNumber(get('altitudeMeters')),
      order:          parseNumber(get('order')),
      section,
      locationType,
      aliases:      parseSemicolonList(get('aliases')),
      needsReview:  parseNeedsReview(get('needsReview')),
      sourceNotes:  get('sourceNotes'),
    });
  }

  return { rows, fatalError: null };
}
