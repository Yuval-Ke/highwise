'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireAdmin } from '@/lib/adminAuth';
import type { ParsedRow } from '@/lib/trekCsvImport';

export interface ImportPayload {
  countryId: string;
  trekId: string;
  trekNameEn: string;
  trekNameHe: string;
  region: string;
  trekAliases: string[];
  rows: ParsedRow[];
  conflictResolution?: 'replace' | 'add_only';
}

export type ImportActionResult =
  | { status: 'success'; trekId: string; locationCount: number }
  | { status: 'conflict'; existingTrek: { trekId: string; nameEn: string; locationCount: number } }
  | { status: 'error'; message: string };

export async function importTrekCsv(payload: ImportPayload): Promise<ImportActionResult> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { status: 'error', message: 'Not authenticated.' };

  const adminUser = await requireAdmin(user.id);
  if (!adminUser) return { status: 'error', message: 'Not authorized.' };

  const { countryId, trekId, trekNameEn, trekNameHe, region, trekAliases, rows, conflictResolution } = payload;

  // ── Server-side sanity checks ────────────────────────────────────────────────
  if (!trekId || !countryId || rows.length === 0) {
    return { status: 'error', message: 'Invalid import payload.' };
  }

  const supabase = createServerSupabaseClient();

  // ── Resolve countryId slug → country UUID ───────────────────────────────────
  const { data: country } = await supabase
    .from('countries')
    .select('id, country_code')
    .eq('country_code', countryId.toLowerCase())
    .eq('is_active', true)
    .maybeSingle();

  if (!country) {
    return { status: 'error', message: `Country "${countryId}" not found or is inactive.` };
  }

  // ── Check for existing trek ─────────────────────────────────────────────────
  const { data: existingTrek } = await supabase
    .from('treks')
    .select('id, trek_id, name_en')
    .eq('trek_id', trekId)
    .maybeSingle();

  if (existingTrek && !conflictResolution) {
    const { count } = await supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('trek_id', existingTrek.id);

    return {
      status: 'conflict',
      existingTrek: {
        trekId:        existingTrek.trek_id,
        nameEn:        existingTrek.name_en,
        locationCount: count ?? 0,
      },
    };
  }

  const hasNeedsReview = rows.some(r => r.needsReview);

  const toLocationRow = (trekUuid: string, r: ParsedRow) => ({
    trek_id:       trekUuid,
    location_id:   r.locationId,
    name_en:       r.nameEn,
    name_he:       r.nameHe || r.nameEn,
    aliases:       r.aliases,
    altitude_m:    r.altitudeMeters!,
    route_order:   r.order!,
    section:       r.section,
    location_type: r.locationType,
    needs_review:  r.needsReview,
    is_active:     true,
  });

  // ── New trek ────────────────────────────────────────────────────────────────
  if (!existingTrek) {
    const { data: newTrek, error: trekErr } = await supabase
      .from('treks')
      .insert({
        country_id:   country.id,
        trek_id:      trekId,
        name_en:      trekNameEn,
        name_he:      trekNameHe || trekNameEn,
        aliases:      trekAliases,
        region:       region,
        is_popular:   false,
        is_active:    true,
        needs_review: hasNeedsReview,
        sort_order:   999,
      })
      .select('id')
      .single();

    if (trekErr || !newTrek) {
      return { status: 'error', message: trekErr?.message ?? 'Failed to create trek.' };
    }

    const { error: locErr } = await supabase
      .from('locations')
      .insert(rows.map(r => toLocationRow(newTrek.id, r)));

    if (locErr) return { status: 'error', message: locErr.message };

    revalidatePath('/admin/dataset');
    revalidatePath('/admin/import');
    return { status: 'success', trekId, locationCount: rows.length };
  }

  // ── Replace existing ────────────────────────────────────────────────────────
  if (conflictResolution === 'replace') {
    const { error: delErr } = await supabase
      .from('locations')
      .delete()
      .eq('trek_id', existingTrek.id);

    if (delErr) return { status: 'error', message: delErr.message };

    const { error: updErr } = await supabase
      .from('treks')
      .update({
        name_en:      trekNameEn,
        name_he:      trekNameHe || trekNameEn,
        aliases:      trekAliases,
        region:       region,
        needs_review: hasNeedsReview,
      })
      .eq('id', existingTrek.id);

    if (updErr) return { status: 'error', message: updErr.message };

    const { error: locErr } = await supabase
      .from('locations')
      .insert(rows.map(r => toLocationRow(existingTrek.id, r)));

    if (locErr) return { status: 'error', message: locErr.message };

    revalidatePath('/admin/dataset');
    revalidatePath('/admin/import');
    return { status: 'success', trekId, locationCount: rows.length };
  }

  // ── Add only new locations ──────────────────────────────────────────────────
  if (conflictResolution === 'add_only') {
    const { data: existingLocs } = await supabase
      .from('locations')
      .select('location_id')
      .eq('trek_id', existingTrek.id);

    const existingIds = new Set((existingLocs ?? []).map((l: { location_id: string }) => l.location_id));
    const newRows = rows.filter(r => !existingIds.has(r.locationId));

    if (newRows.length > 0) {
      const { error: locErr } = await supabase
        .from('locations')
        .insert(newRows.map(r => toLocationRow(existingTrek.id, r)));

      if (locErr) return { status: 'error', message: locErr.message };
    }

    await supabase
      .from('treks')
      .update({
        name_en:      trekNameEn,
        name_he:      trekNameHe || trekNameEn,
        aliases:      trekAliases,
        region:       region,
        needs_review: hasNeedsReview,
      })
      .eq('id', existingTrek.id);

    revalidatePath('/admin/dataset');
    revalidatePath('/admin/import');
    return { status: 'success', trekId, locationCount: newRows.length };
  }

  return { status: 'error', message: 'Unknown conflict resolution.' };
}
