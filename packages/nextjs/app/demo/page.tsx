import Link from "next/link";
import type { NextPage } from "next";
import { EscrowDemo } from "~~/app/_components/EscrowDemo";
import { LicenceCheckPanel } from "~~/components/LicenceCheckPanel";

const demoSteps = [
  "Unlicensed adviser is blocked",
  "Licensed adviser passes the live IAA check",
  "Fee agreement PDF is reviewed into three action-based milestones",
  "Plain-language Hindi summary is shown",
  "Signed PDF hash is anchored on-chain",
  "MockNZDD allowance is set, escrow is funded, and first tranche is released",
  "Local clock moves beyond deadline plus grace",
  "Migrant reclaims all unreleased funds",
];

const DemoPage: NextPage = () => {
  return (
    <main className="flex grow flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="flex flex-col gap-5">
          <div className="badge badge-primary badge-lg w-fit">Web3NZ Hackathon demo</div>
          <div>
            <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">AdVisa escrow and verification rails</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-base-content/70">
              Check an NZ immigration adviser licence, anchor the signed fee agreement hash on-chain, hold fees in
              generic ERC20 escrow, and release or reclaim funds against action-based milestones.
            </p>
          </div>
          <div className="alert border-info bg-info/10 text-sm">
            AdVisa is not an immigration advice service. No personal data goes on-chain: only hashes, addresses,
            amounts, timestamps, and enums.
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/upload" className="btn btn-outline">
              PDF extraction
            </Link>
            <Link href="/ops" className="btn btn-outline">
              Relayer ops
            </Link>
          </div>
        </div>

        <ol className="grid gap-2 rounded-lg border border-base-300 bg-base-100 p-4 text-sm shadow-sm">
          {demoSteps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 rounded-md bg-base-200 p-3">
              <span className="badge badge-neutral shrink-0">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <LicenceCheckPanel />
      <EscrowDemo />
    </main>
  );
};

export default DemoPage;
