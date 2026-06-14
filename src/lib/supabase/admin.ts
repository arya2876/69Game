import { createClient } from "@supabase/supabase-js";

// Admin client with service_role key — bypasses RLS
// ONLY use in Edge Functions and server-side API routes
// NEVER expose to the browser
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
