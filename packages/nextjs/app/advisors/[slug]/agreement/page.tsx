"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  type Advisor,
  basescanAddr,
  basescanTx,
  formatMoney,
  getAdvisorBySlug,
  getAdvisorSlug,
  getMilestones,
} from "~~/components/advisa/advisors";

type SignState = "review" | "signing" | "signed";

const LegalDocument = ({ advisor, milestones }: { advisor: Advisor; milestones: ReturnType<typeof getMilestones> }) => (
  <div className="legal-doc">
    <div className="legal-doc__title">
      <h2>Immigration Adviser Fee Agreement</h2>
      <p>
        Prepared under the Immigration Advisers Licensing Act 2007 and the Code of Conduct 2014. This agreement must be
        signed by both parties before any payment is accepted.
      </p>
    </div>
    <div className="legal-doc__section">
      <h3>1. Parties</h3>
      <div className="legal-doc__parties">
        <div>
          <span className="legal-doc__party-label">IMMIGRATION ADVISER</span>
          <strong>{advisor.name}</strong>
          <span>{advisor.title}</span>
          <a
            className="hash-link"
            href={basescanTx(advisor.hash1, advisor.hash1Full)}
            target="_blank"
            rel="noopener noreferrer"
          >
            IAA Licence · verified {advisor.hash1} ↗
          </a>
        </div>
        <div>
          <span className="legal-doc__party-label">CLIENT</span>
          <strong>You (the applicant)</strong>
          <span>
            Identity verified via{" "}
            <a href="https://privy.io" target="_blank" rel="noopener noreferrer" className="privy-inline-link">
              Privy
            </a>
          </span>
          <span>Wallet: escrow counterparty</span>
        </div>
      </div>
    </div>
    <div className="legal-doc__section">
      <h3>2. Scope of Services</h3>
      <p>
        {advisor.name} agrees to provide licensed immigration advice and to prepare, complete, and lodge an application
        for a <strong>{advisor.agreement.visaType}</strong> on behalf of the client. Services include initial
        consultation, document review, preparation of all INZ-required forms, liaison with INZ on the client&apos;s
        behalf, and uploading of the INZ decision letter upon receipt.
      </p>
      <p>
        Services do not include legal representation in any appeal, review, or Tribunal proceeding. Immigration advice
        does not guarantee a visa outcome · INZ retains sole discretion over all decisions.
      </p>
    </div>
    <div className="legal-doc__section">
      <h3>3. Fee Schedule &amp; Milestone Payments</h3>
      <p>
        The total fee for services is <strong>{formatMoney(advisor.fee)} NZD</strong>. Payment is held in a
        smart-contract escrow managed by AdVisa and released in three milestone tranches as follows:
      </p>
      <table className="legal-doc__table">
        <thead>
          <tr>
            <th>#</th>
            <th>Milestone</th>
            <th>Release condition</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Consultation</td>
            <td>Initial consultation completed and document checklist reviewed</td>
            <td>{formatMoney(milestones.consultation)}</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Lodgement</td>
            <td>Application lodged with INZ; lodgement receipt uploaded to AdVisa</td>
            <td>{formatMoney(milestones.filing)}</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Outcome</td>
            <td>INZ decision letter uploaded to AdVisa; case closed</td>
            <td>{formatMoney(milestones.decision)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div className="legal-doc__section">
      <h3>4. Lodgement Deadline &amp; Automatic Refund</h3>
      <p>
        The adviser must lodge the visa application within{" "}
        <strong>{advisor.agreement.validityDays} calendar days</strong> of the date both parties sign this agreement. If
        lodgement has not occurred by that deadline, any escrow balance not yet released under clause 3 will be
        automatically returned to the client&apos;s wallet without any action required from either party.
      </p>
    </div>
    <div className="legal-doc__section">
      <h3>5. Cancellation &amp; Withdrawal</h3>
      <p>
        The client may cancel this agreement at any time by written notice. Milestone tranches already released under
        clause 3 are non-refundable. Tranches not yet released remain in escrow and are returned to the client
        automatically on cancellation.
      </p>
    </div>
    <div className="legal-doc__section">
      <h3>6. Code of Conduct</h3>
      <p>
        {advisor.name} is bound by the Immigration Advisers Code of Conduct 2014. AdVisa is a payment and verification
        platform only · it is not an immigration advice service.
      </p>
    </div>
    <div className="legal-doc__section">
      <h3>7. Electronic Execution</h3>
      <p>
        This agreement is executed electronically via Lumin Sign. The SHA-256 hash of the signed document is recorded on
        the Base Sepolia blockchain by AdVisa&apos;s relayer within 60 seconds of both parties signing.
      </p>
    </div>
  </div>
);

export default function AgreementPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const advisor = getAdvisorBySlug(slug);
  const [signState, setSignState] = useState<SignState>("review");
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!advisor) router.replace("/advisors");
  }, [advisor, router]);

  if (!advisor) return null;

  const milestones = getMilestones(advisor);

  const handleSign = () => {
    setSignState("signing");
    setTimeout(() => setSignState("signed"), 2200);
  };

  return (
    <div className="app-screen app-screen--agreement">
      <Link className="back-button" href={`/advisors/${getAdvisorSlug(advisor)}`}>
        ← Back to {advisor.first}&apos;s profile
      </Link>

      <div className="agreement-header">
        <div>
          <h1>Fee Agreement</h1>
          <p className="agreement-header__sub">
            {advisor.specialty} visa · with {advisor.name}
          </p>
        </div>
        {signState === "signed" && (
          <a
            className="chain-badge chain-badge--small chain-badge--link"
            href={basescanTx(advisor.hash1, advisor.hash1Full)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="verified-dot" />
            HASH ANCHORED ON-CHAIN ↗
          </a>
        )}
      </div>

      <section className="app-card agreement-doc-card">
        <div className="agreement-doc-card__header">
          <span className="agreement-doc-card__label">LEGAL DOCUMENT</span>
          <span className="agreement-doc-card__hint">Scroll to read ↓</span>
        </div>
        <div className="agreement-doc-scroll" ref={docRef}>
          <LegalDocument advisor={advisor} milestones={milestones} />
        </div>
      </section>

      <section className="app-card agreement-summary-card">
        <div className="agreement-summary-card__eyebrow">
          <span className="verified-dot" />
          PLAIN LANGUAGE SUMMARY · AI EXTRACTED
        </div>
        <p className="agreement-summary-card__text">{advisor.agreement.plainSummary}</p>
        {advisor.agreement.redFlags.length === 0 ? (
          <div className="agreement-no-flags">
            <span>✓</span>
            No red flags detected · standard milestone-based fee structure.
          </div>
        ) : (
          <ul className="agreement-flags-list">
            {advisor.agreement.redFlags.map(flag => (
              <li key={flag}>⚠ {flag}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="app-card payment-card">
        <h2>Payment Schedule</h2>
        <p className="agreement-section__sub">Escrow releases only when each milestone is completed and verified.</p>
        <div className="release-list">
          <div>
            <span>1</span>
            <p>Consultation completed · document checklist reviewed</p>
            <strong>{formatMoney(milestones.consultation)}</strong>
          </div>
          <div>
            <span>2</span>
            <p>Application lodged with INZ · lodgement receipt uploaded</p>
            <strong>{formatMoney(milestones.filing)}</strong>
          </div>
          <div>
            <span>3</span>
            <p>INZ outcome letter uploaded · case closed</p>
            <strong>{formatMoney(milestones.decision)}</strong>
          </div>
        </div>
      </section>

      <div className="agreement-sign-panel">
        {signState === "review" && (
          <>
            <button className="app-primary-button app-primary-button--wide" type="button" onClick={handleSign}>
              Sign agreement via Lumin →
            </button>
            <p className="agreement-actions__sub">
              Your electronic signature has the same legal effect as a handwritten one under NZ law.
            </p>
          </>
        )}

        {signState === "signing" && (
          <div className="agreement-signing-state">
            <div className="agreement-signing-state__spinner" aria-hidden="true" />
            <div>
              <strong>Sending to Lumin Sign…</strong>
              <p>Both parties are being notified. Anchoring hash to Base Sepolia once signed.</p>
            </div>
          </div>
        )}

        {signState === "signed" && (
          <div className="agreement-signed-state">
            <div className="agreement-signed-state__badge">
              <span>✓</span>
              <div>
                <strong>Agreement signed and sealed</strong>
                <p>
                  Both you and {advisor.first} have signed. This document is now locked · it cannot be changed by
                  anyone, including us.
                </p>
                <div className="signed-meta">
                  <div className="signed-meta__ref">
                    <span className="signed-meta__pill">Lumin Sign</span>
                    <span>Ref: LMN-{advisor.hash2.slice(2, 6).toUpperCase()}-2026</span>
                  </div>
                  <a
                    className="signed-meta__hash hash-link"
                    href={basescanTx(advisor.hash1, advisor.hash1Full)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Hash {advisor.hash2} · Base Sepolia ·{" "}
                    {new Date().toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })} ↗
                  </a>
                </div>
              </div>
            </div>
            <Link
              className="app-primary-button app-primary-button--wide"
              href={`/advisors/${getAdvisorSlug(advisor)}/pay`}
            >
              Fund escrow →
            </Link>
            <p className="agreement-actions__sub">
              Agreement locked. Funds go to escrow · not to {advisor.first} · until each milestone is verified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
