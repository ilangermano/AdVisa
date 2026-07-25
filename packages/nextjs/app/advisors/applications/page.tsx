"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "~~/components/advisa/Avatar";
import { advisors, formatMoney, getAdvisorBySlug, getMilestones } from "~~/components/advisa/advisors";
import { useAdvisa } from "~~/contexts/AdvisaContext";

const seededAdvisor = advisors[1];

export default function ApplicationsPage() {
  const { paid, paidSlug, seededApproved } = useAdvisa();
  const [demoAdvisorName, setDemoAdvisorName] = useState<string | null>(null);

  useEffect(() => {
    const slug = paidSlug || localStorage.getItem("advisa_paid_slug") || "";
    const a = getAdvisorBySlug(slug);
    if (a) setDemoAdvisorName(a.name);
  }, [paidSlug]);

  return (
    <div className="app-screen app-screen--applications">
      <h1>My Applications</h1>
      <p className="market-intro">All your active and recent engagements with immigration advisers.</p>

      <div className="applications-list">
        <Link className="app-item" href="/advisors/applications/amara">
          <div className="app-item__left">
            <Avatar size="small" />
            <div>
              <div className="app-item__name-row">
                <strong>{seededAdvisor.name}</strong>
                {!seededApproved && <span className="app-item__notif-badge">Action needed</span>}
              </div>
              <span className="app-item__meta">
                {seededAdvisor.specialty} visa · {seededAdvisor.countries} · {formatMoney(seededAdvisor.fee)}
              </span>
            </div>
          </div>
          <div className="app-item__right">
            <span
              className={
                seededApproved ? "app-status-badge app-status-badge--ok" : "app-status-badge app-status-badge--action"
              }
            >
              {seededApproved ? "Step 2 approved" : "Pending approval"}
            </span>
            <span className="app-item__chevron">›</span>
          </div>
        </Link>

        {paid && (
          <Link className="app-item" href="/advisors/applications/demo">
            <div className="app-item__left">
              <Avatar size="small" />
              <div>
                <div className="app-item__name-row">
                  <strong>{demoAdvisorName ?? "Your adviser"}</strong>
                </div>
                <span className="app-item__meta">Visa application · In progress</span>
              </div>
            </div>
            <div className="app-item__right">
              <span className="app-status-badge app-status-badge--progress">In progress · step 2</span>
              <span className="app-item__chevron">›</span>
            </div>
          </Link>
        )}
      </div>

      <div className="applications-footer">
        <p>Looking for a new adviser?</p>
        <Link className="secondary-button" href="/advisors">
          Browse advisers →
        </Link>
      </div>
    </div>
  );
}
