import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logoutAction } from '../login/actions';
import ImportClient from './ImportClient';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/admin/login');

  const adminUser = await requireAdmin(user.id);
  if (!adminUser) redirect('/admin/login?error=unauthorized');

  // ── Load active country codes for client-side validation ──────────────────
  const supabase = createServerSupabaseClient();
  const { data: countries } = await supabase
    .from('countries')
    .select('country_code')
    .eq('is_active', true);

  const countryCodes = (countries ?? []).map((c: { country_code: string }) => c.country_code);

  return (
    <ImportClient
      countryCodes={countryCodes}
      adminEmail={adminUser.email}
      adminRole={adminUser.role}
      logoutAction={logoutAction}
    />
  );
}
