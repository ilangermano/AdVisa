import type { Database } from "./types";
import { createClient } from "@supabase/supabase-js";
import "server-only";

/**
 * Service-role client — bypasses RLS entirely. Every Supabase read/write the frontend
 * needs goes through a Next.js route handler using this client, never directly from a
 * client component; importing this file from client code fails the build.
 */
let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  supabaseAdmin ??= createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdmin;
}
