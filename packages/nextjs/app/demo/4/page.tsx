import { DemoStepLayout } from "../_components/DemoStepLayout";
import type { NextPage } from "next";
import { EscrowDemo } from "~~/app/_components/EscrowDemo";

const Step4: NextPage = () => (
  <DemoStepLayout step={4}>
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Step 6 — Fund Escrow</h2>
        <p className="text-base-content/70 mt-1 text-sm">
          The migrant approves the dNZD allowance and funds the escrow contract. The first tranche (20% = NZ$800)
          releases immediately to the adviser upon funding.
        </p>
      </div>
      <EscrowDemo />
    </div>
  </DemoStepLayout>
);

export default Step4;
