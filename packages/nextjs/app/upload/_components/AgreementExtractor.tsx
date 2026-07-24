"use client";

import { useRef, useState } from "react";
import type { ExtractionResult, RedFlag } from "~~/types/advisa";

const SEVERITY_CLASS: Record<RedFlag["severity"], string> = {
  high: "badge-error",
  medium: "badge-warning",
  low: "badge-info",
};

const SEVERITY_LABEL: Record<RedFlag["severity"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

type Language = "en" | "hi";

const LANG_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
};

export function AgreementExtractor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [lang, setLang] = useState<Language>("en");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setResult(null);
    setError(null);
  }

  async function handleExtract() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("pdf", file);

    try {
      const res = await fetch("/api/extract-agreement", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Extraction failed. Please try again.");
        return;
      }
      setResult(data as ExtractionResult);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const summary = result ? (lang === "en" ? result.plainLanguageSummary : result.translatedSummary) : null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto">
      {/* Upload card */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title text-lg">Upload Fee Agreement</h2>
          <p className="text-sm text-base-content/70">
            Upload the signed fee agreement PDF. AdVisa will extract the milestones and amounts automatically — no
            manual data entry.
          </p>

          <div
            className="border-2 border-dashed border-base-300 rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <svg className="h-10 w-10 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            {file ? (
              <span className="text-sm font-medium">{file.name}</span>
            ) : (
              <span className="text-sm text-base-content/50">Click to select a PDF</span>
            )}
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          </div>

          {error && (
            <div role="alert" className="alert alert-error text-sm">
              {error}
            </div>
          )}

          <button className="btn btn-primary" disabled={!file || loading} onClick={handleExtract}>
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Extracting milestones…
              </>
            ) : (
              "Extract Milestones"
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Red flags — shown first so they're impossible to miss */}
          {result.redFlags.length > 0 && (
            <div className="card bg-base-100 border border-error/40 shadow-sm">
              <div className="card-body gap-3">
                <h2 className="card-title text-lg text-error">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                  Red Flags ({result.redFlags.length})
                </h2>
                <p className="text-sm text-base-content/70">
                  These issues were found in the agreement. Review them carefully before signing or funding.
                </p>
                <ul className="flex flex-col gap-2">
                  {result.redFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-base-200">
                      <span className={`badge badge-sm mt-0.5 shrink-0 ${SEVERITY_CLASS[flag.severity]}`}>
                        {SEVERITY_LABEL[flag.severity]}
                      </span>
                      <span className="text-sm">{flag.issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Milestones */}
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-baseline justify-between">
                <h2 className="card-title text-lg">Milestones</h2>
                <span className="text-sm text-base-content/60">
                  Total: NZ${result.totalFee.toLocaleString()} {result.currency}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {result.milestones.map((m, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-base-200">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold">
                      {i}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{m.name}</span>
                        <span className="text-sm font-mono text-primary">NZ${m.amount.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-base-content/70 mt-1">{m.description}</p>
                      {m.dueInWorkingDays > 0 && (
                        <span className="badge badge-outline badge-sm mt-2">
                          Due within {m.dueInWorkingDays} working days
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Plain-language summary */}
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="card-title text-lg">Plain-Language Summary</h2>
                <div className="join">
                  {(Object.keys(LANG_LABELS) as Language[]).map(l => (
                    <button
                      key={l}
                      className={`join-item btn btn-sm ${lang === l ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setLang(l)}
                    >
                      {LANG_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
