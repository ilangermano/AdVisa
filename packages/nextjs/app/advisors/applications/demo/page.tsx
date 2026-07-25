"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "~~/components/advisa/Avatar";
import { type Advisor, formatMoney, getAdvisorBySlug, getMilestones } from "~~/components/advisa/advisors";
import { useAdvisa } from "~~/contexts/AdvisaContext";

export default function DemoCasePage() {
  const { paid, paidSlug } = useAdvisa();
  const router = useRouter();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);

  useEffect(() => {
    const slug = paidSlug || localStorage.getItem("advisa_paid_slug") || "";
    const found = getAdvisorBySlug(slug);
    if (found) {
      setAdvisor(found);
    } else if (!paid) {
      router.replace("/advisors/applications");
    }
  }, [paid, paidSlug, router]);

  if (!advisor) {
    return (
      <div className="app-screen empty-case">
        <h1>No case yet</h1>
        <p>Complete a payment flow to see your case here.</p>
        <Link className="app-primary-button" href="/advisors">
          Find an adviser
        </Link>
      </div>
    );
  }

  const milestones = getMilestones(advisor);

  return (
    <div className="app-screen app-screen--case">
      <Link className="back-button" href="/advisors/applications">
        ← Back to My Applications
      </Link>
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
                  <strong>Application lodgement · happening now</strong>
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
}
