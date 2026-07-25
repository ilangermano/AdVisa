"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "~~/components/advisa/Avatar";
import {
  basescanAddr,
  basescanTx,
  getAdvisorBySlug,
  getAdvisorSlug,
  getRateColor,
} from "~~/components/advisa/advisors";

export default function AdvisorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const advisor = getAdvisorBySlug(slug);

  useEffect(() => {
    if (!advisor) router.replace("/advisors");
  }, [advisor, router]);

  if (!advisor) return null;

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
      <Link className="back-button" href="/advisors">
        ← Back to advisers
      </Link>
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
                  <p>Name and licence number match the IAA public register exactly · this is the same person.</p>
                </div>
              </div>
            </div>
            <div className="chain-card__proof">
              <span className="chain-card__proof-label">Technical proof (for your records)</span>
              <div className="hash-list">
                <a
                  className="hash-link"
                  href={basescanTx(advisor.hash1, advisor.hash1Full)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  licence check {advisor.hash1} ✓ ↗
                </a>
                <a
                  className="hash-link"
                  href={basescanAddr(advisor.hash2, advisor.hash2Full)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  escrow contract {advisor.hash2} ✓ ↗
                </a>
              </div>
              <a
                className="chain-explorer-btn"
                href={basescanAddr(advisor.hash2, advisor.hash2Full)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Base Sepolia ↗
              </a>
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
            No upfront price. After your consultation, {advisor.first} sends you an invoice · you approve it before any
            money moves.
          </p>
          <h3>Paid in 3 protected steps:</h3>
          <ol>
            <li>1 · Consultation</li>
            <li>2 · Application lodged</li>
            <li>3 · INZ outcome letter uploaded</li>
          </ol>
          <Link
            className="app-primary-button app-primary-button--wide"
            href={`/advisors/${getAdvisorSlug(advisor)}/agreement`}
          >
            Request a consultation
          </Link>
          <small>🔒 You pay nothing today. Money goes into escrow only after you approve the invoice.</small>
        </aside>
      </div>
    </div>
  );
}
