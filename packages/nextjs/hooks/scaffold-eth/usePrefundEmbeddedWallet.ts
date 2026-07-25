"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

type WalletSetupStatus = "idle" | "checking" | "ready" | "error";

/**
 * The migrant must never see "insufficient funds for gas" (docs/INTEGRATIONS.md § 4).
 * The moment a Privy embedded wallet is connected, ask the server-held relayer to top
 * it up with a small amount of testnet native currency. The server rate-limits the
 * address, re-checks the on-chain balance, and no-ops if it is already sufficient.
 * The returned status keeps the control in an explicit
 * "account ready" state instead of silently failing with an opaque gas error later.
 */
export const usePrefundEmbeddedWallet = () => {
  const { wallets } = useWallets();
  const { address, chainId } = useAccount();
  const requestedFor = useRef<string | null>(null);
  const [status, setStatus] = useState<WalletSetupStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const isEmbeddedWallet = useMemo(
    () =>
      Boolean(
        address &&
        wallets.some(
          wallet => wallet.walletClientType === "privy" && wallet.address.toLowerCase() === address.toLowerCase(),
        ),
      ),
    [address, wallets],
  );

  useEffect(() => {
    if (!address || !chainId || !isEmbeddedWallet) {
      setStatus("idle");
      setError(null);
      return;
    }

    const key = `${address}-${chainId}`;
    if (requestedFor.current === key) return;
    requestedFor.current = key;
    setStatus("checking");
    setError(null);

    fetch("/api/wallet/prefund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, chainId }),
    })
      .then(async response => {
        if (response.ok) {
          setStatus("ready");
          return;
        }

        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Could not prepare testnet gas");
      })
      .catch(cause => {
        requestedFor.current = null;
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "Could not prepare testnet gas");
      });
  }, [address, chainId, isEmbeddedWallet, retryNonce]);

  return {
    isEmbeddedWallet,
    status,
    error,
    retry: () => setRetryNonce(value => value + 1),
  };
};
