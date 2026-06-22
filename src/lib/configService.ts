import { createServerSupabaseClient } from './supabase/server';
import type { PublicAppConfig, PaymentMode } from '@/types/backend';

/**
 * Reads all rows from app_config and assembles a PublicAppConfig response.
 * Only safe, public-facing fields are included — is_sensitive, description,
 * updated_by, and id are never returned.
 */
export async function getPublicConfig(): Promise<PublicAppConfig> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('app_config')
    .select('key, value, updated_at')
    .order('key');

  if (error) {
    throw new Error(`Failed to load app config: ${error.message}`);
  }

  const rows = data ?? [];

  // Flat key → value map; jsonb values arrive already parsed by the JS client
  const cfg = new Map<string, unknown>(rows.map(r => [r.key as string, r.value]));

  // updatedAt = most recent updated_at timestamp across all config rows
  const updatedAt = rows.reduce<string>((latest, r) => {
    const ts = r.updated_at as string;
    return ts > latest ? ts : latest;
  }, new Date(0).toISOString());

  const get = <T>(key: string, fallback: T): T => {
    const val = cfg.get(key);
    return val !== undefined ? (val as T) : fallback;
  };

  return {
    schemaVersion:    String(get('schema_version', '1')),
    configVersion:    String(get('config_version', '1.0.0')),
    datasetVersion:   String(get('dataset_version', '0.0.0')),
    syncEnabled:      Boolean(get('sync_enabled', true)),
    maintenanceMode:  Boolean(get('maintenance_mode', false)),
    maintenanceMessage: get<string | null>('maintenance_message', null),
    appDisabled:      Boolean(get('app_disabled', false)),
    disabledMessage:  get<string | null>('disabled_message', null),
    minSupportedVersion: String(get('min_supported_version', '0.1.0')),
    paymentMode:      get<PaymentMode>('payment_mode', 'disabled'),
    syncInterval:     Number(get('sync_interval', 3600)),
    updatedAt,
    locationEnabled:                    Boolean(get('location_enabled', false)),
    currentAltitudeFromLocationEnabled: Boolean(get('current_altitude_from_location_enabled', false)),
    ascentTrackingEnabled:              Boolean(get('ascent_tracking_enabled', false)),
    sendLocationDataEnabled:            Boolean(get('send_location_data_enabled', false)),
  };
}
