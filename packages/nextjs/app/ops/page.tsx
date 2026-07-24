"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { hardhat } from "viem/chains";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type AdminResponse = {
  ok?: boolean;
  error?: string;
  action?: string;
  txHash?: string;
  submitTxHash?: string;
  completeTxHash?: string;
  licenceStatus?: string;
};

const OpsPage: NextPage = () => {
  const { targetNetwork } = useTargetNetwork();
  const [engagementId, setEngagementId] = useState("1");
  const [proofText, setProofText] = useState("Application lodged receipt shown to migrant");
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AdminResponse | null>(null);

  async function callAdmin(action: string) {
    setBusy(action);
    try {
      const res = await fetch("/api/escrow/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, chainId: targetNetwork.id, engagementId, proofText }),
      });
      const data = (await res.json()) as AdminResponse;
      setLastResponse(data);
      if (!res.ok) {
        notification.error(data.error ?? "Admin action failed");
        return;
      }
      notification.success(data.action ?? action);
    } finally {
      setBusy(null);
    }
  }

  async function fastForward() {
    setBusy("fastForward");
    try {
      const res = await fetch("/api/escrow/fast-forward", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chainId: targetNetwork.id, seconds: 6 * 24 * 60 * 60 }),
      });
      const data = (await res.json()) as AdminResponse;
      setLastResponse(data);
      if (!res.ok) {
        notification.error(data.error ?? "Fast-forward failed");
        return;
      }
      notification.success("Local chain advanced");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">AdVisa Ops</h1>
        <p className="text-sm text-base-content/70">
          Relayer-only actions for the demo path. Milestone release re-checks adviser licence status before moving
          funds.
        </p>
      </section>

      <section className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="form-control gap-1">
              <span className="label-text">Network</span>
              <input className="input input-bordered" value={targetNetwork.name} disabled />
            </label>
            <label className="form-control gap-1">
              <span className="label-text">Engagement id</span>
              <input
                className="input input-bordered font-mono"
                value={engagementId}
                onChange={e => setEngagementId(e.target.value)}
              />
            </label>
          </div>

          <label className="form-control gap-1">
            <span className="label-text">Proof text</span>
            <textarea
              className="textarea textarea-bordered"
              value={proofText}
              onChange={e => setProofText(e.target.value)}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => callAdmin("submitProofAndComplete")}
            >
              {busy === "submitProofAndComplete" && <span className="loading loading-spinner loading-sm" />}
              Submit proof + release
            </button>
            <button
              className="btn btn-error btn-outline"
              disabled={busy !== null}
              onClick={() => callAdmin("refundAfterLicenceCheck")}
            >
              {busy === "refundAfterLicenceCheck" && <span className="loading loading-spinner loading-sm" />}
              Re-check licence + refund
            </button>
            <button className="btn btn-outline" disabled={busy !== null} onClick={() => callAdmin("pauseClock")}>
              Pause clock
            </button>
            <button className="btn btn-outline" disabled={busy !== null} onClick={() => callAdmin("resumeClock")}>
              Resume clock
            </button>
            {targetNetwork.id === hardhat.id && (
              <button className="btn btn-warning sm:col-span-2" disabled={busy !== null} onClick={fastForward}>
                {busy === "fastForward" && <span className="loading loading-spinner loading-sm" />}
                Fast-forward local chain 6 days
              </button>
            )}
          </div>
        </div>
      </section>

      {lastResponse && (
        <pre className="rounded-lg bg-base-300 p-4 text-xs overflow-auto">{JSON.stringify(lastResponse, null, 2)}</pre>
      )}
    </div>
  );
};

export default OpsPage;
