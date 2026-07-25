"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { basescanAddr, basescanTx, formatMoney, getAdvisorBySlug, getMilestones } from "~~/components/advisa/advisors";

export default function ReceiptPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const advisor = getAdvisorBySlug(slug);
  const [method, setMethod] = useState<"card" | "crypto">("card");

  useEffect(() => {
    if (!advisor) router.replace("/advisors");
  }, [advisor, router]);

  useEffect(() => {
    const stored = localStorage.getItem("advisa_last_method");
    if (stored === "card" || stored === "crypto") setMethod(stored);
  }, []);

  if (!advisor) return null;

  const milestones = getMilestones(advisor);
  const txHash = `0x${advisor.hash1.slice(2, 6)}…${advisor.hash2.slice(-4)}`;
  const date = new Date().toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="app-screen app-screen--receipt">
      <div className="receipt-badge">
        <span className="receipt-badge__icon">✓</span>
        <div>
          <strong>Payment confirmed · your money is in escrow</strong>
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
          <span>Released now · consultation confirmed</span>
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
          <a
            className="receipt-mono hash-link"
            href={basescanTx(advisor.hash1, advisor.hash1Full)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txHash} ↗
          </a>
        </div>
        <div className="receipt-row">
          <span>Escrow contract</span>
          <a
            className="receipt-mono hash-link"
            href={basescanAddr(advisor.hash2, advisor.hash2Full)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {advisor.hash2} ↗
          </a>
        </div>
        <div className="receipt-row">
          <span>Payment method</span>
          <strong>{method === "card" ? "Card / bank transfer" : "Crypto wallet (dNZD)"}</strong>
        </div>
        <div className="receipt-row">
          <span>Network</span>
          <a className="hash-link" href="https://sepolia.basescan.org" target="_blank" rel="noopener noreferrer">
            Base Sepolia ↗
          </a>
        </div>
      </section>

      <section className="app-card receipt-card">
        <h2>What happens next</h2>
        <ol className="receipt-steps">
          <li>
            <span className="receipt-step__done">✓</span>
            <div>
              <strong>Consultation confirmed ✓</strong>
              <p>
                {formatMoney(milestones.consultation)} has been released to {advisor.first} · your consultation is now
                booked. You&apos;ll hear from them within {advisor.reply}.
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
                {formatMoney(milestones.decision)} releases automatically.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <Link className="app-primary-button app-primary-button--payment" href="/advisors/applications">
        Go to My Applications →
      </Link>
      <div className="payment-reassurance">
        <span>🔒 Your money cannot move without a verified milestone</span>
      </div>
    </div>
  );
}
