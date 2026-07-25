"use client";

import { useState } from "react";
import { type Advisor, advisors, formatMoney, getMilestones, getRateColor } from "~~/components/advisa/advisors";

type Screen = "market" | "profile" | "pay" | "case";
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
          {advisor.specialty} · {advisor.countries}
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
      <p>Price by invoice, after your consultation</p>
      <button className="app-primary-button app-primary-button--small" type="button" onClick={onOpen}>
        View adviser
      </button>
    </div>
  </article>
);

const ProfileScreen = ({ advisor, goBack, goToPay }: { advisor: Advisor; goBack: () => void; goToPay: () => void }) => {
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
        Back to advisers
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
                  {advisor.title} · {advisor.specialty} visas · {advisor.countries}
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

          <section className="app-card chain-card">
            <div className="chain-card__title">
              <span className="verified-dot" />
              <span>CREDENTIALS VERIFIED ON-CHAIN</span>
            </div>
            <p>
              These checks are not self-reported. Licence status is read live off-chain, while signed agreement hashes
              and milestone events are anchored on-chain.
            </p>
            <div className="hash-list">
              <span>licence check {advisor.hash1} ✓</span>
              <span>agreement hash {advisor.hash2} ✓</span>
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
          <h3>Then paid in 3 protected steps:</h3>
          <ol>
            <li>1 · Consultation</li>
            <li>2 · Application lodged</li>
            <li>3 · INZ outcome letter uploaded</li>
          </ol>
          <button className="app-primary-button app-primary-button--wide" type="button" onClick={goToPay}>
            Request a consultation
          </button>
          <small>🔒 You pay nothing today. Money goes into escrow only after you approve the invoice.</small>
        </aside>
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
        ← Back to {advisor.first}&apos;s profile
      </button>
      <h1>Invoice from {advisor.first}</h1>
      <p className="payment-intro">
        Your consultation is done, and {advisor.first} has sent an invoice for {formatMoney(advisor.fee)}. It goes into
        escrow held by AdVisa, not to {advisor.first}. Funds are released only when action-based milestones are
        completed.
      </p>

      <section className="app-card payment-card">
        <h2>How your money is released</h2>
        <div className="release-list">
          <div>
            <span>1</span>
            <p>Consultation — already done, released when you pay</p>
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
            <span>Connect your wallet and pay the demo ERC20 token directly into the escrow contract.</span>
          </button>
        </div>
      </section>

      <button className="app-primary-button app-primary-button--payment" type="button" onClick={confirm}>
        Pay {formatMoney(advisor.fee)} into escrow
      </button>
      <div className="payment-reassurance">
        <span>🔒 Held safely until work is done</span>
        <span>↩ Refund if no consultation happens</span>
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
                    You met {advisor.first} on July 12 and agreed the plan. {formatMoney(milestones.consultation)}{" "}
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
                  <strong>Application lodgement - happening now</strong>
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
                <time>Jul 21</time>
                <span>{advisor.first} uploaded your draft application for review.</span>
              </p>
              <p>
                <time>Jul 16</time>
                <span>Employment letter received and checked. ✓</span>
              </p>
              <p>
                <time>Jul 12</time>
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

const AdvisorsPage = () => {
  const [screen, setScreen] = useState<Screen>("market");
  const [filter, setFilter] = useState("All");
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paid, setPaid] = useState(false);

  const filteredAdvisors = advisors.filter(advisor => filter === "All" || advisor.specialty === filter);
  const selectedAdvisor = advisors[selectedIndex];
  const showMarketTab = screen !== "case";

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
            className={screen === "case" ? "app-tab app-tab--active" : "app-tab"}
            type="button"
            onClick={() => changeScreen("case")}
          >
            My case
          </button>
        </nav>
        <div className="app-topbar__help">
          <span>Need help?</span>
          <Avatar size="small" />
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
          goToPay={() => changeScreen("pay")}
        />
      )}
      {screen === "pay" && (
        <PaymentScreen
          advisor={selectedAdvisor}
          method={paymentMethod}
          setMethod={setPaymentMethod}
          goBack={() => changeScreen("profile")}
          confirm={() => {
            setPaid(true);
            changeScreen("case");
          }}
        />
      )}
      {screen === "case" && (
        <CaseScreen advisor={selectedAdvisor} paid={paid} goToMarket={() => changeScreen("market")} />
      )}
    </div>
  );
};

export default AdvisorsPage;
