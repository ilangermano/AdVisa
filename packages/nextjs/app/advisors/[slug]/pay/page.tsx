"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatMoney, getAdvisorBySlug, getAdvisorSlug, getMilestones } from "~~/components/advisa/advisors";
import { useAdvisa } from "~~/contexts/AdvisaContext";

type PaymentMethod = "card" | "crypto";

export default function PayPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const advisor = getAdvisorBySlug(slug);
  const { setPaid, setPaidSlug } = useAdvisa();
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!advisor) router.replace("/advisors");
  }, [advisor, router]);

  if (!advisor) return null;

  const milestones = getMilestones(advisor);

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setPaid(true);
      setPaidSlug(getAdvisorSlug(advisor));
      localStorage.setItem("advisa_last_method", method);
      router.push(`/advisors/${slug}/receipt`);
    }, 1800);
  };

  if (processing) {
    return (
      <div className="app-screen app-screen--payment pay-processing">
        <div className="pay-processing__spinner" aria-hidden="true" />
        <strong>Processing your payment…</strong>
        <p>Sending {formatMoney(advisor.fee)} into escrow on Base Sepolia. This takes just a moment.</p>
      </div>
    );
  }

  return (
    <div className="app-screen app-screen--payment">
      <Link className="back-button" href={`/advisors/${slug}/agreement`}>
        ← Back to fee agreement
      </Link>
      <h1>Fund Escrow</h1>
      <p className="payment-intro">
        You&apos;ve approved the invoice. {formatMoney(advisor.fee)} goes into escrow held by AdVisa · not to{" "}
        {advisor.first}. Funds release only as milestones are completed.
      </p>

      <section className="app-card payment-card">
        <h2>Escrow breakdown</h2>
        <div className="release-list">
          <div>
            <span>1</span>
            <p>Consultation · released on payment</p>
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
            <strong>💳 Credit card</strong>
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

      {method === "card" && (
        <section className="app-card pay-card-form">
          <div className="pay-card-preview">
            <div className="pay-card-preview__top">
              <div className="pay-card-preview__chip" aria-hidden="true" />
              <span className="pay-card-preview__brand">VISA</span>
            </div>
            <div className="pay-card-preview__number">4242&nbsp;&nbsp;4242&nbsp;&nbsp;4242&nbsp;&nbsp;4242</div>
            <div className="pay-card-preview__footer">
              <div>
                <span>CARDHOLDER</span>
                <strong>YOUR NAME</strong>
              </div>
              <div>
                <span>EXPIRES</span>
                <strong>12 / 26</strong>
              </div>
            </div>
          </div>
          <div className="pay-card-fields">
            <div className="pay-field">
              <label className="pay-label">Card number</label>
              <input className="pay-input" defaultValue="4242 4242 4242 4242" />
            </div>
            <div className="pay-field-row">
              <div className="pay-field">
                <label className="pay-label">Expiry</label>
                <input className="pay-input" defaultValue="12 / 26" />
              </div>
              <div className="pay-field">
                <label className="pay-label">CVV</label>
                <input className="pay-input" defaultValue="123" />
              </div>
            </div>
            <div className="pay-field">
              <label className="pay-label">Name on card</label>
              <input className="pay-input" placeholder="Your name" />
            </div>
          </div>
        </section>
      )}

      {method === "crypto" && (
        <section className="app-card pay-crypto-card">
          <div className="pay-crypto-header">
            <div className="pay-crypto-status">
              <span className="pay-crypto-dot" />
              Wallet connected
            </div>
            <span className="pay-crypto-addr">0x71C7…3Fd3</span>
          </div>
          <div className="pay-crypto-amount">
            <span className="pay-crypto-amount__label">Amount to send</span>
            <strong className="pay-crypto-amount__value">{formatMoney(advisor.fee)} dNZD</strong>
            <span className="pay-crypto-amount__sub">1 dNZD = $1.00 NZD · New Zealand dollar stablecoin</span>
          </div>
          <div className="pay-crypto-details">
            <div className="pay-crypto-row">
              <span>Escrow contract</span>
              <strong className="pay-mono">{advisor.hash2}</strong>
            </div>
            <div className="pay-crypto-row">
              <span>Network</span>
              <strong>Base Sepolia</strong>
            </div>
          </div>
        </section>
      )}

      <button className="app-primary-button app-primary-button--payment" type="button" onClick={handlePay}>
        Pay {formatMoney(advisor.fee)} into escrow
      </button>
      <div className="payment-reassurance">
        <span>🔒 Held safely until work is done</span>
        <span>↩ Auto-refund if deadline missed</span>
      </div>
    </div>
  );
}
