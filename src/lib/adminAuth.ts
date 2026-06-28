import { createServerSupabaseClient } from './supabase/server';
import type { AdminRole } from '@/types/backend';

export interface AdminIdentity {
  userId: string;
  email: string;
  role: AdminRole;
}

/**
 * Looks up the admin_users row for the given Supabase auth user ID.
 * Returns null if the user is not an active admin.
 * Uses the service_role client to bypass RLS.
 */
export async function lookupAdminUser(userId: string): Promise<AdminIdentity | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('id, role, is_active, email:id')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;

  // Fetch email from auth.users via admin API
  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  const email = authData?.user?.email ?? '';

  return {
    userId,
    email,
    role: data.role as AdminRole,
  };
}

/**
 * Returns the admin identity if the user has at least the `admin` role,
 * or null if they are not authorized.
 */
export async function requireAdmin(userId: string): Promise<AdminIdentity | null> {
  const identity = await lookupAdminUser(userId);
  if (!identity || (identity.role !== 'admin' && identity.role !== 'owner')) return null;
  return identity;
}

/**
 * Returns the admin identity if the user has the `owner` role,
 * or null if they do not.
 */
export async function requireOwner(userId: string): Promise<AdminIdentity | null> {
  const identity = await lookupAdminUser(userId);
  if (!identity || identity.role !== 'owner') return null;
  return identity;
}
