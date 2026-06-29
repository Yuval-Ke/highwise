'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireOwner } from '@/lib/adminAuth';
import { writeAuditLog } from '@/lib/auditLog';

async function getAuthOwner() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  return requireOwner(user.id);
}

/** Bulk soft-delete assessment logs by id. Owner only. */
export async function softDeleteLogs(formData: FormData): Promise<void> {
  const owner = await getAuthOwner();
  if (!owner) { console.error('[softDeleteLogs] unauthorized'); return; }

  const ids = formData.getAll('ids').map(String).filter(Boolean);
  if (ids.length === 0) return;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('assessment_logs')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);
  if (error) { console.error('[softDeleteLogs]', error.message); return; }

  await writeAuditLog({
    performedBy: owner.userId,
    actionType: 'soft_delete',
    entityType: 'assessment_log',
    notes: `${ids.length} logs`,
    newValue: { ids },
  });

  revalidatePath('/admin/logs');
}
