import { DemoStepLayout } from "../_components/DemoStepLayout";
import type { NextPage } from "next";
import { AgreementExtractor } from "~~/app/upload/_components/AgreementExtractor";

const Step2: NextPage = () => (
  <DemoStepLayout step={2}>
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Steps 3 & 4 — AI Extraction</h2>
        <p className="text-base-content/70 mt-1 text-sm">
          Upload the signed fee agreement PDF. AdVisa extracts milestones, amounts, and red flags automatically. Then
          switch the summary to Hindi to show multi-language support.
        </p>
      </div>
      <AgreementExtractor />
    </div>
  </DemoStepLayout>
);

export default Step2;
