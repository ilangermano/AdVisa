"use client";

import { createContext, useContext } from "react";
import { usePrefundEmbeddedWallet } from "~~/hooks/scaffold-eth/usePrefundEmbeddedWallet";

type PrivyWalletSetup = ReturnType<typeof usePrefundEmbeddedWallet>;

const PrivyWalletSetupContext = createContext<PrivyWalletSetup>({
  isEmbeddedWallet: false,
  status: "ready",
  error: null,
  retry: () => undefined,
});

export const PrivyWalletSetupProvider = ({ children }: { children: React.ReactNode }) => {
  const walletSetup = usePrefundEmbeddedWallet();
  return <PrivyWalletSetupContext.Provider value={walletSetup}>{children}</PrivyWalletSetupContext.Provider>;
};

export const usePrivyWalletSetup = () => useContext(PrivyWalletSetupContext);
