"use client";

import { useEffect, useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { enabledChains, wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="relative flex flex-col flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const AppProviders = ({ children, withPrivy }: { children: React.ReactNode; withPrivy: boolean }) => {
  const WalletProvider = withPrivy ? PrivyWagmiProvider : WagmiProvider;

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider config={wagmiConfig}>
        <ProgressBar height="3px" color="#2299dd" />
        <ScaffoldEthApp>{children}</ScaffoldEthApp>
      </WalletProvider>
    </QueryClientProvider>
  );
};

/**
 * Auth + wallets for the whole app (docs/INTEGRATIONS.md § 4). Email/SMS login only —
 * no "connect wallet" picker — with a Privy-managed embedded wallet created silently
 * on first login. The migrant must never see "wallet", "seed phrase", or "gas"; this
 * file is the one place that config lives, so keep it that way.
 */
export const Providers = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!privyAppId) {
    return <AppProviders withPrivy={false}>{children}</AppProviders>;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "sms"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: enabledChains[0],
        supportedChains: [...enabledChains],
        appearance: {
          theme: mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light",
          accentColor: "#2299dd",
        },
      }}
    >
      <AppProviders withPrivy>{children}</AppProviders>
    </PrivyProvider>
  );
};
