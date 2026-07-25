"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { waitForCallsStatus } from "@wagmi/core";
import { Hex, encodeFunctionData, keccak256, parseEventLogs, parseUnits, toHex } from "viem";
import { useAccount, useCapabilities, usePublicClient, useSendCalls, useSignMessage } from "wagmi";
import { type Advisor, getMilestones } from "~~/components/advisa/advisors";
import { usePrivyWalletSetup } from "~~/contexts/PrivyWalletSetupContext";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
} from "~~/hooks/scaffold-eth";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { AllowedChainIds } from "~~/utils/scaffold-eth";

const DAY_SECONDS = 24 * 60 * 60;

const getEngagementField = <T>(engagement: unknown, index: number) =>
  Array.isArray(engagement) ? (engagement[index] as T) : undefined;

export const useOnchainAdvisaFlow = (advisor: Advisor) => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const chainId = targetNetwork.id as AllowedChainIds;
  const publicClient = usePublicClient({ chainId });
  const walletSetup = usePrivyWalletSetup();
  const { signMessageAsync } = useSignMessage();
  const { data: capabilities } = useCapabilities({ account: address });
  const { sendCallsAsync } = useSendCalls();
  const [engagementId, setEngagementId] = useState<bigint>();
  const [anchorTxHash, setAnchorTxHash] = useState<Hex>();
  const [paymentTxHash, setPaymentTxHash] = useState<Hex>();
  const [paymentStatus, setPaymentStatus] = useState("Ready to fund");
  const fundingInFlight = useRef(false);

  const { data: escrowContract } = useDeployedContractInfo({ contractName: "VisaEscrow", chainId });
  const { data: tokenContract } = useDeployedContractInfo({ contractName: "MockNZDD", chainId });
  const escrowWrite = useScaffoldWriteContract({ contractName: "VisaEscrow", chainId });
  const tokenWrite = useScaffoldWriteContract({ contractName: "MockNZDD", chainId });
  const milestones = getMilestones(advisor);
  const agreement = useMemo(
    () => ({
      version: 2,
      adviserId: advisor.id,
      adviserName: advisor.name,
      adviserAddress: advisor.walletAddress,
      licenceRef: advisor.licenceRef,
      service: advisor.agreement.visaType,
      currency: "NZD",
      totalFee: advisor.fee,
      milestones: [
        { name: "Consultation and document review", amount: milestones.consultation, dueInDays: 7 },
        { name: "Application lodged with INZ", amount: milestones.filing, dueInDays: 30 },
        { name: "INZ outcome letter uploaded", amount: milestones.decision, dueInDays: advisor.agreement.validityDays },
      ],
    }),
    [
      advisor.agreement.validityDays,
      advisor.agreement.visaType,
      advisor.fee,
      advisor.id,
      advisor.licenceRef,
      advisor.name,
      advisor.walletAddress,
      milestones.consultation,
      milestones.decision,
      milestones.filing,
    ],
  );
  const agreementHash = useMemo(() => keccak256(toHex(JSON.stringify(agreement))), [agreement]);
  const licenceHash = useMemo(() => keccak256(toHex(advisor.licenceRef)), [advisor.licenceRef]);
  const legacyEngagementStorageKey = `advisa-engagement-${advisor.id}`;
  const engagementStorageKey = address
    ? `advisa-engagement-${chainId}-${address.toLowerCase()}-${advisor.id}`
    : undefined;

  const { data: engagement, refetch: refetchEngagement } = useScaffoldReadContract({
    contractName: "VisaEscrow",
    functionName: "engagements",
    args: [engagementId],
    chainId,
    query: { enabled: engagementId !== undefined },
  });
  const { data: tokenDecimals } = useScaffoldReadContract({
    contractName: "MockNZDD",
    functionName: "decimals",
    chainId,
  });
  const { refetch: refetchBalance } = useScaffoldReadContract({
    contractName: "MockNZDD",
    functionName: "balanceOf",
    args: [address],
    chainId,
    query: { enabled: Boolean(address) },
  });
  const { refetch: refetchAllowance } = useScaffoldReadContract({
    contractName: "MockNZDD",
    functionName: "allowance",
    args: [address, escrowContract?.address],
    chainId,
    query: { enabled: Boolean(address && escrowContract?.address) },
  });

  const totalAmount = getEngagementField<bigint>(engagement, 4);
  const engagementState = getEngagementField<number>(engagement, 8);

  useEffect(() => {
    if (!engagementStorageKey) {
      setEngagementId(undefined);
      return;
    }

    const storedId =
      window.localStorage.getItem(engagementStorageKey) ?? window.localStorage.getItem(legacyEngagementStorageKey);
    setEngagementId(storedId && /^\d+$/.test(storedId) ? BigInt(storedId) : undefined);
  }, [engagementStorageKey, legacyEngagementStorageKey]);

  const requireReadyWallet = () => {
    if (!address || !publicClient || !escrowContract || !tokenContract || tokenDecimals === undefined) {
      throw new Error("Your secure account is still getting ready");
    }
    if (walletSetup.isEmbeddedWallet && walletSetup.status !== "ready") {
      throw new Error(walletSetup.error || "Your testnet account is still being prepared");
    }
    return { address, publicClient, escrowContract, tokenContract, tokenDecimals };
  };

  const signAgreement = async () => {
    const ready = requireReadyWallet();
    let id = engagementId;
    const milestoneAmounts = agreement.milestones.map(milestone =>
      parseUnits(String(milestone.amount), ready.tokenDecimals),
    );
    const expectedTotal = milestoneAmounts.reduce((total, amount) => total + amount, 0n);
    const currentStorageKey =
      engagementStorageKey ?? `advisa-engagement-${chainId}-${ready.address.toLowerCase()}-${advisor.id}`;

    if (id !== undefined) {
      const storedEngagement = await ready.publicClient.readContract({
        address: ready.escrowContract.address,
        abi: ready.escrowContract.abi,
        functionName: "engagements",
        args: [id],
      });
      const storedMigrant = getEngagementField<string>(storedEngagement, 0);
      const storedAdviser = getEngagementField<string>(storedEngagement, 1);
      const storedLicenceHash = getEngagementField<Hex>(storedEngagement, 2);
      const storedAgreementHash = getEngagementField<Hex>(storedEngagement, 3);
      const storedTotal = getEngagementField<bigint>(storedEngagement, 4);
      const storedState = Number(getEngagementField<number | bigint>(storedEngagement, 8) ?? 0);
      const termsMatch =
        storedMigrant?.toLowerCase() === ready.address.toLowerCase() &&
        storedAdviser?.toLowerCase() === advisor.walletAddress.toLowerCase() &&
        storedLicenceHash?.toLowerCase() === licenceHash.toLowerCase() &&
        storedTotal === expectedTotal;
      const anchoredHashMatches = storedAgreementHash?.toLowerCase() === agreementHash.toLowerCase();

      if (!termsMatch || (storedState !== 0 && !anchoredHashMatches)) {
        id = undefined;
        setEngagementId(undefined);
        setAnchorTxHash(undefined);
        setPaymentTxHash(undefined);
        setPaymentStatus("Ready to fund");
        window.localStorage.removeItem(currentStorageKey);
        window.localStorage.removeItem(legacyEngagementStorageKey);
      } else if (storedState === 1 && anchoredHashMatches) {
        window.localStorage.setItem(currentStorageKey, id.toString());
        window.localStorage.removeItem(legacyEngagementStorageKey);
        await refetchEngagement();
        return { engagementId: id, txHash: undefined };
      } else if (storedState > 1) {
        id = undefined;
        setEngagementId(undefined);
        setAnchorTxHash(undefined);
        setPaymentTxHash(undefined);
        setPaymentStatus("Ready to fund");
        window.localStorage.removeItem(currentStorageKey);
        window.localStorage.removeItem(legacyEngagementStorageKey);
      }
    }

    if (id === undefined) {
      const now = Math.floor(Date.now() / 1000);
      const createTxHash = await escrowWrite.writeContractAsync({
        functionName: "createEngagement",
        args: [
          advisor.walletAddress,
          licenceHash,
          milestoneAmounts,
          agreement.milestones.map(milestone => BigInt(now + milestone.dueInDays * DAY_SECONDS)),
        ],
      });
      if (!createTxHash) throw new Error("The engagement transaction was not submitted");

      const receipt = await ready.publicClient.waitForTransactionReceipt({ hash: createTxHash });
      const logs = parseEventLogs({
        abi: ready.escrowContract.abi,
        eventName: "EngagementCreated",
        logs: receipt.logs,
      });
      const created = logs[0] as { args?: { id?: bigint } } | undefined;
      if (created?.args?.id === undefined) {
        throw new Error("Could not read the engagement ID from the blockchain");
      }

      id = created.args.id;
      setEngagementId(id);
      window.localStorage.setItem(currentStorageKey, id.toString());
      window.localStorage.removeItem(legacyEngagementStorageKey);
    }

    const message = `AdVisa agreement ${agreementHash} for engagement #${id.toString()} on chain ${chainId}`;
    const signature = await signMessageAsync({ message });
    const response = await fetch("/api/agreements/anchor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address: ready.address,
        chainId,
        engagementId: id.toString(),
        agreementHash,
        signature,
      }),
    });
    const result = (await response.json()) as { error?: string; txHash?: Hex };
    if (!response.ok) throw new Error(result.error || "Could not anchor the signed agreement");

    if (result.txHash) setAnchorTxHash(result.txHash);
    await refetchEngagement();
    return { engagementId: id, txHash: result.txHash };
  };

  const fundEscrow = async () => {
    if (fundingInFlight.current) {
      throw new Error("Escrow funding is already in progress");
    }
    fundingInFlight.current = true;

    try {
      const ready = requireReadyWallet();
      const latest = await refetchEngagement();
      const latestEngagement = latest.data ?? engagement;
      const latestTotal = getEngagementField<bigint>(latestEngagement, 4) ?? totalAmount;
      const latestState = getEngagementField<number>(latestEngagement, 8) ?? engagementState;

      if (engagementId === undefined || latestTotal === undefined) {
        throw new Error("Sign the fee agreement before funding escrow");
      }
      if (latestState !== 1) {
        throw new Error(latestState === 0 ? "The agreement is not anchored yet" : "This escrow is already funded");
      }

      const [currentBalance, currentAllowance] = await Promise.all([
        ready.publicClient.readContract({
          address: ready.tokenContract.address,
          abi: ready.tokenContract.abi,
          functionName: "balanceOf",
          args: [ready.address],
        }) as Promise<bigint>,
        ready.publicClient.readContract({
          address: ready.tokenContract.address,
          abi: ready.tokenContract.abi,
          functionName: "allowance",
          args: [ready.address, ready.escrowContract.address],
        }) as Promise<bigint>,
      ]);
      const needsMint = currentBalance < latestTotal;
      const needsApproval = currentAllowance < latestTotal;
      const batchCapability = capabilities?.[chainId]?.atomic?.status;
      let txHash: Hex | undefined;

      if (batchCapability === "supported" || batchCapability === "ready") {
        setPaymentStatus("Confirm the protected payment once");
        const calls = [];
        if (needsMint) {
          calls.push({
            to: ready.tokenContract.address,
            data: encodeFunctionData({
              abi: ready.tokenContract.abi,
              functionName: "mint",
              args: [ready.address, latestTotal - currentBalance],
            }),
          });
        }
        if (needsApproval) {
          calls.push({
            to: ready.tokenContract.address,
            data: encodeFunctionData({
              abi: ready.tokenContract.abi,
              functionName: "approve",
              args: [ready.escrowContract.address, latestTotal],
            }),
          });
        }
        calls.push({
          to: ready.escrowContract.address,
          data: encodeFunctionData({
            abi: ready.escrowContract.abi,
            functionName: "fund",
            args: [engagementId],
          }),
        });

        const batch = await sendCallsAsync({ account: ready.address, chainId, calls });
        const callsStatus = await waitForCallsStatus(wagmiConfig, { id: batch.id });
        if (callsStatus.receipts?.some(receipt => receipt.status === "reverted")) {
          throw new Error("A payment transaction reverted before escrow funding completed");
        }
        txHash = callsStatus.receipts?.at(-1)?.transactionHash;
        if (!txHash) {
          throw new Error("The escrow payment was not confirmed");
        }
      } else {
        if (needsMint) {
          setPaymentStatus("Issuing hackathon test dNZD");
          const mintTxHash = await tokenWrite.writeContractAsync({
            functionName: "mint",
            args: [ready.address, latestTotal - currentBalance],
          });
          if (mintTxHash) await ready.publicClient.waitForTransactionReceipt({ hash: mintTxHash });
          await refetchBalance();
        }
        if (needsApproval) {
          setPaymentStatus("Approving the escrow contract");
          const approvalTxHash = await tokenWrite.writeContractAsync({
            functionName: "approve",
            args: [ready.escrowContract.address, latestTotal],
          });
          if (approvalTxHash) await ready.publicClient.waitForTransactionReceipt({ hash: approvalTxHash });
          await refetchAllowance();
        }

        setPaymentStatus("Moving the full amount into escrow");
        txHash = await escrowWrite.writeContractAsync({
          functionName: "fund",
          args: [engagementId],
        });
        if (txHash) await ready.publicClient.waitForTransactionReceipt({ hash: txHash });
      }

      await refetchEngagement();
      if (txHash) setPaymentTxHash(txHash);
      setPaymentStatus("Escrow funded");
      window.localStorage.setItem(
        "advisa-latest-engagement",
        JSON.stringify({ engagementId: engagementId.toString(), advisorId: advisor.id }),
      );
      return txHash;
    } finally {
      fundingInFlight.current = false;
    }
  };

  return {
    address,
    agreementHash,
    anchorTxHash,
    engagementId,
    engagementState,
    escrowAddress: escrowContract?.address,
    fundEscrow,
    paymentStatus,
    paymentTxHash,
    signAgreement,
    tokenAddress: tokenContract?.address,
  };
};
