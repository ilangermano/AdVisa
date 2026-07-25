"use client";

import { useMemo, useRef, useState } from "react";
import { Address, AddressInput } from "@scaffold-ui/components";
import { NextPage } from "next";
import {
  Address as AddressType,
  Hex,
  formatUnits,
  isAddress,
  keccak256,
  parseEventLogs,
  parseUnits,
  toHex,
} from "viem";
import { hardhat } from "viem/chains";
import { useAccount, useBlock, usePublicClient } from "wagmi";
import { usePrivyWalletSetup } from "~~/contexts/PrivyWalletSetupContext";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
} from "~~/hooks/scaffold-eth";
import { privyFetch } from "~~/services/privy/client";
import type { ExtractionResult, Milestone } from "~~/types/advisa";
import { AllowedChainIds, notification } from "~~/utils/scaffold-eth";

const GRACE_PERIOD_SECONDS = 5 * 24 * 60 * 60;

const DEMO_EXTRACTION: ExtractionResult = {
  milestones: [
    {
      name: "Initial assessment",
      description: "Review eligibility and confirm the application plan.",
      amount: 800,
      dueInWorkingDays: 1,
    },
    {
      name: "Application lodged",
      description: "Submit the visa application and provide the lodgement receipt.",
      amount: 2400,
      dueInWorkingDays: 5,
    },
    {
      name: "RFI response submitted",
      description: "Submit requested information to INZ if an RFI is issued.",
      amount: 800,
      dueInWorkingDays: 0,
    },
  ],
  totalFee: 4000,
  currency: "NZD",
  plainLanguageSummary:
    "The adviser is paid in three stages for defined actions. Funds are held until signatures are anchored and released only when each action is completed. If deadlines are missed, remaining funds can be reclaimed.",
  translatedSummary:
    "सलाहकार को तय कार्यों के लिए तीन चरणों में भुगतान किया जाता है। हस्ताक्षर ऑन-चेन दर्ज होने तक राशि सुरक्षित रहती है। समयसीमा चूकने पर बची हुई राशि वापस मांगी जा सकती है।",
  redFlags: [],
};

type ContractMilestone = {
  amount: bigint;
  deadline: bigint;
  pausedAt: bigint;
  proofHash: Hex;
  status: number;
};

const STATE_LABELS = ["Created", "Anchored", "Active", "Ended"] as const;
const STATUS_LABELS = ["Pending", "Released", "Reclaimed"] as const;

