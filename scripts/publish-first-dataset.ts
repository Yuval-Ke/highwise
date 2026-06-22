/**
 * One-time publish script for the first Nepal dataset snapshot.
 * Builds + validates from DB draft tables, then commits with a custom version label.
 * Safe to inspect with DRY_RUN=1 env var (prints validation result, does not commit).
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/publish-first-dataset.ts
 */
import { createClient } from '@supabase/supabase-js';
import { buildAndValidateSnapshot, commitSnapshot } from '../src/lib/publishService';

const FIRST_VERSION = 'v0.3.0-nepal-initial';
const DRY_RUN      = process.env.DRY_RUN === '1';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  console.log(`=== HighWise first dataset publish${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  // ── Build & validate ─────────────────────────────────────────────────────────
  console.log('Building snapshot from draft tables...');
  const result = await buildAndValidateSnapshot();

  // Warnings (needsReview locations — non-blocking)
  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    result.warnings.forEach(w => console.log(`  ⚠  ${w}`));
  }

  // Blockers
  if (result.validationErrors.length > 0) {
    console.error(`\nValidation errors — publish blocked (${result.validationErrors.length}):`);
    result.validationErrors.forEach(e => console.error(`  [${e.entity}] ${e.message}`));
    process.exit(1);
  }

  const { snapshot, changeSummary } = result;
  if (!snapshot) { console.error('No snapshot built'); process.exit(1); }

  // ── Validation report ────────────────────────────────────────────────────────
  console.log('\nValidation: PASS (0 errors)');
  console.log(`Countries:        ${snapshot.countries.length}`);
  console.log(`Treks:            ${snapshot.treks.length}`);
  console.log(`Locations:        ${snapshot.locations.length}`);
  console.log(`Warnings:         ${result.warnings.length}`);

  if (changeSummary) {
    console.log(`\nChange summary (first publish):`);
    console.log(`  Countries added:  ${changeSummary.countriesAdded.join(', ') || '—'}`);
    console.log(`  Treks added:      ${changeSummary.treksAdded.length}`);
    console.log(`  Locations added:  ${changeSummary.locationsAdded.length}`);
    console.log(`  NeedsReview:      ${changeSummary.needsReviewCount}`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Skipping commit. Re-run without DRY_RUN=1 to publish.');
    return;
  }

  // ── Override version to custom label ─────────────────────────────────────────
  snapshot.datasetVersion = FIRST_VERSION;

  // ── Look up owner user ID (recorded in dataset_versions.published_by) ────────
  const supabase = createClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ownerRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('role', 'owner')
    .eq('is_active', true)
    .single();

  const publishedBy = ownerRow?.id ?? '00000000-0000-0000-0000-000000000000';

  // ── Commit ───────────────────────────────────────────────────────────────────
  console.log(`\nCommitting version "${FIRST_VERSION}" (published_by=${publishedBy})...`);
  await commitSnapshot(snapshot, publishedBy);

  console.log('\n=== Published successfully ===');
  console.log(`Version:   ${FIRST_VERSION}`);
  console.log(`Countries: ${snapshot.countries.length}`);
  console.log(`Treks:     ${snapshot.treks.length}`);
  console.log(`Locations: ${snapshot.locations.length}`);
}

main().catch(e => {
  console.error('\nPublish failed:', e);
  process.exit(1);
});
