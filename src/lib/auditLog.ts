import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AuditActionType } from '@/types/backend';

/**
 * Writes one row to audit_logs using the service-role client (writes bypass RLS;
 * audit_logs has no insert policy, so service-role is the only writer).
 *
 * Fire-and-forget: never throws. An audit failure must not break the underlying
 * action — matches the console.error convention in admin server actions.
 */
export async function writeAuditLog(params: {
  performedBy: string;            // admin_users.id (= auth user id)
  actionType: AuditActionType;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  notes?: string;
}): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('audit_logs').insert({
      performed_by: params.performedBy,
      action_type:  params.actionType,
      entity_type:  params.entityType ?? null,
      entity_id:    params.entityId ?? null,
      old_value:    params.oldValue ?? null,
      new_value:    params.newValue ?? null,
      notes:        params.notes ?? null,
      // performed_at: DB default now()
    });
    if (error) console.error('[writeAuditLog]', error.message);
  } catch (err) {
    console.error('[writeAuditLog]', err);
  }
}
