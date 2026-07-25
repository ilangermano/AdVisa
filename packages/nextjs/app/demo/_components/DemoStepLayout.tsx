"use client";

import Link from "next/link";

const STEPS = [
  { n: 1, label: "Licence Check" },
  { n: 2, label: "AI Extraction" },
  { n: 3, label: "Sign Agreement" },
  { n: 4, label: "Fund Escrow" },
  { n: 5, label: "Reclaim" },
];

type Props = {
  step: number;
  children: React.ReactNode;
};

export function DemoStepLayout({ step, children }: Props) {
  const prev = step > 1 ? `/demo/${step - 1}` : "/demo";
  const next = step < 5 ? `/demo/${step + 1}` : null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map(s => (
          <Link
            key={s.n}
            href={`/demo/${s.n}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              s.n === step
                ? "bg-primary text-primary-content border-primary"
                : s.n < step
                  ? "bg-success/20 text-success border-success/40"
                  : "bg-base-200 text-base-content/50 border-base-300"
            }`}
          >
            <span>{s.n}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">{children}</div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-base-300">
        <Link href={prev} className="btn btn-ghost btn-sm">
          ← Back
        </Link>
        {next ? (
          <Link href={next} className="btn btn-primary btn-sm">
            Next →
          </Link>
        ) : (
          <Link href="/demo" className="btn btn-success btn-sm">
            Done ✓
          </Link>
        )}
      </div>
    </div>
  );
}
