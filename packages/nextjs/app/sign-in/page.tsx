"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { NextPage } from "next";
import { AdvisaLogo } from "~~/components/advisa/AdvisaLogo";

type Role = "migrant" | "adviser";

const SignInPage: NextPage = () => {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [role, setRole] = useState<Role>("migrant");

  useEffect(() => {
    if (ready && authenticated) router.replace("/advisors");
  }, [ready, authenticated, router]);

  return (
    <div className="signin-page">
      <header className="signin-nav">
        <AdvisaLogo />
        <Link className="signin-nav__back" href="/">
          ← Back to home
        </Link>
      </header>

      <main className="signin-main">
        <div className="signin-card">
          <p className="signin-eyebrow">SIGN IN TO AdVisa</p>
          <h1 className="signin-heading">How are you using AdVisa?</h1>

          {/* Role toggle */}
          <div className="signin-toggle" role="tablist" aria-label="Select role">
            <button
              className={role === "migrant" ? "signin-toggle__btn signin-toggle__btn--active" : "signin-toggle__btn"}
              type="button"
              role="tab"
              aria-selected={role === "migrant"}
              onClick={() => setRole("migrant")}
            >
              Migrant
            </button>
            <button
              className={role === "adviser" ? "signin-toggle__btn signin-toggle__btn--active" : "signin-toggle__btn"}
              type="button"
              role="tab"
              aria-selected={role === "adviser"}
              onClick={() => setRole("adviser")}
            >
              Licensed Adviser
            </button>
          </div>

          {/* Migrant panel */}
          {role === "migrant" && (
            <div className="signin-panel signin-panel--migrant" role="tabpanel">
              <div className="chain-badge chain-badge--small">
                <span className="verified-dot" />
                MIGRANTS &amp; VISA APPLICANTS
              </div>
              <h2 className="signin-panel__title">Find a verified adviser and protect your payment.</h2>
              <p className="signin-panel__copy">
                Compare licensed advisers by real acceptance rates, book a consultation, and pay into escrow — so your
                money only moves when your case does.
              </p>
              <ul className="signin-trust-list">
                <li>
                  <span className="signin-trust-check">✓</span>
                  Adviser licence verified live against the IAA register
                </li>
                <li>
                  <span className="signin-trust-check">✓</span>
                  Fee agreement signed and hash anchored on-chain
                </li>
                <li>
                  <span className="signin-trust-check">✓</span>
                  Funds held in escrow — released only on milestones you approve
                </li>
              </ul>
              <button className="pill-button signin-panel__cta" type="button" onClick={login}>
                Continue as migrant →
              </button>
              <p className="signin-panel__sub">Sign in with email, Google, or phone. No wallet needed.</p>
            </div>
          )}

          {/* Adviser panel */}
          {role === "adviser" && (
            <div className="signin-panel signin-panel--adviser" role="tabpanel">
              <div className="chain-badge chain-badge--small chain-badge--dark">
                <span className="verified-dot verified-dot--light" />
                LICENSED ADVISERS
              </div>
              <h2 className="signin-panel__title signin-panel__title--light">
                Manage clients and receive milestone payments.
              </h2>
              <p className="signin-panel__copy signin-panel__copy--light">
                The adviser portal lets you onboard clients, upload milestone evidence, and receive escrow payments as
                you complete each step of the case.
              </p>
              <ul className="signin-trust-list signin-trust-list--dark">
                <li>
                  <span className="signin-trust-check signin-trust-check--dark">✓</span>
                  Your IAA licence number linked to your profile
                </li>
                <li>
                  <span className="signin-trust-check signin-trust-check--dark">✓</span>
                  Accept fee agreements and have clients fund escrow
                </li>
                <li>
                  <span className="signin-trust-check signin-trust-check--dark">✓</span>
                  Milestone payments released automatically on verified uploads
                </li>
              </ul>
              <div className="signin-coming-soon">
                <span className="signin-coming-badge">Coming soon</span>
                <p>Adviser onboarding is in private beta. Enter your details and we&apos;ll be in touch.</p>
                <button className="pill-button signin-panel__cta signin-panel__cta--outline" type="button" disabled>
                  Join the waitlist
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
