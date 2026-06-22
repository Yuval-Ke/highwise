import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Session-aware Supabase client for Server Components and Route Handlers.
 * Reads auth cookies from the incoming request.
 * Token refresh (setAll) is intentionally omitted here — middleware handles it.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    }
  );
}

/**
 * Session client that can also write cookies.
 * Required in Server Actions and Route Handlers that trigger token refresh (e.g. login/logout).
 */
export async function createActionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}
