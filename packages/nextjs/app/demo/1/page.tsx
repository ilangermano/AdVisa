import { DemoStepLayout } from "../_components/DemoStepLayout";
import type { NextPage } from "next";
import { LicenceCheckPanel } from "~~/components/LicenceCheckPanel";

const Step1: NextPage = () => (
  <DemoStepLayout step={1}>
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Steps 1 & 2 — Licence Check</h2>
        <p className="text-base-content/70 mt-1 text-sm">
          Try an unlicensed name first — it gets blocked. Then try a licensed adviser — it passes.
        </p>
        <ul className="mt-2 text-sm text-base-content/60 list-disc list-inside space-y-1">
          <li>
            Unlicensed: try <span className="font-mono">John Smith</span>
          </li>
          <li>
            Licensed: try <span className="font-mono">Josh Morton</span>
          </li>
        </ul>
      </div>
      <LicenceCheckPanel />
    </div>
  </DemoStepLayout>
);

export default Step1;
