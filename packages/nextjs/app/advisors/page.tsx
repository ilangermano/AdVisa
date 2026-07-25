"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { type Advisor, advisors, formatMoney, getMilestones, getRateColor } from "~~/components/advisa/advisors";

type Screen = "market" | "profile" | "agreement" | "pay" | "receipt" | "case";
type PaymentMethod = "card" | "crypto";

const filters = ["All", "Work", "Student", "Family", "Tourist", "Permanent residency"];

const Avatar = ({ size = "normal" }: { size?: "small" | "normal" | "large" }) => (
  <span className={`striped-avatar app-avatar app-avatar--${size}`} aria-hidden="true" />
);

const AdvisorCard = ({ advisor, onOpen }: { advisor: Advisor; onOpen: () => void }) => (
  <article className="market-card">
    <div className="market-card__identity">
      <Avatar />
      <div>
        <div className="advisor-name-row">
          <strong>{advisor.name}</strong>
          <span className="verified-chip">✓ Verified</span>
        </div>
        <span>
          {advisor.specialty} · {advisor.flag} {advisor.origin}
        </span>
      </div>
    </div>
    <div className="market-card__stats">
      <div>
        <strong style={{ color: getRateColor(advisor.rate) }}>{advisor.rate}%</strong>
        <span>verified actions</span>
      </div>
      <div>
        <strong>{advisor.rating}★</strong>
        <span>{advisor.cases} cases</span>
      </div>
      <div>
        <strong>{advisor.reply}</strong>
        <span>avg. reply</span>
      </div>
    </div>
    <div className="market-card__footer">
      <p className="market-card__langs">{advisor.languages.join(" · ")}</p>
      <button className="app-primary-button app-primary-button--small" type="button" onClick={onOpen}>
        View adviser
      </button>
    </div>
  </article>
);

