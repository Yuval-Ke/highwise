'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireAdmin, requireOwner } from '@/lib/adminAuth';
import { buildAndValidateSnapshot, commitSnapshot } from '@/lib/publishService';

async function getAuthAdmin() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  return requireAdmin(user.id);
}

async function getAuthOwner() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  return requireOwner(user.id);
}

// ── Countries ─────────────────────────────────────────────────────────────────

export async function createCountry(formData: FormData): Promise<void> {
  const admin = await getAuthAdmin();
  if (!admin) { console.error('[createCountry] unauthorized'); return; }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('countries').insert({
    country_code: (formData.get('country_code') as string)?.trim().toLowerCase(),
    name_en:      (formData.get('name_en') as string)?.trim(),
    name_he:      (formData.get('name_he') as string)?.trim(),
    sort_order:   Number(formData.get('sort_order') ?? 0),
    is_active:    true,
  });
  if (error) { console.error('[createCountry]', error.message); return; }

  revalidatePath('/admin/dataset');
}

export async function updateCountry(formData: FormData): Promise<void> {
  const admin = await getAuthAdmin();
  if (!admin) { console.error('[updateCountry] unauthorized'); return; }

  const id = formData.get('id') as string;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('countries').update({
    name_en:    (formData.get('name_en') as string)?.trim(),
    name_he:    (formData.get('name_he') as string)?.trim(),
    sort_order: Number(formData.get('sort_order') ?? 0),
    is_active:  formData.get('is_active') === 'true',
  }).eq('id', id);
  if (error) { console.error('[updateCountry]', error.message); return; }

  revalidatePath('/admin/dataset');
}

// ── Treks ─────────────────────────────────────────────────────────────────────

export async function createTrek(formData: FormData): Promise<void> {
  const admin = await getAuthAdmin();
  if (!admin) { console.error('[createTrek] unauthorized'); return; }

  const aliasesRaw = (formData.get('aliases') as string) ?? '';
  const aliases = aliasesRaw.split(',').map(s => s.trim()).filter(Boolean);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('treks').insert({
    country_id:  formData.get('country_id') as string,
    trek_id:     (formData.get('trek_id') as string)?.trim().toLowerCase().replace(/\s+/g, '_'),
    name_en:     (formData.get('name_en') as string)?.trim(),
    name_he:     (formData.get('name_he') as string)?.trim(),
    aliases,
    region:      (formData.get('region') as string)?.trim() ?? '',
    is_popular:  formData.get('is_popular') === 'true',
    sort_order:  Number(formData.get('sort_order') ?? 0),
    is_active:   true,
    needs_review: false,
  });
  if (error) { console.error('[createTrek]', error.message); return; }

  revalidatePath('/admin/dataset');
}

export async function updateTrek(formData: FormData): Promise<void> {
  const admin = await getAuthAdmin();
  if (!admin) { console.error('[updateTrek] unauthorized'); return; }

  const id = formData.get('id') as string;
  const aliasesRaw = (formData.get('aliases') as string) ?? '';
  const aliases = aliasesRaw.split(',').map(s => s.trim()).filter(Boolean);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('treks').update({
    name_en:      (formData.get('name_en') as string)?.trim(),
    name_he:      (formData.get('name_he') as string)?.trim(),
    aliases,
    region:       (formData.get('region') as string)?.trim() ?? '',
    is_popular:   formData.get('is_popular') === 'true',
    is_active:    formData.get('is_active') === 'true',
    needs_review: formData.get('needs_review') === 'true',
    sort_order:   Number(formData.get('sort_order') ?? 0),
  }).eq('id', id);
  if (error) { console.error('[updateTrek]', error.message); return; }

  revalidatePath('/admin/dataset');
  const trekSlug = formData.get('trek_id') as string | null;
  if (trekSlug) revalidatePath(`/admin/dataset/${trekSlug}`);
}

