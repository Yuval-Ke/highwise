/**
 * Idempotent seed: upserts the full bundled Nepal dataset into Supabase draft tables.
 * Safe to re-run — uses ON CONFLICT upsert on natural keys.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/seed-nepal.ts
 */
import { createClient } from '@supabase/supabase-js';
import { NEPAL_DATA } from '../src/lib/nepalData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('=== HighWise Nepal seed ===\n');

  // ── 1. Country ────────────────────────────────────────────────────────────────
  const { data: countryRow, error: cErr } = await supabase
    .from('countries')
    .upsert(
      {
        country_code: NEPAL_DATA.countryId,
        name_en:      NEPAL_DATA.nameEn,
        name_he:      NEPAL_DATA.nameHe,
        sort_order:   1,
        is_active:    true,
      },
      { onConflict: 'country_code' }
    )
    .select('id')
    .single();

  if (cErr || !countryRow) {
    throw new Error(`Country upsert failed: ${cErr?.message ?? 'no row returned'}`);
  }
  console.log(`Country: ${NEPAL_DATA.nameEn}  id=${countryRow.id}`);

  // ── 2. Treks + Locations ──────────────────────────────────────────────────────
  let totalLocations = 0;

  for (let i = 0; i < NEPAL_DATA.treks.length; i++) {
    const trek = NEPAL_DATA.treks[i];

    const { data: trekRow, error: tErr } = await supabase
      .from('treks')
      .upsert(
        {
          trek_id:      trek.trekId,
          country_id:   countryRow.id,
          name_en:      trek.nameEn,
          name_he:      trek.nameHe,
          aliases:      trek.aliases,
          region:       trek.region,
          is_popular:   trek.popular,
          sort_order:   (i + 1) * 10,
          is_active:    true,
          needs_review: false,
        },
        { onConflict: 'trek_id' }
      )
      .select('id')
      .single();

    if (tErr || !trekRow) {
      throw new Error(`Trek upsert failed for ${trek.trekId}: ${tErr?.message ?? 'no row returned'}`);
    }

    for (const loc of trek.locations) {
      const { error: lErr } = await supabase
        .from('locations')
        .upsert(
          {
            trek_id:       trekRow.id,
            location_id:   loc.locationId,
            name_en:       loc.nameEn,
            name_he:       loc.nameHe,
            aliases:       loc.aliases,
            altitude_m:    loc.altitudeMeters,
            route_order:   loc.order,
            section:       loc.section,
            location_type: loc.locationType,
            needs_review:  loc.needsReview ?? false,
            is_active:     true,
          },
          { onConflict: 'trek_id,location_id' }
        );

      if (lErr) {
        throw new Error(
          `Location upsert failed for ${loc.locationId} in ${trek.trekId}: ${lErr.message}`
        );
      }
    }

    console.log(
      `  [${String(i + 1).padStart(2)}/${NEPAL_DATA.treks.length}] ${trek.nameEn.padEnd(40)} ${trek.locations.length} locations`
    );
    totalLocations += trek.locations.length;
  }

  // ── 3. Final row counts ───────────────────────────────────────────────────────
  const [
    { count: cc },
    { count: tc },
    { count: lc },
    { count: dv },
  ] = await Promise.all([
    supabase.from('countries').select('*', { count: 'exact', head: true }),
    supabase.from('treks').select('*', { count: 'exact', head: true }),
    supabase.from('locations').select('*', { count: 'exact', head: true }),
    supabase.from('dataset_versions').select('*', { count: 'exact', head: true }),
  ]);

  console.log('\n=== Seed complete ===');
  console.log(`Countries:        ${cc}`);
  console.log(`Treks:            ${tc}`);
  console.log(`Locations:        ${lc}`);
  console.log(`Dataset versions: ${dv}`);
  console.log(`\nApplied: 1 country, ${NEPAL_DATA.treks.length} treks, ${totalLocations} location rows`);
}

main().catch(e => {
  console.error('\nSeed failed:', e);
  process.exit(1);
});
