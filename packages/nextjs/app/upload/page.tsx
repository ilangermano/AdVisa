import { AgreementExtractor } from "./_components/AgreementExtractor";
import type { NextPage } from "next";

const UploadPage: NextPage = () => {
  return (
    <div className="flex flex-col items-center grow pt-10 pb-16 px-4">
      <div className="w-full max-w-3xl mb-8">
        <h1 className="text-3xl font-bold">Fee Agreement Review</h1>
        <p className="mt-2 text-base-content/70">
          Upload your signed fee agreement. AdVisa extracts the payment milestones, flags anything unusual, and
          summarises the agreement in plain language · including Hindi.
        </p>
      </div>
      <AgreementExtractor />
    </div>
  );
};

export default UploadPage;
