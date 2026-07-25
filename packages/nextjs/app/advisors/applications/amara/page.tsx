"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "~~/components/advisa/Avatar";
import { advisors, formatMoney, getMilestones } from "~~/components/advisa/advisors";
import { useAdvisa } from "~~/contexts/AdvisaContext";

const seededAdvisor = advisors[1];
const seededMilestones = getMilestones(seededAdvisor);

export default function AmaraPage() {
  const { seededApproved, setSeededApproved } = useAdvisa();
  const [approving, setApproving] = useState(false);

  const handleApprove = () => {
    setApproving(true);
    setTimeout(() => {
      setSeededApproved(true);
      setApproving(false);
    }, 1600);
  };

  return (
    <div className="app-screen app-screen--case">
      <Link className="back-button" href="/advisors/applications">
        ← Back to My Applications
      </Link>
      <div className="case-heading">
        <div>
          <h1>Your engagement</h1>
          <p>
            {seededAdvisor.specialty} visa · {seededAdvisor.countries} · with {seededAdvisor.name}
          </p>
        </div>
        <span
          className={
            seededApproved ? "case-status-badge case-status-badge--ok" : "case-status-badge case-status-badge--action"
          }
        >
          {seededApproved ? "Step 2 approved ✓" : "Action needed · step 2 of 3"}
        </span>
      </div>

      {!seededApproved && (
        <div className="seeded-approval-banner">
          <div className="seeded-approval-banner__icon">!</div>
          <div>
            <strong>Amara has lodged your application — your approval is needed</strong>
            <p>
              Amara uploaded the INZ lodgement receipt on 25 Jul. Review the document below, then approve to release{" "}
              {formatMoney(seededMilestones.filing)} from escrow.
            </p>
          </div>
        </div>
      )}

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
                    You met {seededAdvisor.first} on 18 Jul and agreed the plan.{" "}
                    {formatMoney(seededMilestones.consultation)} released.
                  </p>
                </div>
              </div>
              <div className="timeline__item">
                <div className="timeline__rail">
                  <span
                    className={
                      seededApproved ? "timeline__dot timeline__dot--done" : "timeline__dot timeline__dot--action"
                    }
                  >
                    {seededApproved ? "✓" : "!"}
                  </span>
                  <span className={seededApproved ? "timeline__line timeline__line--done" : "timeline__line"} />
                </div>
                <div>
                  <strong>Application lodged with INZ</strong>
                  {seededApproved ? (
                    <p>
                      Lodgement receipt verified. {formatMoney(seededMilestones.filing)} released to{" "}
                      {seededAdvisor.first}.
                    </p>
                  ) : (
                    <p>
                      Amara uploaded the INZ lodgement receipt on 25 Jul.{" "}
                      <strong className="timeline__action-needed">
                        Your approval needed to release {formatMoney(seededMilestones.filing)}.
                      </strong>
                    </p>
                  )}
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

          {!seededApproved && (
            <section className="app-card seeded-approve-panel">
              <div className="seeded-approve-panel__eyebrow">MILESTONE 2 — APPROVAL REQUIRED</div>
              <div className="seeded-approve-panel__doc">
                <div className="seeded-approve-panel__doc-icon">📄</div>
                <div>
                  <strong>INZ Lodgement Receipt</strong>
                  <p>Uploaded by {seededAdvisor.first} · 25 Jul 2026 · PDF, 84 KB</p>
                </div>
                <button className="secondary-button" type="button">
                  View document
                </button>
              </div>
              {approving ? (
                <div className="pay-processing" style={{ padding: "28px 0 8px" }}>
                  <div className="pay-processing__spinner" aria-hidden="true" />
                  <strong>Releasing {formatMoney(seededMilestones.filing)}…</strong>
                </div>
              ) : (
                <>
                  <button className="app-primary-button app-primary-button--wide" type="button" onClick={handleApprove}>
                    Approve &amp; release {formatMoney(seededMilestones.filing)} →
                  </button>
                  <p className="agreement-actions__sub">
                    Once approved, {formatMoney(seededMilestones.filing)} is released to {seededAdvisor.first} and your
                    remaining {formatMoney(seededMilestones.decision)} stays protected until the final outcome.
                  </p>
                </>
              )}
            </section>
          )}

          <section className="app-card updates-card">
            <h2>Latest updates</h2>
            <div>
              <p>
                <time>Jul 25</time>
                <span>INZ lodgement receipt uploaded. Awaiting your approval.</span>
              </p>
              <p>
                <time>Jul 22</time>
                <span>All documents reviewed and application submitted to INZ.</span>
              </p>
              <p>
                <time>Jul 18</time>
                <span>Consultation completed. {formatMoney(seededMilestones.consultation)} released from escrow.</span>
              </p>
            </div>
          </section>
        </div>

        <aside className="case-sidebar">
          <section className="case-escrow-card">
            <div className="dark-eyebrow">YOUR ESCROW · {formatMoney(seededAdvisor.fee)}</div>
            <div className="case-milestones">
              <div>
                <span className="milestone-check milestone-check--gradient">✓</span>
                Consultation · {formatMoney(seededMilestones.consultation)} released
              </div>
              <div>
                {seededApproved ? (
                  <span className="milestone-check milestone-check--gradient">✓</span>
                ) : (
                  <span className="milestone-empty milestone-empty--action">!</span>
                )}
                Filing · {formatMoney(seededMilestones.filing)} {seededApproved ? "released" : "awaiting approval"}
              </div>
              <div>
                <span className="milestone-empty" />
                Outcome · {formatMoney(seededMilestones.decision)} held
              </div>
            </div>
            <div className="case-progress">
              <span style={{ width: seededApproved ? "66%" : "33%" }} />
            </div>
            <p>
              {seededApproved
                ? `${formatMoney(seededMilestones.consultation + seededMilestones.filing)} of ${formatMoney(seededAdvisor.fee)} released so far`
                : `${formatMoney(seededMilestones.consultation)} of ${formatMoney(seededAdvisor.fee)} released so far`}
            </p>
            <div className="case-contract">escrow contract {seededAdvisor.hash2} ✓</div>
          </section>
          <section className="app-card case-advisor-card">
            <div>
              <Avatar size="small" />
              <p>
                <strong>{seededAdvisor.name}</strong>
                <span>● Usually replies in {seededAdvisor.reply}</span>
              </p>
            </div>
            <button className="secondary-button secondary-button--wide" type="button">
              Message {seededAdvisor.first}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
