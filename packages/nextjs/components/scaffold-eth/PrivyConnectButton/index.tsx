"use client";

// @refresh reset
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { usePrivy } from "@privy-io/react-auth";
import { Balance } from "@scaffold-ui/components";
import { getBlockExplorerAddressLink } from "@scaffold-ui/hooks";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { usePrivyWalletSetup } from "~~/contexts/PrivyWalletSetupContext";
import { useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

/**
 * Sign-in entry point for the whole app — email/Google/SMS via Privy, embedded wallet
 * created silently on first login. Never says "wallet", "seed phrase", or "gas"
 * (docs/INTEGRATIONS.md § 4); the words below are the entire public-facing surface.
 */
export const PrivyConnectButton = () => {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim()) {
    return (
      <button className="btn btn-primary btn-sm" disabled>
        Sign in
      </button>
    );
  }

  return <ConnectedPrivyButton />;
};

const ConnectedPrivyButton = () => {
  const { ready, authenticated, login } = usePrivy();
  const { address, chain } = useAccount();
  const networkColor = useNetworkColor();
  const { targetNetwork } = useTargetNetwork();
  const walletSetup = usePrivyWalletSetup();

  if (!ready) {
    return (
      <button className="btn btn-primary btn-sm" disabled>
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button className="btn btn-primary btn-sm" onClick={login} type="button">
        Sign in
      </button>
    );
  }

  // Authenticated with Privy, but the embedded wallet hasn't finished connecting to
  // wagmi yet — a brief moment right after first login.
  if (!address || !chain) {
    return (
      <button className="btn btn-primary btn-sm" disabled>
        Setting up your account...
      </button>
    );
  }

  if (walletSetup.isEmbeddedWallet && walletSetup.status !== "ready") {
    if (walletSetup.status === "error") {
      return (
        <button
          className="btn btn-warning btn-sm"
          onClick={walletSetup.retry}
          title={walletSetup.error ?? undefined}
          type="button"
        >
          Retry account setup
        </button>
      );
    }

    return (
      <button className="btn btn-primary btn-sm" disabled>
        <span className="loading loading-spinner loading-xs" />
        Preparing your account...
      </button>
    );
  }

  if (chain.id !== targetNetwork.id) {
    return <WrongNetworkDropdown />;
  }

  const blockExplorerAddressLink = getBlockExplorerAddressLink(targetNetwork, address);

  return (
    <>
      <div className="flex flex-col items-center mr-2">
        <Balance
          address={address as Address}
          style={{
            minHeight: "0",
            height: "auto",
            fontSize: "0.8em",
          }}
        />
        <span className="text-xs" style={{ color: networkColor }}>
          {chain.name}
        </span>
      </div>
      <AddressInfoDropdown address={address as Address} blockExplorerAddressLink={blockExplorerAddressLink} />
      <AddressQRCodeModal address={address as Address} modalId="qrcode-modal" />
    </>
  );
};
