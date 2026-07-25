import Link from "next/link";
import type { NextPage } from "next";

const steps = [
  {
    n: 1,
    href: "/demo/1",
    label: "Licence Check",
    description: "Unlicensed adviser blocked. Licensed adviser passes live IAA register check.",
  },
  {
    n: 2,
    href: "/demo/2",
    label: "AI Extraction",
    description:
      "Upload fee agreement PDF → AI extracts 3 milestones, amounts, red flags + plain-language summary in 4 languages.",
  },
  {
    n: 3,
    href: "/demo/3",
    label: "Sign Agreement",
    description: "Both parties sign in Lumin. PDF hash anchored on-chain. Funds locked until signature confirmed.",
  },
  {
    n: 4,
    href: "/demo/4",
    label: "Fund Escrow",
    description: "Migrant approves dNZD allowance and funds escrow. First 20% tranche releases to adviser immediately.",
  },
  {
    n: 5,
    href: "/demo/5",
    label: "Reclaim",
    description:
      "Clock advances past deadline + grace period. Migrant reclaims all unreleased funds — no AdVisa action needed.",
  },
];

const DemoPage: NextPage = () => (
  <main className="flex grow flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="badge badge-primary badge-lg w-fit">Web3NZ Hackathon — UC Christchurch</div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">AdVisa Demo</h1>
        <p className="text-base-content/70 text-base leading-7 max-w-2xl">
          Escrow and verification rails for NZ immigration adviser fees. Five steps. No personal data on-chain — only
          hashes, addresses, amounts, and timestamps.
        </p>
        <div className="alert bg-info/10 border-info text-sm mt-1">
          AdVisa is not an immigration advice service. We are payment infrastructure underneath licensed advisers.
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {steps.map(s => (
          <li key={s.n}>
            <Link
              href={s.href}
              className="flex items-start gap-4 p-4 rounded-xl border border-base-300 bg-base-100 hover:border-primary hover:bg-base-200 transition-colors group"
            >
              <span className="badge badge-primary badge-lg shrink-0 mt-0.5 group-hover:badge-secondary transition-colors">
                {s.n}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">{s.label}</span>
                <span className="text-sm text-base-content/60">{s.description}</span>
              </div>
              <span className="ml-auto text-base-content/30 group-hover:text-primary transition-colors text-lg">→</span>
            </Link>
          </li>
        ))}
      </ol>

      <Link href="/demo/1" className="btn btn-primary btn-lg w-full">
        Start Demo →
      </Link>
    </div>
  </main>
);

export default DemoPage;