export async function cloneTrek(formData: FormData): Promise<void> {
  const admin = await getAuthAdmin();
  if (!admin) { console.error('[cloneTrek] unauthorized'); return; }

  const sourceTrekId = formData.get('source_trek_id') as string;
  const newTrekId    = (formData.get('new_trek_id') as string)?.trim().toLowerCase().replace(/\s+/g, '_');
  const newNameEn    = (formData.get('new_name_en') as string)?.trim();

  const supabase = createServerSupabaseClient();

  const { data: sourceTrek, error: sErr } = await supabase
    .from('treks')
    .select('*')
    .eq('id', sourceTrekId)
    .single();
  if (sErr || !sourceTrek) return;

  const { data: newTrek, error: tErr } = await supabase.from('treks').insert({
    country_id:   sourceTrek.country_id,
    trek_id:      newTrekId,
    name_en:      newNameEn,
    name_he:      sourceTrek.name_he,
    aliases:      sourceTrek.aliases,
    region:       sourceTrek.region,
    is_popular:   false,
    is_active:    false,
    needs_review: true,
    sort_order:   sourceTrek.sort_order + 1,
  }).select('id').single();
  if (tErr || !newTrek) return;

  const { data: locs, error: lErr } = await supabase
    .from('locations')
    .select('*')
    .eq('trek_id', sourceTrekId);
  if (!lErr && locs?.length) {
    await supabase.from('locations').insert(
      locs.map(loc => ({
        trek_id:       newTrek.id,
        location_id:   loc.location_id,
        name_en:       loc.name_en,
        name_he:       loc.name_he,
        aliases:       loc.aliases,
        altitude_m:    loc.altitude_m,
        route_order:   loc.route_order,
        section:       loc.section,
        location_type: loc.location_type,
        needs_review:  true,
        is_active:     loc.is_active,
      }))
    );
  }

  revalidatePath('/admin/dataset');
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function createLocation(formData: FormData): Promise<void> {
  const admin = await getAuthAdmin();
  if (!admin) { console.error('[createLocation] unauthorized'); return; }

  const aliasesRaw = (formData.get('aliases') as string) ?? '';
  const aliases = aliasesRaw.split(',').map(s => s.trim()).filter(Boolean);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('locations').insert({
    trek_id:       formData.get('trek_id') as string,
    location_id:   (formData.get('location_id') as string)?.trim().toLowerCase().replace(/\s+/g, '_'),
    name_en:       (formData.get('name_en') as string)?.trim(),
    name_he:       (formData.get('name_he') as string)?.trim(),
    aliases,
    altitude_m:    Number(formData.get('altitude_m') ?? 0),
    route_order:   Number(formData.get('route_order') ?? 0),
    section:       formData.get('section') as string,
    location_type: formData.get('location_type') as string,
    needs_review:  formData.get('needs_review') === 'true',
    is_active:     true,
  });
  if (error) { console.error('[createLocation]', error.message); return; }

  const trekSlug = formData.get('trek_slug') as string;
  revalidatePath(`/admin/dataset/${trekSlug}`);
}

export async function updateLocation(formData: FormData): Promise<void> {
  const admin = await getAuthAdmin();
  if (!admin) { console.error('[updateLocation] unauthorized'); return; }

  const id = formData.get('id') as string;
  const aliasesRaw = (formData.get('aliases') as string) ?? '';
  const aliases = aliasesRaw.split(',').map(s => s.trim()).filter(Boolean);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('locations').update({
    name_en:       (formData.get('name_en') as string)?.trim(),
    name_he:       (formData.get('name_he') as string)?.trim(),
    aliases,
    altitude_m:    Number(formData.get('altitude_m') ?? 0),
    route_order:   Number(formData.get('route_order') ?? 0),
    section:       formData.get('section') as string,
    location_type: formData.get('location_type') as string,
    needs_review:  formData.get('needs_review') === 'true',
    is_active:     formData.get('is_active') === 'true',
  }).eq('id', id);
  if (error) { console.error('[updateLocation]', error.message); return; }

  const trekSlug = formData.get('trek_slug') as string;
  revalidatePath(`/admin/dataset/${trekSlug}`);
}

export async function deleteLocation(formData: FormData): Promise<void> {
  const admin = await getAuthAdmin();
  if (!admin) { console.error('[deleteLocation] unauthorized'); return; }

  const id       = formData.get('id') as string;
  const trekSlug = formData.get('trek_slug') as string;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) { console.error('[deleteLocation]', error.message); return; }
  revalidatePath(`/admin/dataset/${trekSlug}`);
}

// ── Publish ───────────────────────────────────────────────────────────────────

export async function publishDataset(formData: FormData): Promise<void> {
  const owner = await getAuthOwner();
  if (!owner) return;

  const confirmed = formData.get('confirmed') === 'true';
  if (!confirmed) return;

  const result = await buildAndValidateSnapshot();
  if (result.validationErrors.length > 0 || !result.snapshot) return;

  await commitSnapshot(result.snapshot, owner.userId);

  revalidatePath('/admin/dataset');
}
