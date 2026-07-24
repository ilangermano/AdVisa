import { createClient } from "@supabase/supabase-js";
import type { LicenceCheckResult, LicenceCheckStatus } from "~~/services/licence-check/types";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type AdviserLicenceCacheRow = {
  licence_ref: string;
  name: string;
  status: LicenceCheckStatus;
  checked_at: string;
};

const formatSupabaseError = (error: { code?: string; message?: string; details?: string; hint?: string }) => ({
  code: error.code,
  message: error.message,
  details: error.details,
  hint: error.hint,
});

const getSearchTerms = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map(term => term.replace(/[^a-z0-9-]/gi, ""))
    .filter(term => term.length >= 2);

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
};

export const getFreshCachedLicenceCheck = async (name: string): Promise<LicenceCheckResult | null> => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const searchTerms = getSearchTerms(name);
  let query = supabase.from("adviser_licence_cache").select("licence_ref,name,status,checked_at");

  for (const term of searchTerms) {
    query = query.ilike("name", `%${term}%`);
  }

  const { data, error } = await query.order("checked_at", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    console.error("adviser_licence_cache read failed", formatSupabaseError(error));
    return null;
  }

  const row = data as AdviserLicenceCacheRow | null;
  if (!row) return null;

  const checkedAtMs = new Date(row.checked_at).getTime();
  if (!Number.isFinite(checkedAtMs) || Date.now() - checkedAtMs > CACHE_MAX_AGE_MS) {
    return null;
  }

  const licenceRef =
    row.status === "licensed" && row.licence_ref.startsWith("0x") ? (row.licence_ref as `0x${string}`) : null;

  return {
    status: row.status,
    licenceType: null,
    checkedAt: row.checked_at,
    adviserName: row.name,
    licenceRef,
    canProceed: row.status === "licensed",
    source: "supabase_cache",
  };
};

export const cacheLicenceCheck = async (row: AdviserLicenceCacheRow) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("adviser_licence_cache").upsert(row, {
    onConflict: "licence_ref",
  });

  if (error) {
    console.error("adviser_licence_cache upsert failed", formatSupabaseError(error));
  }
};
