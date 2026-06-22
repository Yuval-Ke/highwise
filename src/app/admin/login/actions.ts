'use server';

import { redirect } from 'next/navigation';
import { createActionClient } from '@/lib/supabase/serverSession';

type LoginState = { error?: string } | undefined;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email    = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createActionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Invalid credentials. Make sure you have admin access.' };
  }

  redirect('/admin/dataset');
}

export async function logoutAction() {
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
