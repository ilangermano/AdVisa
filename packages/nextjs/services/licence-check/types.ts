export type LicenceCheckStatus = "licensed" | "not_licensed" | "unknown";

export type LicenceCheckSource = "supabase_cache" | "iaa_register" | "demo_fallback" | "unavailable";

export type LicenceCheckResult = {
  status: LicenceCheckStatus;
  licenceType: string | null;
  checkedAt: string;
  adviserName: string | null;
  licenceRef: `0x${string}` | null;
  canProceed: boolean;
  source: LicenceCheckSource;
};
