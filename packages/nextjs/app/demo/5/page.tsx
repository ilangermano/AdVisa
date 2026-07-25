import { DemoStepLayout } from "../_components/DemoStepLayout";
import type { NextPage } from "next";
import { EscrowDemo } from "~~/app/_components/EscrowDemo";

const Step5: NextPage = () => (
  <DemoStepLayout step={5}>
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Steps 7 & 8 — Advance Clock & Reclaim</h2>
        <p className="text-base-content/70 mt-1 text-sm">
          Advance the chain clock past the lodgement deadline plus the 5-day grace period using the ops panel. The
          reclaim button activates and the migrant calls <span className="font-mono text-xs">reclaimTranche()</span> —
          all unreleased funds return to the migrant automatically, with no action from AdVisa required.
        </p>
        <div className="mt-2">
          <a href="/ops" target="_blank" className="btn btn-outline btn-sm">
            Open Ops Panel (advance clock) ↗
          </a>
        </div>
      </div>
      <EscrowDemo />
    </div>
  </DemoStepLayout>
);

export default Step5;
