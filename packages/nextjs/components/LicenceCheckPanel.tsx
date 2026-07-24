"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircleIcon, ShieldCheckIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useLicenceCheck } from "~~/hooks/useLicenceCheck";
import type { LicenceCheckResult, LicenceCheckStatus } from "~~/services/licence-check/types";

const statusContent: Record<
  LicenceCheckStatus,
  {
    title: string;
    detail: string;
    badgeClass: string;
    panelClass: string;
  }
> = {
  licensed: {
    title: "Licensed adviser verified",
    detail: "This adviser can continue to agreement setup.",
    badgeClass: "badge-success",
    panelClass: "border-success bg-success/10",
  },
  not_licensed: {
    title: "Not licensed - blocked",
    detail: "AdVisa will not continue with this adviser.",
    badgeClass: "badge-error",
    panelClass: "border-error bg-error/10",
  },
  unknown: {
    title: "Verification unavailable - blocked",
    detail: "The live register check did not complete.",
    badgeClass: "badge-warning",
    panelClass: "border-warning bg-warning/10",
  },
};

const formatCheckedAt = (value: string) =>
  new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const truncateHash = (value: string) => `${value.slice(0, 10)}...${value.slice(-8)}`;

const ResultPanel = ({ result }: { result: LicenceCheckResult }) => {
  const content = statusContent[result.status];

  return (
    <section className={`border-2 p-5 ${content.panelClass}`} aria-live="polite">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className={`badge ${content.badgeClass} badge-lg gap-2 font-semibold`}>
            {result.status === "licensed" ? (
              <CheckCircleIcon className="h-4 w-4" />
            ) : (
              <XCircleIcon className="h-4 w-4" />
            )}
            {content.title}
          </div>
          <h2 className="mt-4 text-2xl font-bold">{result.adviserName ?? "Adviser"}</h2>
          <p className="mt-2 text-sm opacity-80">{content.detail}</p>
        </div>

        <button className="btn btn-primary sm:min-w-44" disabled={!result.canProceed}>
          Continue
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="border border-base-300 bg-base-100 p-3">
          <div className="text-xs font-semibold uppercase opacity-60">Licence type</div>
          <div className="mt-1 font-medium">{result.licenceType ?? "Not shown"}</div>
        </div>
        <div className="border border-base-300 bg-base-100 p-3">
          <div className="text-xs font-semibold uppercase opacity-60">Checked</div>
          <div className="mt-1 font-medium">{formatCheckedAt(result.checkedAt)}</div>
        </div>
        <div className="border border-base-300 bg-base-100 p-3">
          <div className="text-xs font-semibold uppercase opacity-60">Licence reference</div>
          <div className="mt-1 font-mono text-sm">
            {result.licenceRef ? truncateHash(result.licenceRef) : "Not available"}
          </div>
        </div>
      </div>
    </section>
  );
};

export const LicenceCheckPanel = () => {
  const [adviserName, setAdviserName] = useState("");
  const { result, isChecking, error, checkLicence, reset } = useLicenceCheck();

  const canSubmit = useMemo(() => adviserName.trim().length >= 2 && !isChecking, [adviserName, isChecking]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    await checkLicence(adviserName);
  };

  const setSample = (name: string) => {
    setAdviserName(name);
    reset();
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
      <section className="border border-base-300 bg-base-100 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide opacity-70">
              <ShieldCheckIcon className="h-5 w-5" />
              IAA licence verification
            </div>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">AdVisa</h1>
            <p className="mt-3 text-lg opacity-80">
              Escrow and verification rails for New Zealand immigration adviser fees.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setSample("Not Licensed Adviser")}>
              Not Licensed Adviser
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setSample("Josh Morton")}>
              Josh Morton
            </button>
          </div>
        </div>

        <form className="mt-8 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <label className="input input-bordered flex min-h-12 flex-1 items-center gap-2">
            <span className="text-sm font-semibold opacity-60">Name</span>
            <input
              className="grow"
              value={adviserName}
              onChange={event => {
                setAdviserName(event.target.value);
                reset();
              }}
              placeholder="Adviser name or licence number"
            />
          </label>
          <button className="btn btn-primary min-h-12 sm:min-w-44" disabled={!canSubmit}>
            {isChecking ? <span className="loading loading-spinner loading-sm" /> : "Check adviser"}
          </button>
        </form>

        {error && <div className="alert alert-error mt-4">{error}</div>}
      </section>

      {result ? (
        <ResultPanel result={result} />
      ) : (
        <section className="border border-base-300 bg-base-100 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border-l-4 border-error bg-base-200 p-4">
              <div className="text-sm font-semibold">Step 1</div>
              <div className="mt-1 text-lg font-bold">Blocked</div>
            </div>
            <div className="border-l-4 border-success bg-base-200 p-4">
              <div className="text-sm font-semibold">Step 2</div>
              <div className="mt-1 text-lg font-bold">Licensed</div>
            </div>
            <div className="border-l-4 border-info bg-base-200 p-4">
              <div className="text-sm font-semibold">On-chain</div>
              <div className="mt-1 text-lg font-bold">Hash only</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
