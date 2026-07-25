import { isAdvisaDemoMode } from "~~/services/advisa/demoMode";
import { checkIaaLicenceLive, getNegativeLookupRef } from "~~/services/licence-check/iaa";
import { cacheLicenceCheck } from "~~/services/licence-check/supabase";
import { getSupabaseAdmin } from "~~/services/supabase/server";
import type { AdviserLicenceStatus } from "~~/services/supabase/types";

export type LicenceCheckResult = {
  licensed: boolean;
  status: AdviserLicenceStatus;
  checkedAt: string;
  source: string;
};

/**
 * Re-checks the adviser's IAA status before any relayer-controlled money movement.
 * Status stays off-chain: Supabase stores the latest result and the contract receives
 * only the original licence hash.
 */
export async function recheckAdviserLicenceForEngagement(contractEngagementId: bigint): Promise<LicenceCheckResult> {
  if (isAdvisaDemoMode(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) {
    return {
      licensed: true,
      status: "licensed",
      checkedAt: new Date().toISOString(),
      source: "demo_mode",
    };
  }

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
    .select("name")
    .eq("licence_ref", engagement.adviser_licence_ref)
    .maybeSingle();

  if (cacheError) {
    throw new Error(`Could not read adviser licence cache: ${cacheError.message}`);
  }
  if (!cached?.name) {
    throw new Error("No adviser name found in licence cache; cannot run live IAA re-check");
  }

  const live = await checkIaaLicenceLive(cached.name);
  await cacheLicenceCheck({
    licence_ref: live.licenceRef ?? getNegativeLookupRef(cached.name),
    name: live.adviserName ?? cached.name,
    status: live.status,
    checked_at: live.checkedAt,
  });

  return {
    licensed: live.status === "licensed",
    status: live.status,
    checkedAt: live.checkedAt,
    source: live.source,
  };
}
