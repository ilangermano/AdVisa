import Link from "next/link";
import { AdvisaLogo } from "~~/components/advisa/AdvisaLogo";
import { ParticleGlobe } from "~~/components/advisa/ParticleGlobe";
import { advisors, getRateColor } from "~~/components/advisa/advisors";

const steps = [
  {
    title: "Compare advisors",
    copy: "See each advisor's real acceptance rate, verified case history, and client reviews — side by side.",
  },
  {
    title: "Talk first, free of pressure",
    copy: "Have a consultation before any money moves. Afterwards, your advisor sends a clear invoice.",
  },
  {
    title: "Pay into escrow",
    copy: "Approve the invoice and pay by card or crypto. Advisa holds it — your advisor is paid in steps, not upfront.",
  },
  {
    title: "Track to decision",
    copy: "Follow every milestone on your case dashboard until your visa decision arrives.",
  },
];

const tickerItems = [
  "WORK VISAS",
  "STUDENT VISAS",
  "FAMILY & SPOUSAL",
  "TOURIST",
  "PERMANENT RESIDENCY",
  "CITIZENSHIP",
];

export const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <AdvisaLogo />
        <nav className="landing-nav__links" aria-label="Main navigation">
          <Link href="/advisors">Find an advisor</Link>
          <Link href="#how-it-works">How it works</Link>
          <Link href="#escrow">Escrow</Link>
          <Link href="/advisors">For advisors</Link>
        </nav>
        <div className="landing-nav__actions">
          <Link className="landing-nav__signin" href="/advisors">
            Sign in
          </Link>
          <Link className="pill-button pill-button--small" href="/advisors">
            Get started
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <div className="chain-badge">
              <span className="verified-dot" />
              CREDENTIALS VERIFIED ON-CHAIN
            </div>
            <h1>The right visa advisor, chosen on evidence — not promises.</h1>
            <p>
              Compare licensed advisors by real, independently verified acceptance rates. Talk first, get an invoice,
              and pay into escrow that releases only as your case moves forward.
            </p>
            <div className="landing-hero__actions">
              <Link className="pill-button pill-button--hero" href="/advisors">
                Browse advisors
              </Link>
              <Link className="pill-button pill-button--outline pill-button--hero" href="#how-it-works">
                See how it works
              </Link>
            </div>
          </div>

          <div className="landing-hero__visual" role="img" aria-label="Interactive globe centred on New Zealand">
            <ParticleGlobe />
            <div className="particle-globe__caption" aria-hidden="true">
              <span />
              LICENSED ADVISERS · NEW ZEALAND
            </div>
          </div>
        </section>

        <div className="visa-ticker" aria-label="Visa categories">
          <div className="visa-ticker__track">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <span key={`${item}-${index}`}>
                {item} <i>·</i>
              </span>
            ))}
          </div>
        </div>

        <section className="landing-section" id="how-it-works">
          <div className="section-eyebrow">HOW IT WORKS</div>
          <h2>Four simple steps. Your money stays protected the whole way.</h2>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <article className="step-card" key={step.title}>
                <span className="step-card__number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="featured-section">
          <div className="featured-section__inner">
            <div className="featured-section__heading">
              <div>
                <div className="section-eyebrow">FEATURED ADVISORS</div>
                <h2>Proven track records, in the open.</h2>
              </div>
              <Link className="underlined-link" href="/advisors">
                See all advisors →
              </Link>
            </div>
            <div className="featured-grid">
              {advisors.slice(0, 3).map(advisor => (
                <article className="featured-card" key={advisor.name}>
                  <div className="advisor-identity">
                    <span className="striped-avatar striped-avatar--46" />
                    <div>
                      <div className="advisor-name-row">
                        <strong>{advisor.name}</strong>
                        <span className="verified-chip">✓ Verified</span>
                      </div>
                      <span>
                        {advisor.specialty} visas · {advisor.countries}
                      </span>
                    </div>
                  </div>
                  <div className="featured-card__stats">
                    <div>
                      <strong style={{ color: getRateColor(advisor.rate) }}>{advisor.rate}%</strong>
                      <span>visas approved</span>
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
                  <Link className="profile-outline-button" href="/advisors">
                    View profile
                  </Link>
                </article>
              ))}
            </div>
            <p className="pricing-footnote">
              Pricing is shared by invoice after your consultation — never a surprise fee upfront.
            </p>
          </div>
        </section>

        <section className="escrow-section" id="escrow">
          <div className="escrow-section__inner">
            <div>
              <div className="section-eyebrow section-eyebrow--dark">WHY YOUR MONEY IS SAFE</div>
              <h2>Escrow means nobody gets paid until the work is done.</h2>
              <p>
                When you approve an invoice, your payment goes into a secure escrow account — not to the advisor.
                It&apos;s released in three steps, each one only after you confirm the work happened. If a step never
                happens, that money comes back to you.
              </p>
              <div className="trust-list">
                <div>
                  <span>✓</span>Advisor credentials checked and recorded on a public ledger
                </div>
                <div>
                  <span>✓</span>Acceptance rates computed from real case records — not self-reported
                </div>
                <div>
                  <span>✓</span>Pay by card or crypto — you never need to touch a wallet if you don&apos;t want to
                </div>
              </div>
            </div>
            <div className="contract-card">
              <span className="sweep-line" />
              <div className="contract-card__eyebrow">ESCROW CONTRACT · 0x6d90…b3f4</div>
              <div className="contract-card__rows">
                <div>
                  <span>deposited</span>
                  <strong>$1,800.00</strong>
                </div>
                <div>
                  <span>released</span>
                  <strong>$360.00</strong>
                </div>
                <div>
                  <span>protected</span>
                  <strong>$1,440.00</strong>
                </div>
              </div>
              <div className="contract-card__progress">
                <div>
                  <span />
                </div>
                <small>milestone 1/3</small>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-cta">
          <h2>Start with a conversation, not a payment.</h2>
          <p>Browse verified advisors, book a consultation, and only pay once you&apos;ve approved the invoice.</p>
          <Link className="pill-button pill-button--cta" href="/advisors">
            Find your advisor
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__brand">
          <AdvisaLogo compact />
          Advisa — verified visa advice
        </div>
        <nav aria-label="Legal links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="mailto:hello@advisa.example">Contact</a>
        </nav>
      </footer>
    </div>
  );
};
