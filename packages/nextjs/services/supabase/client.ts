import type { Database } from "./types";
import { createClient } from "@supabase/supabase-js";

/**
 * Browser client using the anon key. RLS denies `anon`/`authenticated` on every table
 * by default (see supabase/schema.sql) — this client can't read or write anything
 * until a policy explicitly opens it up. Until then, use a Next.js server route with
 * `supabaseAdmin` (./server.ts) for any data the frontend needs.
 */
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
