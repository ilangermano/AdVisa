export function isAdvisaDemoMode(requiredEnvKeys: string[] = []) {
  if (process.env.ADVISA_DEMO_MODE === "true") return true;
  if (process.env.NODE_ENV === "production") return false;

  return requiredEnvKeys.some(key => !process.env[key]);
}
