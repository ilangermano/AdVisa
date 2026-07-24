"use client";

import { useEffect, useRef } from "react";
import { useWallets } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

/**
 * The migrant must never see "insufficient funds for gas" (docs/INTEGRATIONS.md § 4).
 * The moment a Privy embedded wallet is connected, ask the server-held relayer to top
 * it up with a small amount of testnet native currency. The server route re-checks the
 * on-chain balance and no-ops if it's already sufficient, so this is safe to fire once
 * per address/chain pair per session.
 */
export const usePrefundEmbeddedWallet = () => {
  const { wallets } = useWallets();
  const { address, chainId } = useAccount();
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!address || !chainId) return;
    const isEmbeddedWallet = wallets.some(
      wallet => wallet.walletClientType === "privy" && wallet.address.toLowerCase() === address.toLowerCase(),
    );
    if (!isEmbeddedWallet) return;

    const key = `${address}-${chainId}`;
    if (requestedFor.current === key) return;
    requestedFor.current = key;

    fetch("/api/wallet/prefund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, chainId }),
    }).catch(() => {
      // Best-effort — a failed top-up must never block sign-in. Worst case the
      // migrant's first transaction fails and this fires again on next mount.
      requestedFor.current = null;
    });
  }, [address, chainId, wallets]);
};
