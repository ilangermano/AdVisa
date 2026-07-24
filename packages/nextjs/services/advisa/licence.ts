import { getSupabaseAdmin } from "~~/services/supabase/server";
import type { AdviserLicenceStatus } from "~~/services/supabase/types";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type LicenceCheckResult = {
  licensed: boolean;
  status: AdviserLicenceStatus;
  checkedAt: string;
};

/**
 * Track 2 owns the live IAA lookup. Until that helper lands in this branch, this
 * function is the single integration point for milestone release/refund actions:
 * it requires a fresh Supabase cache row and never stores status on-chain.
 */
export async function recheckAdviserLicenceForEngagement(contractEngagementId: bigint): Promise<LicenceCheckResult> {
  const db = getSupabaseAdmin() as any;

  const { data: engagement, error: engagementError } = await db
    .from("engagements")
    .select("adviser_licence_ref")
    .eq("contract_engagement_id", Number(contractEngagementId))
    .maybeSingle();

  if (engagementError) {
    throw new Error(`Could not read engagement licence ref: ${engagementError.message}`);
  }
  if (!engagement?.adviser_licence_ref) {
    throw new Error("Engagement is missing adviser_licence_ref for licence re-check");
  }

  const { data: cached, error: cacheError } = await db
    .from("adviser_licence_cache")
    .select("status, checked_at")
    .eq("licence_ref", engagement.adviser_licence_ref)
    .maybeSingle();

  if (cacheError) {
    throw new Error(`Could not read adviser licence cache: ${cacheError.message}`);
  }
  if (!cached) {
    throw new Error("No adviser licence cache row found; cannot safely release funds");
  }

  const checkedAtMs = Date.parse(cached.checked_at);
  if (!Number.isFinite(checkedAtMs) || Date.now() - checkedAtMs > CACHE_MAX_AGE_MS) {
    throw new Error("Adviser licence cache is stale; run the live IAA check first");
  }

  return {
    licensed: cached.status === "licensed",
    status: cached.status,
    checkedAt: cached.checked_at,
  };
}
