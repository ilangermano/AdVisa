import { DemoStepLayout } from "../_components/DemoStepLayout";
import type { NextPage } from "next";
import { EscrowDemo } from "~~/app/_components/EscrowDemo";

const Step3: NextPage = () => (
  <DemoStepLayout step={3}>
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Step 5 — Sign Agreement</h2>
        <p className="text-base-content/70 mt-1 text-sm">
          Both parties sign the fee agreement in Lumin. The signed PDF is hashed and the hash is anchored on-chain via{" "}
          <span className="font-mono text-xs">anchorAgreement()</span>. Funds cannot move until this step completes.
        </p>
      </div>
      <EscrowDemo />
    </div>
  </DemoStepLayout>
);

export default Step3;
