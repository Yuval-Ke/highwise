-- HighWise v0.3 — Migration 010
-- Seed: initial app_config rows and Nepal as the first country.
-- All location Remote Config flags are false in v0.3.
-- Values use jsonb literals: strings are double-quoted, booleans/numbers are unquoted.

insert into public.app_config (key, value, description, is_sensitive) values
  -- Schema / versioning
  ('schema_version',    '"1"'::jsonb,
   'Config schema version; increment when shape of PublicAppConfig changes.', false),

  ('config_version',    '"1.0.0"'::jsonb,
   'Config document version; increment on every change so clients know to refresh.', false),

  ('dataset_version',   '"0.0.0"'::jsonb,
   'Version of the currently published dataset snapshot.', false),

  -- Sync
  ('sync_enabled',      'true'::jsonb,
   'Whether dataset sync is enabled app-wide.', false),

  ('sync_interval',     '3600'::jsonb,
   'Dataset sync check interval in seconds.', false),

  -- Maintenance (non-blocking)
  ('maintenance_mode',    'false'::jsonb,
   'Show a maintenance banner to users; does not block app use.', false),

  ('maintenance_message', 'null'::jsonb,
   'Text of the maintenance banner; null when maintenance_mode is false.', false),

  -- App disable (blocking — owner only)
  ('app_disabled',      'false'::jsonb,
   'Hard-blocks the entire app when true. Only the Owner role may change this.', true),

  ('disabled_message',  'null'::jsonb,
   'Optional override for the disabled screen message; null uses the built-in Hebrew default.', true),

  -- Version gate (owner only)
  ('min_supported_version', '"0.1.0"'::jsonb,
   'Minimum app version that may run. Enforced only when a fresh config was received.', true),

  -- Payment (future use — disabled in v0.3)
  ('payment_mode',      '"disabled"'::jsonb,
   'Payment mode: disabled | trial | premium. Disabled in v0.3.', true),

  -- Location feature flags (all false in v0.3 — owner only for send_location_data)
  ('location_enabled',  'false'::jsonb,
   'Master switch for all device location features.', false),

  ('current_altitude_from_location_enabled', 'false'::jsonb,
   'Allow the app to read device GPS altitude for the current-altitude field.', false),

  ('ascent_tracking_enabled', 'false'::jsonb,
   'Enable continuous ascent rate tracking in the background.', false),

  ('send_location_data_enabled', 'false'::jsonb,
   'Send raw device location data to the server when tracking is active.', true)
;

-- Nepal: the only country shown to public users in v0.3.
insert into public.countries (country_code, name_en, name_he, is_active, sort_order)
values ('nepal', 'Nepal', 'נפאל', true, 1);