const ProfileScreen = ({
  advisor,
  goBack,
  goToAgreement,
}: {
  advisor: Advisor;
  goBack: () => void;
  goToAgreement: () => void;
}) => {
  const reviews = [
    {
      who: `Client · ${advisor.specialty} visa`,
      stars: "★★★★★",
      text: "Explained every step in plain language. I always knew what work had been completed and what money was still held.",
    },
    {
      who: `Client · ${advisor.countries.split(",")[0]}`,
      stars: "★★★★★",
      text: "The escrow made me feel safe paying someone I had never met. I could see each lodged action before funds moved.",
    },
    {
      who: `Client · ${advisor.specialty} visa`,
      stars: "★★★★☆",
      text: "Very thorough. Replies quickly and kept each document request clear.",
    },
  ];

  return (
    <div className="app-screen app-screen--profile">
      <button className="back-button" type="button" onClick={goBack}>
        ← Back to advisers
      </button>
      <div className="profile-layout">
        <div className="profile-main">
          <section className="app-card profile-header-card">
            <div className="profile-identity">
              <Avatar size="large" />
              <div>
                <div className="profile-name-row">
                  <h1>{advisor.name}</h1>
                  <span className="verified-chip verified-chip--profile">✓ Licensed adviser</span>
                </div>
                <p>
                  {advisor.title} · {advisor.specialty} visas · {advisor.flag} {advisor.origin}
                </p>
              </div>
            </div>
            <div className="profile-stats">
              <div>
                <strong style={{ color: getRateColor(advisor.rate) }}>{advisor.rate}%</strong>
                <span>verified actions</span>
              </div>
              <div>
                <strong>{advisor.cases}</strong>
                <span>cases handled</span>
              </div>
              <div>
                <strong>{advisor.rating}★</strong>
                <span>{advisor.reviewCount} reviews</span>
              </div>
              <div>
                <strong>{advisor.reply}</strong>
                <span>avg. reply time</span>
              </div>
            </div>
          </section>

          <section className="app-card profile-bio-card">
            <h2 className="profile-bio-card__heading">About</h2>
            <p className="profile-bio-card__text">{advisor.bio}</p>
            <div className="profile-languages">
              <span className="profile-languages__label">Languages</span>
              <div className="profile-languages__chips">
                {advisor.languages.map(lang => (
                  <span className="language-chip" key={lang}>
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="app-card chain-card">
            <div className="chain-card__title">
              <span className="verified-dot" />
              <span>CREDENTIALS VERIFIED ON-CHAIN</span>
            </div>
            <div className="verify-checklist">
              <div className="verify-item">
                <span className="verify-item__icon">✓</span>
                <div>
                  <strong>Licence is active</strong>
                  <p>
                    We checked the IAA register right now. {advisor.name} is licensed and legally allowed to give
                    immigration advice in New Zealand.
                  </p>
                </div>
              </div>
              <div className="verify-item">
                <span className="verify-item__icon">✓</span>
                <div>
                  <strong>No complaints on record</strong>
                  <p>The IAA complaints register shows no current disciplinary action against this adviser.</p>
                </div>
              </div>
              <div className="verify-item">
                <span className="verify-item__icon">✓</span>
                <div>
                  <strong>Identity matches the register</strong>
                  <p>Name and licence number match the IAA public register exactly — this is the same person.</p>
                </div>
              </div>
            </div>
            <div className="chain-card__proof">
              <span className="chain-card__proof-label">Technical proof (for your records)</span>
              <div className="hash-list">
                <span>licence check {advisor.hash1} ✓</span>
                <span>agreement hash {advisor.hash2} ✓</span>
              </div>
            </div>
          </section>

          <section className="app-card reviews-card">
            <h2>What clients say</h2>
            <div>
              {reviews.map(review => (
                <article key={`${review.who}-${review.text}`}>
                  <div>
                    <strong>{review.who}</strong>
                    <span>{review.stars}</span>
                  </div>
                  <p>{review.text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="app-card pricing-card">
          <h2>Pricing</h2>
          <p>
            No upfront price. After your consultation, {advisor.first} sends you an invoice — you approve it before any
            money moves.
          </p>
          <h3>Paid in 3 protected steps:</h3>
          <ol>
            <li>1 · Consultation</li>
            <li>2 · Application lodged</li>
            <li>3 · INZ outcome letter uploaded</li>
          </ol>
          <button className="app-primary-button app-primary-button--wide" type="button" onClick={goToAgreement}>
            Request a consultation
          </button>
          <small>🔒 You pay nothing today. Money goes into escrow only after you approve the invoice.</small>
        </aside>
      </div>
    </div>
  );
};

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
          <span>IAA Licence · verified {advisor.hash1}</span>
        </div>
        <div>
          <span className="legal-doc__party-label">CLIENT</span>
          <strong>You (the applicant)</strong>
          <span>Identity verified via Privy</span>
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
        does not guarantee a visa outcome — INZ retains sole discretion over all decisions.
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
      <p>
        No amount is payable to the adviser until the corresponding milestone has been completed and verified. The
        escrow contract enforces this automatically — AdVisa has no discretion to release funds early.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>4. Lodgement Deadline &amp; Automatic Refund</h3>
      <p>
        The adviser must lodge the visa application within{" "}
        <strong>{advisor.agreement.validityDays} calendar days</strong> of the date both parties sign this agreement. If
        lodgement has not occurred by that deadline, any escrow balance not yet released under clause 3 will be
        automatically returned to the client&apos;s wallet without any action required from either party. The escrow
        smart contract enforces this condition on-chain — it cannot be overridden by the adviser or by AdVisa.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>5. Cancellation &amp; Withdrawal</h3>
      <p>
        The client may cancel this agreement at any time by written notice. Milestone tranches already released under
        clause 3 are non-refundable. Tranches not yet released remain in escrow and are returned to the client
        automatically on cancellation. The adviser may withdraw from the engagement with seven days&apos; written
        notice; in that event, all unreleased escrow funds are returned to the client immediately.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>6. Code of Conduct</h3>
      <p>
        {advisor.name} is bound by the Immigration Advisers Code of Conduct 2014. The client has the right to complain
        to the Immigration Advisers Authority (IAA) if they believe the adviser has breached the Code. AdVisa is a
        payment and verification platform only — it is not an immigration advice service and does not supervise or
        endorse the advice given by the adviser.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>7. Electronic Execution</h3>
      <p>
        This agreement is executed electronically via Lumin Sign. Each party&apos;s electronic signature carries the
        same legal effect as a handwritten signature under the Contract and Commercial Law Act 2017. The SHA-256 hash of
        the signed document is recorded on the Base Sepolia blockchain by AdVisa&apos;s relayer within 60 seconds of
        both parties signing, providing an immutable timestamp and proof of content.
      </p>
    </div>
  </div>
);

const AgreementScreen = ({
  advisor,
  goBack,
  goToPay,
}: {
  advisor: Advisor;
  goBack: () => void;
  goToPay: () => void;
}) => {
  const milestones = getMilestones(advisor);
  const [signState, setSignState] = useState<SignState>("review");
  const docRef = useRef<HTMLDivElement>(null);

  const handleSign = () => {
    setSignState("signing");
    setTimeout(() => setSignState("signed"), 2200);
  };

  return (
    <div className="app-screen app-screen--agreement">
      <button className="back-button" type="button" onClick={goBack}>
        ← Back to {advisor.first}&apos;s profile
      </button>

      <div className="agreement-header">
        <div>
          <h1>Fee Agreement</h1>
          <p className="agreement-header__sub">
            {advisor.specialty} visa · with {advisor.name}
          </p>
        </div>
        {signState === "signed" && (
          <div className="chain-badge chain-badge--small">
            <span className="verified-dot" />
            HASH ANCHORED ON-CHAIN
          </div>
        )}
      </div>

      {/* Scrollable legal document */}
      <section className="app-card agreement-doc-card">
        <div className="agreement-doc-card__header">
          <span className="agreement-doc-card__label">LEGAL DOCUMENT</span>
          <span className="agreement-doc-card__hint">Scroll to read ↓</span>
        </div>
        <div className="agreement-doc-scroll" ref={docRef}>
          <LegalDocument advisor={advisor} milestones={milestones} />
        </div>
      </section>

      {/* AI plain language summary */}
      <section className="app-card agreement-summary-card">
        <div className="agreement-summary-card__eyebrow">
          <span className="verified-dot" />
          PLAIN LANGUAGE SUMMARY · AI EXTRACTED
        </div>
        <p className="agreement-summary-card__text">{advisor.agreement.plainSummary}</p>
        {advisor.agreement.redFlags.length === 0 ? (
          <div className="agreement-no-flags">
            <span>✓</span>
            No red flags detected — standard milestone-based fee structure.
          </div>
        ) : (
          <ul className="agreement-flags-list">
            {advisor.agreement.redFlags.map(flag => (
              <li key={flag}>⚠ {flag}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Payment schedule */}
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

      {/* Signing panel */}
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
                  Both you and {advisor.first} have signed. This document is now locked — it cannot be changed by
                  anyone, including us.
                </p>
                <div className="signed-meta">
                  <span>Lumin ref: LMN-{advisor.hash2.slice(2, 6).toUpperCase()}-2026</span>
                  <span>·</span>
                  <span>
                    Hash {advisor.hash2} anchored ·{" "}
                    {new Date().toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
            <button className="app-primary-button app-primary-button--wide" type="button" onClick={goToPay}>
              Fund escrow →
            </button>
            <p className="agreement-actions__sub">
              Agreement locked. Funds go to escrow — not to {advisor.first} — until each milestone is verified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentScreen = ({
  advisor,
  method,
  setMethod,
  goBack,
  confirm,
}: {
  advisor: Advisor;
  method: PaymentMethod;
  setMethod: (method: PaymentMethod) => void;
  goBack: () => void;
  confirm: () => void;
}) => {
  const milestones = getMilestones(advisor);

  return (
    <div className="app-screen app-screen--payment">
      <button className="back-button" type="button" onClick={goBack}>
        ← Back to fee agreement
      </button>
      <h1>Fund Escrow</h1>
      <p className="payment-intro">
        You&apos;ve approved the invoice. {formatMoney(advisor.fee)} goes into escrow held by AdVisa — not to{" "}
        {advisor.first}. Funds release only as milestones are completed.
      </p>

      <section className="app-card payment-card">
        <h2>Escrow breakdown</h2>
        <div className="release-list">
          <div>
            <span>1</span>
            <p>Consultation — released immediately on funding</p>
            <strong>{formatMoney(milestones.consultation)}</strong>
          </div>
          <div>
            <span>2</span>
            <p>Application lodged with INZ</p>
            <strong>{formatMoney(milestones.filing)}</strong>
          </div>
          <div>
            <span>3</span>
            <p>INZ outcome letter uploaded</p>
            <strong>{formatMoney(milestones.decision)}</strong>
          </div>
        </div>
      </section>

      <section className="app-card payment-card payment-method-card">
        <h2>How would you like to pay?</h2>
        <div className="payment-methods" role="radiogroup" aria-label="Payment method">
          <button
            className={method === "card" ? "payment-method payment-method--active" : "payment-method"}
            type="button"
            role="radio"
            aria-checked={method === "card"}
            onClick={() => setMethod("card")}
          >
            <strong>💳 Card or bank</strong>
            <span>Pay like any normal purchase. We handle the rest for you.</span>
          </button>
          <button
            className={method === "crypto" ? "payment-method payment-method--active" : "payment-method"}
            type="button"
            role="radio"
            aria-checked={method === "crypto"}
            onClick={() => setMethod("crypto")}
          >
            <strong>🔗 Crypto wallet</strong>
            <span>Connect your wallet and pay dNZD directly into the escrow contract.</span>
          </button>
        </div>
      </section>

      <button className="app-primary-button app-primary-button--payment" type="button" onClick={confirm}>
        Pay {formatMoney(advisor.fee)} into escrow
      </button>
      <div className="payment-reassurance">
        <span>🔒 Held safely until work is done</span>
        <span>↩ Auto-refund if deadline missed</span>
      </div>
    </div>
  );
};

const CaseScreen = ({ advisor, paid, goToMarket }: { advisor: Advisor; paid: boolean; goToMarket: () => void }) => {
  if (!paid) {
    return (
      <div className="app-screen empty-case">
        <h1>No case yet</h1>
        <p>Choose an adviser and your engagement will appear here.</p>
        <button className="app-primary-button" type="button" onClick={goToMarket}>
          Find an adviser
        </button>
      </div>
    );
  }

  const milestones = getMilestones(advisor);

  return (
    <div className="app-screen app-screen--case">
      <div className="case-heading">
        <div>
          <h1>Your engagement</h1>
          <p>
            {advisor.specialty} visa · {advisor.countries} · with {advisor.name}
          </p>
        </div>
        <span>In progress · step 2 of 3</span>
      </div>
      <div className="case-layout">
        <div className="case-main">
          <section className="app-card progress-card">
            <h2>Progress</h2>
            <div className="timeline">
              <div className="timeline__item">
                <div className="timeline__rail">
                  <span className="timeline__dot timeline__dot--done">✓</span>
                  <span className="timeline__line timeline__line--done" />
                </div>
                <div>
                  <strong>Consultation done</strong>
                  <p>
                    You met {advisor.first} on July 21 and agreed the plan. {formatMoney(milestones.consultation)}{" "}
                    released.
                  </p>
                </div>
              </div>
              <div className="timeline__item">
                <div className="timeline__rail">
                  <span className="timeline__dot timeline__dot--current">2</span>
                  <span className="timeline__line" />
                </div>
                <div>
                  <strong>Application lodgement — happening now</strong>
                  <p>{advisor.first} is preparing your documents. Nothing needed from you right now.</p>
                </div>
              </div>
              <div className="timeline__item timeline__item--future">
                <div className="timeline__rail">
                  <span className="timeline__dot timeline__dot--future">3</span>
                </div>
                <div>
                  <strong>INZ outcome letter</strong>
                  <p>Funds move when the adviser uploads the INZ outcome letter.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="app-card updates-card">
            <h2>Latest updates</h2>
            <div>
              <p>
                <time>Jul 25</time>
                <span>{advisor.first} uploaded your draft application for review.</span>
              </p>
              <p>
                <time>Jul 23</time>
                <span>Employment letter received and checked. ✓</span>
              </p>
              <p>
                <time>Jul 21</time>
                <span>Consultation completed. {formatMoney(milestones.consultation)} released from escrow.</span>
              </p>
            </div>
          </section>
        </div>

        <aside className="case-sidebar">
          <section className="case-escrow-card">
            <div className="dark-eyebrow">YOUR ESCROW · {formatMoney(advisor.fee)}</div>
            <div className="case-milestones">
              <div>
                <span className="milestone-check milestone-check--gradient">✓</span>
                Consultation · {formatMoney(milestones.consultation)} released
              </div>
              <div>
                <span className="milestone-empty" />
                Filing · {formatMoney(milestones.filing)} held
              </div>
              <div>
                <span className="milestone-empty" />
                Outcome letter · {formatMoney(milestones.decision)} held
              </div>
            </div>
            <div className="case-progress">
              <span />
            </div>
            <p>
              {formatMoney(milestones.consultation)} of {formatMoney(advisor.fee)} released so far
            </p>
            <div className="case-contract">escrow contract {advisor.hash2} ✓</div>
          </section>
          <section className="app-card case-advisor-card">
            <div>
              <Avatar size="small" />
              <p>
                <strong>{advisor.name}</strong>
                <span>● Usually replies in {advisor.reply}</span>
              </p>
            </div>
            <button className="secondary-button secondary-button--wide" type="button">
              Message {advisor.first}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
};

const ReceiptScreen = ({
  advisor,
  method,
  goToCase,
}: {
  advisor: Advisor;
  method: PaymentMethod;
  goToCase: () => void;
}) => {
  const milestones = getMilestones(advisor);
  const txHash = `0x${advisor.hash1.slice(2, 6)}…${advisor.hash2.slice(-4)}`;
  const date = new Date().toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="app-screen app-screen--receipt">
      <div className="receipt-badge">
        <span className="receipt-badge__icon">✓</span>
        <div>
          <strong>Payment confirmed — your money is in escrow</strong>
          <p>
            {formatMoney(advisor.fee)} is now held safely by AdVisa. {advisor.first} cannot access it until each step of
            your case is completed.
          </p>
        </div>
      </div>

      <section className="app-card receipt-card">
        <div className="receipt-card__eyebrow">PAYMENT RECEIPT · {date}</div>
        <div className="receipt-row">
          <span>Adviser</span>
          <strong>{advisor.name}</strong>
        </div>
        <div className="receipt-row">
          <span>Visa type</span>
          <strong>{advisor.agreement.visaType}</strong>
        </div>
        <div className="receipt-row">
          <span>Total deposited into escrow</span>
          <strong>{formatMoney(advisor.fee)}</strong>
        </div>
        <div className="receipt-divider" />
        <div className="receipt-row">
          <span>Released now — consultation confirmed</span>
          <strong className="receipt-row__released">{formatMoney(milestones.consultation)}</strong>
        </div>
        <div className="receipt-row receipt-row--held">
          <span>Protected in escrow until next milestone</span>
          <strong>{formatMoney(advisor.fee - milestones.consultation)}</strong>
        </div>
      </section>

      <section className="app-card receipt-card">
        <div className="receipt-card__eyebrow">TRANSACTION DETAILS</div>
        <div className="receipt-row">
          <span>Transaction</span>
          <strong className="receipt-mono">{txHash}</strong>
        </div>
        <div className="receipt-row">
          <span>Escrow contract</span>
          <strong className="receipt-mono">{advisor.hash2}</strong>
        </div>
        <div className="receipt-row">
          <span>Payment method</span>
          <strong>{method === "card" ? "Card / bank transfer" : "Crypto wallet (dNZD)"}</strong>
        </div>
        <div className="receipt-row">
          <span>Network</span>
          <strong>Base Sepolia</strong>
        </div>
      </section>

      <section className="app-card receipt-card">
        <h2>What happens next</h2>
        <ol className="receipt-steps">
          <li>
            <span>1</span>
            <div>
              <strong>{advisor.first} books your consultation</strong>
              <p>
                You&apos;ll hear from them within {advisor.reply}. {formatMoney(milestones.consultation)} is released
                when your consultation happens — you do not need to do anything.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Application lodged with INZ</strong>
              <p>
                {advisor.first} prepares and submits your application. {formatMoney(milestones.filing)} releases
                automatically when they upload the INZ lodgement receipt.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>INZ decision received</strong>
              <p>
                When INZ issues a decision, {advisor.first} uploads the letter. The final{" "}
                {formatMoney(milestones.decision)} releases automatically. If the deadline is missed, all remaining
                funds return to you.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <button className="app-primary-button app-primary-button--payment" type="button" onClick={goToCase}>
        Go to My Case →
      </button>
      <div className="payment-reassurance">
        <span>🔒 Your money cannot move without a verified milestone</span>
      </div>
    </div>
  );
};

const AdvisorsPage = () => {
  const { logout, user } = usePrivy();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("market");
  const [filter, setFilter] = useState("All");
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paid, setPaid] = useState(false);

  const displayEmail =
    user?.google?.email ?? user?.email?.address ?? (user?.phone?.number ? user.phone.number : null) ?? "Account";

  const handleSignOut = async () => {
    setPaid(false);
    setScreen("market");
    await logout();
    router.push("/");
  };

  const filteredAdvisors = advisors.filter(advisor => filter === "All" || advisor.specialty === filter);
  const selectedAdvisor = advisors[selectedIndex];
  const showMarketTab = screen !== "case" && screen !== "receipt";

  const openAdvisor = (advisor: Advisor) => {
    setSelectedIndex(advisors.indexOf(advisor));
    setScreen("profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeScreen = (nextScreen: Screen) => {
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="advisors-app">
      <header className="app-topbar">
        <button className="advisa-logo app-logo-button" type="button" onClick={() => changeScreen("market")}>
          <span className="advisa-logo__mark">A</span>
          <span className="advisa-logo__word">Advisa</span>
        </button>
        <nav aria-label="Application navigation">
          <button
            className={showMarketTab ? "app-tab app-tab--active" : "app-tab"}
            type="button"
            onClick={() => changeScreen("market")}
          >
            Find advisers
          </button>
          <button
            className={screen === "case" || screen === "receipt" ? "app-tab app-tab--active" : "app-tab"}
            type="button"
            onClick={() => changeScreen("case")}
          >
            My case
          </button>
        </nav>
        <div className="app-topbar__help">
          <span>{displayEmail}</span>
          <Avatar size="small" />
          <button className="app-signout-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {screen === "market" && (
        <div className="app-screen app-screen--market">
          <h1>Find your immigration adviser</h1>
          <p className="market-intro">
            Every listed adviser starts with a live licence check. Choose the one that fits your visa category and
            budget, then keep payment protected in escrow.
          </p>
          <div className="filter-list" aria-label="Filter by visa type">
            {filters.map(item => (
              <button
                className={filter === item ? "filter-chip filter-chip--active" : "filter-chip"}
                type="button"
                key={item}
                onClick={() => setFilter(item)}
              >
                {item === "All" ? "All visas" : item}
              </button>
            ))}
          </div>
          <div className="market-meta">
            <span>{filteredAdvisors.length} advisers · sorted by verified activity</span>
            <div className="chain-badge chain-badge--small">
              <span className="verified-dot" />
              HASHES AND EVENTS ANCHORED ON-CHAIN
            </div>
          </div>
          <div className="market-grid">
            {filteredAdvisors.map(advisor => (
              <AdvisorCard advisor={advisor} onOpen={() => openAdvisor(advisor)} key={advisor.name} />
            ))}
          </div>
        </div>
      )}

      {screen === "profile" && (
        <ProfileScreen
          advisor={selectedAdvisor}
          goBack={() => changeScreen("market")}
          goToAgreement={() => changeScreen("agreement")}
        />
      )}
      {screen === "agreement" && (
        <AgreementScreen
          advisor={selectedAdvisor}
          goBack={() => changeScreen("profile")}
          goToPay={() => changeScreen("pay")}
        />
      )}
      {screen === "pay" && (
        <PaymentScreen
          advisor={selectedAdvisor}
          method={paymentMethod}
          setMethod={setPaymentMethod}
          goBack={() => changeScreen("agreement")}
          confirm={() => {
            setPaid(true);
            changeScreen("receipt");
          }}
        />
      )}
      {screen === "receipt" && (
        <ReceiptScreen advisor={selectedAdvisor} method={paymentMethod} goToCase={() => changeScreen("case")} />
      )}
      {screen === "case" && (
        <CaseScreen advisor={selectedAdvisor} paid={paid} goToMarket={() => changeScreen("market")} />
      )}
    </div>
  );
};

export default AdvisorsPage;
