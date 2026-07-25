"use client";

import { useCallback, useState } from "react";
import type { LicenceCheckResult } from "~~/services/licence-check/types";
import { privyFetch } from "~~/services/privy/client";

type LicenceCheckState = {
  result: LicenceCheckResult | null;
  isChecking: boolean;
  error: string | null;
};

export const useLicenceCheck = () => {
  const [state, setState] = useState<LicenceCheckState>({
    result: null,
    isChecking: false,
    error: null,
  });

  const checkLicence = useCallback(async (adviserName: string, options?: { forceRefresh?: boolean }) => {
    setState(current => ({
      ...current,
      isChecking: true,
      error: null,
    }));

    try {
      const response = await privyFetch("/api/licence-check", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          adviserName,
          forceRefresh: options?.forceRefresh ?? false,
        }),
      });

      const payload = (await response.json()) as LicenceCheckResult | { error?: string };

      if (!response.ok && "error" in payload) {
        throw new Error(payload.error ?? "Licence check failed");
      }

      const result = payload as LicenceCheckResult;
      setState({
        result,
        isChecking: false,
        error: null,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Licence check failed";
      setState(current => ({
        ...current,
        isChecking: false,
        error: message,
      }));

      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      result: null,
      isChecking: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    checkLicence,
    reset,
  };
};
