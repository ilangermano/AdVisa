"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { advisors, formatMoney, getMilestones } from "~~/components/advisa/advisors";
import { useAdvisa } from "~~/contexts/AdvisaContext";

const seededAdvisor = advisors[1];
const seededMilestones = getMilestones(seededAdvisor);

export default function AccountPage() {
  const { user } = usePrivy();
  const { paid, paidSlug } = useAdvisa();

  const initialEmail =
    user?.google?.email ?? user?.email?.address ?? (user?.phone?.number ? user.phone.number : null) ?? "";

  const [name, setName] = useState("Your Name");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [walletEmail, setWalletEmail] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initials =
    name
      .split(" ")
      .map(w => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div className="app-screen app-screen--user-profile">
      <Link className="back-button" href="/advisors">
        ← Back
      </Link>

      <section className="app-card user-section">
        <div className="profile-hero">
          <span className="profile-initials-avatar">{initials}</span>
          <div>
            <h1>{name || "Your Name"}</h1>
            <p>{email || "No email set"}</p>
          </div>
        </div>
      </section>

      <section className="app-card user-section">
        <h2>Personal information</h2>
        <div className="user-form">
          <div className="pay-field">
            <label className="pay-label">Full name</label>
            <input className="pay-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="pay-field">
            <label className="pay-label">Email address</label>
            <input
              className="pay-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          <div className="pay-field">
            <label className="pay-label">Phone number</label>
            <input
              className="pay-input"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+64 21 000 0000"
            />
          </div>
          <div className="pay-field">
            <label className="pay-label">Wallet email (for crypto payments)</label>
            <input
              className="pay-input"
              type="email"
              value={walletEmail}
              onChange={e => setWalletEmail(e.target.value)}
              placeholder="wallet@email.com"
            />
          </div>
          <button className="app-primary-button" type="button" onClick={handleSave}>
            {saved ? "Saved ✓" : "Save changes"}
          </button>
        </div>
      </section>

      <section className="app-card user-section">
        <h2>Payment methods</h2>
        <div className="saved-methods">
          <div className="saved-method">
            <div className="saved-method__icon">💳</div>
            <div>
              <strong>Visa ending 4242</strong>
              <span>Expires 12 / 26</span>
            </div>
            <span className="saved-method__badge">Default</span>
          </div>
          <div className="saved-method">
            <div className="saved-method__icon">🔗</div>
            <div>
              <strong>Wallet · 0x71C7…3Fd3</strong>
              <span>Base Sepolia · dNZD</span>
            </div>
          </div>
        </div>
        <div className="saved-methods-actions">
          <button className="secondary-button" type="button">
            + Add card
          </button>
          <button className="secondary-button" type="button">
            + Add wallet
          </button>
        </div>
      </section>

      <section className="app-card user-section">
        <h2>Transaction history</h2>
        <div className="transaction-list">
          <div className="transaction-item">
            <div>
              <strong>Escrow deposit · {seededAdvisor.name}</strong>
              <span>18 Jul 2026 · {seededAdvisor.agreement.visaType}</span>
            </div>
            <strong className="transaction-item__amount transaction-item__amount--out">
              −{formatMoney(seededAdvisor.fee)}
            </strong>
          </div>
          <div className="transaction-item">
            <div>
              <strong>Milestone 1 released · Consultation</strong>
              <span>18 Jul 2026 · from escrow to {seededAdvisor.first}</span>
            </div>
            <strong className="transaction-item__amount transaction-item__amount--neutral">
              {formatMoney(seededMilestones.consultation)}
            </strong>
          </div>
          {paid && paidSlug && (
            <div className="transaction-item">
              <div>
                <strong>Escrow deposit · your adviser</strong>
                <span>
                  Today · via {localStorage.getItem("advisa_last_method") === "crypto" ? "dNZD wallet" : "card"}
                </span>
              </div>
              <strong className="transaction-item__amount transaction-item__amount--out">See receipt</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