function addWorkingDays(start: Date, workingDays: number) {
  if (workingDays <= 0) return 0n;
  const due = new Date(start);
  let remaining = workingDays;
  while (remaining > 0) {
    due.setDate(due.getDate() + 1);
    const day = due.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return BigInt(Math.floor(due.getTime() / 1000));
}

function getEngagementField<T>(engagement: unknown, index: number): T | undefined {
  return Array.isArray(engagement) ? (engagement[index] as T) : undefined;
}

function parseOptionalBigInt(value: string) {
  if (!/^\d+$/.test(value.trim())) return undefined;
  return BigInt(value.trim());
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export const EscrowDemo: NextPage = () => {
  const walletSetup = usePrivyWalletSetup();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { address: migrantAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const chainId = targetNetwork.id as AllowedChainIds;
  const publicClient = usePublicClient({ chainId });
  const [adviserAddress, setAdviserAddress] = useState<AddressType | "">("");
  const [licenceRef, setLicenceRef] = useState("IAA-DEMO-LICENSED");
  const [migrantName, setMigrantName] = useState("Demo Migrant");
  const [migrantEmail, setMigrantEmail] = useState("migrant@example.com");
  const [adviserName, setAdviserName] = useState("Demo Licensed Adviser");
  const [adviserEmail, setAdviserEmail] = useState("adviser@example.com");
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult>(DEMO_EXTRACTION);
  const [engagementId, setEngagementId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const parsedEngagementId = parseOptionalBigInt(engagementId);
  const { data: visaEscrow } = useDeployedContractInfo({ contractName: "VisaEscrow", chainId });

  const { data: latestBlock } = useBlock({ chainId, watch: true });
  const now = latestBlock?.timestamp ?? 0n;

  const { data: engagement } = useScaffoldReadContract({
    contractName: "VisaEscrow",
    functionName: "engagements",
    args: [parsedEngagementId],
    chainId,
    query: { enabled: parsedEngagementId !== undefined },
  });

  const { data: milestones } = useScaffoldReadContract({
    contractName: "VisaEscrow",
    functionName: "getMilestones",
    args: [parsedEngagementId],
    chainId,
    query: { enabled: parsedEngagementId !== undefined },
  });

  const { data: allowance } = useScaffoldReadContract({
    contractName: "MockNZDD",
    functionName: "allowance",
    args: [migrantAddress, visaEscrow?.address],
    chainId,
    query: { enabled: Boolean(migrantAddress && visaEscrow?.address) },
  });

  const { data: balance } = useScaffoldReadContract({
    contractName: "MockNZDD",
    functionName: "balanceOf",
    args: [migrantAddress],
    chainId,
    query: { enabled: Boolean(migrantAddress) },
  });

  const { data: tokenDecimals } = useScaffoldReadContract({
    contractName: "MockNZDD",
    functionName: "decimals",
    chainId,
  });

  const escrowWrite = useScaffoldWriteContract({ contractName: "VisaEscrow", chainId });
  const tokenWrite = useScaffoldWriteContract({ contractName: "MockNZDD", chainId });

  const engagementState = getEngagementField<number>(engagement, 8);
  const currentMilestoneIndex = getEngagementField<number>(engagement, 7) ?? 0;
  const totalAmount = getEngagementField<bigint>(engagement, 4);
  const agreementHash = getEngagementField<Hex>(engagement, 3);
  const contractMilestones = (milestones ?? []) as readonly ContractMilestone[];
  const currentMilestone = contractMilestones[currentMilestoneIndex];
  const funded = engagementState === 2;
  const anchored = Boolean(
    agreementHash && agreementHash !== "0x0000000000000000000000000000000000000000000000000000000000000000",
  );
  const needsApproval = totalAmount !== undefined && (allowance ?? 0n) < totalAmount;
  const reclaimAt = currentMilestone?.deadline ? currentMilestone.deadline + BigInt(GRACE_PERIOD_SECONDS) : 0n;
  const reclaimReady =
    engagementState === 2 && currentMilestone?.status === 0 && currentMilestone.deadline > 0n && now > reclaimAt;

  const plannedAmounts = useMemo(
    () =>
      tokenDecimals === undefined
        ? []
        : extraction.milestones.map(milestone => parseUnits(String(milestone.amount), tokenDecimals)),
    [extraction.milestones, tokenDecimals],
  );

  const plannedDeadlines = useMemo(() => {
    const start = new Date();
    return extraction.milestones.map(milestone => addWorkingDays(start, milestone.dueInWorkingDays));
  }, [extraction.milestones]);

  const licenceHash = useMemo(() => keccak256(toHex(licenceRef.trim())), [licenceRef]);

  async function createEngagement() {
    if (!migrantAddress) {
      notification.error("Sign in before creating an engagement");
      return;
    }
    if (!isAddress(adviserAddress)) {
      notification.error("Enter a valid adviser address");
      return;
    }
    if (!publicClient || !visaEscrow) {
      notification.error("Contract client is not ready");
      return;
    }
    if (tokenDecimals === undefined) {
      notification.error("dNZD token details are not ready");
      return;
    }

    setBusy("create");
    try {
      const txHash = await escrowWrite.writeContractAsync({
        functionName: "createEngagement",
        args: [adviserAddress, licenceHash, plannedAmounts, plannedDeadlines],
      });
      if (!txHash) return;
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const logs = parseEventLogs({
        abi: visaEscrow.abi,
        eventName: "EngagementCreated",
        logs: receipt.logs,
      });
      const createdLog = logs[0] as { args?: { id?: bigint } } | undefined;
      const id = createdLog?.args?.id;
      if (id === undefined) {
        notification.error("Could not read engagement id from transaction");
        return;
      }
      setEngagementId(id.toString());
      notification.success(`Engagement #${id.toString()} created`);
    } finally {
      setBusy(null);
    }
  }

  async function startSigning() {
    if (!agreementFile || !migrantAddress || !isAddress(adviserAddress) || !parsedEngagementId) {
      notification.error("Create an engagement and select the fee agreement PDF first");
      return;
    }

    setBusy("signing");
    try {
      const res = await privyFetch("/api/lumin/signing-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: targetNetwork.id,
          engagementId: Number(parsedEngagementId),
          adviserLicenceRef: licenceHash,
          migrant: { name: migrantName, email: migrantEmail, address: migrantAddress },
          adviser: { name: adviserName, email: adviserEmail, address: adviserAddress },
          agreementFileName: agreementFile.name,
          agreementPdfBase64: await fileToBase64(agreementFile),
          extractedAgreement: extraction,
        }),
      });
      const data = (await res.json()) as { error?: string; luminDocumentId?: string };
      if (!res.ok) {
        notification.error(data.error ?? "Could not create signing request");
        return;
      }
      notification.success(`Lumin document ${data.luminDocumentId} created`);
    } finally {
      setBusy(null);
    }
  }

  async function approveToken() {
    if (!visaEscrow?.address || totalAmount === undefined) return;
    setBusy("approve");
    try {
      await tokenWrite.writeContractAsync({
        functionName: "approve",
        args: [visaEscrow.address, totalAmount],
      });
    } finally {
      setBusy(null);
    }
  }

  async function mintTestToken() {
    if (!migrantAddress || tokenDecimals === undefined) return;
    setBusy("mint");
    try {
      await tokenWrite.writeContractAsync({
        functionName: "mint",
        args: [migrantAddress, parseUnits("5000", tokenDecimals)],
      });
    } finally {
      setBusy(null);
    }
  }

  async function fundEngagement() {
    if (!parsedEngagementId) return;
    setBusy("fund");
    try {
      await escrowWrite.writeContractAsync({
        functionName: "fund",
        args: [parsedEngagementId],
      });
    } finally {
      setBusy(null);
    }
  }

  async function reclaim() {
    if (!parsedEngagementId || !reclaimReady) return;
    setBusy("reclaim");
    try {
      await escrowWrite.writeContractAsync({
        functionName: "reclaimTranche",
        args: [parsedEngagementId],
      });
    } finally {
      setBusy(null);
    }
  }

  async function fastForward() {
    setBusy("time");
    try {
      const seconds = reclaimAt > now ? Number(reclaimAt - now + 1n) : GRACE_PERIOD_SECONDS + 24 * 60 * 60;
      const res = await privyFetch("/api/escrow/fast-forward", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chainId: targetNetwork.id, seconds }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        notification.error(data.error ?? "Could not fast-forward local chain");
        return;
      }
      notification.success("Local chain time advanced");
    } finally {
      setBusy(null);
    }
  }

  function updateMilestone(index: number, patch: Partial<Milestone>) {
    setExtraction(current => ({
      ...current,
      milestones: current.milestones.map((milestone, i) => (i === index ? { ...milestone, ...patch } : milestone)),
      totalFee: current.milestones.reduce((sum, milestone, i) => {
        const nextMilestone = i === index ? { ...milestone, ...patch } : milestone;
        return sum + nextMilestone.amount;
      }, 0),
    }));
  }

  if (walletSetup.isEmbeddedWallet && walletSetup.status !== "ready") {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12">
        <div role="status" className="alert alert-info">
          {walletSetup.status === "error" ? (
            <>
              <span>{walletSetup.error ?? "We could not prepare your account."}</span>
              <button className="btn btn-sm btn-warning" onClick={walletSetup.retry} type="button">
                Retry setup
              </button>
            </>
          ) : (
            <>
              <span className="loading loading-spinner loading-sm" />
              <span>Preparing your account for secure test payments…</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">AdVisa Escrow Console</h1>
        <p className="text-sm text-base-content/70 max-w-3xl">
          Create the on-chain engagement, send the agreement to Lumin, fund test dNZD after the signed hash is anchored,
          and exercise the deadline reclaim path.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col gap-4">
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body gap-4">
              <h2 className="card-title text-lg">Parties</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="form-control gap-1">
                  <span className="label-text">Migrant name</span>
                  <input
                    className="input input-bordered"
                    value={migrantName}
                    onChange={e => setMigrantName(e.target.value)}
                  />
                </label>
                <label className="form-control gap-1">
                  <span className="label-text">Migrant email</span>
                  <input
                    className="input input-bordered"
                    value={migrantEmail}
                    onChange={e => setMigrantEmail(e.target.value)}
                  />
                </label>
                <label className="form-control gap-1">
                  <span className="label-text">Adviser name</span>
                  <input
                    className="input input-bordered"
                    value={adviserName}
                    onChange={e => setAdviserName(e.target.value)}
                  />
                </label>
                <label className="form-control gap-1">
                  <span className="label-text">Adviser email</span>
                  <input
                    className="input input-bordered"
                    value={adviserEmail}
                    onChange={e => setAdviserEmail(e.target.value)}
                  />
                </label>
              </div>
              <label className="form-control gap-1">
                <span className="label-text">Adviser address</span>
                <AddressInput value={adviserAddress} onChange={value => setAdviserAddress(value as AddressType)} />
              </label>
              <label className="form-control gap-1">
                <span className="label-text">Licence reference</span>
                <input
                  className="input input-bordered font-mono"
                  value={licenceRef}
                  onChange={e => setLicenceRef(e.target.value)}
                />
                <span className="label-text-alt break-all">On-chain licence hash: {licenceHash}</span>
              </label>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="card-title text-lg">Milestones</h2>
                <span className="badge badge-outline">Total NZ${extraction.totalFee.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-3">
                {extraction.milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="grid md:grid-cols-[1fr_120px_150px] gap-3 items-end rounded-lg bg-base-200 p-3"
                  >
                    <label className="form-control gap-1">
                      <span className="label-text">Action</span>
                      <input
                        className="input input-bordered input-sm"
                        value={milestone.name}
                        onChange={e => updateMilestone(index, { name: e.target.value })}
                      />
                    </label>
                    <label className="form-control gap-1">
                      <span className="label-text">Amount</span>
                      <input
                        className="input input-bordered input-sm"
                        type="number"
                        value={milestone.amount}
                        onChange={e => updateMilestone(index, { amount: Number(e.target.value) })}
                      />
                    </label>
                    <label className="form-control gap-1">
                      <span className="label-text">Working days</span>
                      <input
                        className="input input-bordered input-sm"
                        type="number"
                        value={milestone.dueInWorkingDays}
                        onChange={e => updateMilestone(index, { dueInWorkingDays: Number(e.target.value) })}
                      />
                    </label>
                    <textarea
                      className="textarea textarea-bordered textarea-sm md:col-span-3"
                      value={milestone.description}
                      onChange={e => updateMilestone(index, { description: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body gap-4">
              <h2 className="card-title text-lg">Actions</h2>
              <div className="text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-base-content/60">Network</span>
                  <span className="font-medium">{targetNetwork.name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-base-content/60">Signed in as</span>
                  <Address address={migrantAddress} chain={targetNetwork} />
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-base-content/60">dNZD balance</span>
                  <span>
                    {balance === undefined || tokenDecimals === undefined ? "-" : formatUnits(balance, tokenDecimals)}
                  </span>
                </div>
              </div>

              <button className="btn btn-primary" disabled={busy !== null} onClick={createEngagement}>
                {busy === "create" && <span className="loading loading-spinner loading-sm" />}
                Create engagement
              </button>

              <label className="form-control gap-1">
                <span className="label-text">Existing engagement id</span>
                <input
                  className="input input-bordered font-mono"
                  value={engagementId}
                  onChange={e => setEngagementId(e.target.value)}
                />
              </label>

              <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
                {agreementFile ? agreementFile.name : "Select agreement PDF"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => setAgreementFile(e.target.files?.[0] ?? null)}
              />

              <button
                className="btn btn-secondary"
                disabled={busy !== null || !parsedEngagementId}
                onClick={startSigning}
              >
                {busy === "signing" && <span className="loading loading-spinner loading-sm" />}
                Send to Lumin
              </button>

              <div className="divider my-0" />

              <button
                className="btn btn-outline"
                disabled={busy !== null || !migrantAddress || tokenDecimals === undefined}
                onClick={mintTestToken}
              >
                {busy === "mint" && <span className="loading loading-spinner loading-sm" />}
                Mint 5,000 test dNZD
              </button>
              <button
                className="btn btn-outline"
                disabled={busy !== null || !anchored || !needsApproval}
                onClick={approveToken}
              >
                {busy === "approve" && <span className="loading loading-spinner loading-sm" />}
                Approve test dNZD
              </button>
              <button
                className="btn btn-primary"
                disabled={busy !== null || !anchored || needsApproval || funded}
                onClick={fundEngagement}
              >
                {busy === "fund" && <span className="loading loading-spinner loading-sm" />}
                Fund escrow
              </button>
              <button
                className={`btn ${reclaimReady ? "btn-error" : "btn-disabled"}`}
                disabled={busy !== null || !reclaimReady}
                onClick={reclaim}
              >
                {busy === "reclaim" && <span className="loading loading-spinner loading-sm" />}
                Reclaim remaining funds
              </button>
              {targetNetwork.id === hardhat.id && (
                <button className="btn btn-warning" disabled={busy !== null} onClick={fastForward}>
                  {busy === "time" && <span className="loading loading-spinner loading-sm" />}
                  Fast-forward to reclaim
                </button>
              )}
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body gap-4">
              <h2 className="card-title text-lg">Escrow Status</h2>
              <div className="stats stats-vertical shadow-none bg-base-200">
                <div className="stat">
                  <div className="stat-title">State</div>
                  <div className="stat-value text-lg">
                    {engagementState === undefined ? "-" : STATE_LABELS[engagementState]}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">Total</div>
                  <div className="stat-value text-lg">
                    {totalAmount === undefined || tokenDecimals === undefined
                      ? "-"
                      : `NZ$${formatUnits(totalAmount, tokenDecimals)}`}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">Reclaim available</div>
                  <div className={`stat-value text-lg ${reclaimReady ? "text-error" : ""}`}>
                    {reclaimReady ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {contractMilestones.map((milestone, index) => (
                  <div key={index} className="rounded-lg bg-base-200 p-3 text-sm flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Milestone {index + 1}</span>
                      <span className="badge">{STATUS_LABELS[milestone.status]}</span>
                    </div>
                    <span>
                      Amount: {tokenDecimals === undefined ? "-" : `NZ$${formatUnits(milestone.amount, tokenDecimals)}`}
                    </span>
                    <span>
                      Deadline:{" "}
                      {milestone.deadline === 0n
                        ? "No deadline"
                        : new Date(Number(milestone.deadline) * 1000).toLocaleString()}
                    </span>
                    {index === currentMilestoneIndex && milestone.deadline > 0n && (
                      <span>
                        Reclaim after:{" "}
                        {new Date(Number(milestone.deadline + BigInt(GRACE_PERIOD_SECONDS)) * 1000).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
