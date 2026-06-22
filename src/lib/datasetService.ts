import { createServerSupabaseClient } from './supabase/server';
import type { PublishedDataset } from '@/types/backend';

/**
 * Returns the current published dataset snapshot, or null if none exists yet.
 * Only payload_json is selected — admin metadata (published_by, notes, etc.)
 * is never included in the response.
 */
export async function getPublishedDataset(): Promise<PublishedDataset | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('dataset_versions')
    .select('payload_json')
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load published dataset: ${error.message}`);
  }

  if (!data) return null;

  return data.payload_json as PublishedDataset;
}
