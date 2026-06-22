/**
 * verify-schema.mjs — Phase 1 schema verification
 * Reads .env.local (never prints secret values).
 * Checks all 9 tables exist via Supabase REST API.
 * Checks seed data in app_config and countries.
 *
 * Usage: node scripts/verify-schema.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath  = join(__dirname, '..', '.env.local');

// Parse .env.local without printing values
const env = {};
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) env[m[1]] = m[2].trim();
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey  = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env.local');
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
};

const TABLES = [
  'admin_users',
  'countries',
  'treks',
  'locations',
  'app_config',
  'dataset_versions',
  'assessment_logs',
  'sync_logs',
  'audit_logs',
];

const EXPECTED_CONFIG_KEYS = [
  'schema_version', 'config_version', 'dataset_version',
  'sync_enabled', 'sync_interval',
  'maintenance_mode', 'maintenance_message',
  'app_disabled', 'disabled_message',
  'min_supported_version', 'payment_mode',
  'location_enabled', 'current_altitude_from_location_enabled',
  'ascent_tracking_enabled', 'send_location_data_enabled',
];

async function get(path) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
  return { status: res.status, ok: res.ok, body: res.ok ? await res.json() : null };
}

console.log('\n── Table existence ──────────────────────────────────');
let allTablesOk = true;
for (const table of TABLES) {
  const { status, ok } = await get(`${table}?limit=1`);
  const mark = ok ? '✅' : '❌';
  console.log(`${mark}  ${table.padEnd(22)} HTTP ${status}`);
  if (!ok) allTablesOk = false;
}

console.log('\n── Seed: app_config ─────────────────────────────────');
const { ok: cfgOk, body: cfgRows } = await get('app_config?select=key&order=key');
if (cfgOk) {
  const keys = cfgRows.map(r => r.key).sort();
  const missing = EXPECTED_CONFIG_KEYS.filter(k => !keys.includes(k));
  console.log(`rows present : ${keys.length} (expected ${EXPECTED_CONFIG_KEYS.length})`);
  if (missing.length === 0) {
    console.log('✅  all expected config keys present');
  } else {
    console.log(`❌  missing keys: ${missing.join(', ')}`);
  }
} else {
  console.log('❌  could not read app_config');
}

console.log('\n── Seed: countries ──────────────────────────────────');
const { ok: ctryOk, body: ctryRows } = await get('countries?select=country_code,name_en,name_he,is_active');
if (ctryOk) {
  console.log(`rows present : ${ctryRows.length}`);
  for (const r of ctryRows) {
    const mark = r.country_code === 'nepal' && r.is_active ? '✅' : '⚠️';
    console.log(`${mark}  ${r.country_code} / ${r.name_en} / ${r.name_he} / active=${r.is_active}`);
  }
} else {
  console.log('❌  could not read countries');
}

console.log('\n─────────────────────────────────────────────────────');
if (allTablesOk) {
  console.log('✅  All 9 tables verified.\n');
} else {
  console.log('❌  One or more tables missing.');
  console.log('    → Paste supabase/combined_phase1_schema.sql into the Supabase SQL Editor and re-run.\n');
}
