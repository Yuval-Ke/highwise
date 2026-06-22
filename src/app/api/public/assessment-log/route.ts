import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { LogPayload } from '@/lib/assessmentLogger';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as LogPayload;

    if (
      typeof body.installId !== 'string' || !body.installId ||
      typeof body.sessionId !== 'string' || !body.sessionId ||
      typeof body.appVersion !== 'string' || !body.appVersion
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { error } = await supabase.from('assessment_logs').insert({
      install_id:          body.installId,
      session_id:          body.sessionId,
      created_at:          body.createdAt,
      completed_at:        body.completedAt,
      flow_completed:      body.flowCompleted,
      abandonment_step:    body.abandonmentStep,
      app_version:         body.appVersion,
      dataset_version:     body.datasetVersion,
      config_version:      body.configVersion,
      interface_language:  body.interfaceLanguage,
      dataset_source:      body.datasetSource,
      was_offline:         body.wasOffline,
      device_category:     body.deviceCategory,
      browser:             body.browser,
      os:                  body.os,
      country_id:          body.countryId,
      trek_id:             body.trekId,
      location_id:         body.locationId,
      altitude_source:     body.altitudeSource,
      village_lookup_used: body.villageLookupUsed,
      altitude_current_m:      body.altitudeCurrentM,
      altitude_planned_m:      body.altitudePlannedM,
      altitude_last_night_m:   body.altitudeLastNightM,
      altitude_2_nights_ago_m: body.altitude2NightsAgoM,
      altitude_3_nights_ago_m: body.altitude3NightsAgoM,
      lls_score:         body.llsScore,
      lls_severity:      body.llsSeverity,
      symptom_headache:  body.symptomHeadache,
      symptom_fatigue:   body.symptomFatigue,
      symptom_dizziness: body.symptomDizziness,
      symptom_gi:        body.symptomGi,
      red_flags:         body.redFlags,
      respiratory_illness: body.respiratoryIllness,
      risk_result:       body.riskResult,
      screen_times_json: body.screenTimesJson,
      // Location-ready — all null in v0.3
      location_permission_status:      body.locationPermissionStatus,
      location_used:                   body.locationUsed,
      location_source:                 body.locationSource,
      device_altitude_meters:          body.deviceAltitudeMeters,
      device_altitude_accuracy_meters: body.deviceAltitudeAccuracyMeters,
      device_latitude:                 body.deviceLatitude,
      device_longitude:                body.deviceLongitude,
      device_location_accuracy_meters: body.deviceLocationAccuracyMeters,
      device_location_timestamp:       body.deviceLocationTimestamp,
      ascent_tracking_enabled:         body.ascentTrackingEnabled,
      ascent_rate_estimated:           body.ascentRateEstimated,
      ascent_profile_summary:          body.ascentProfileSummary,
    });

    if (error) {
      // Unique violation on session_id → already stored, treat as success
      if (error.code === '23505') {
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
