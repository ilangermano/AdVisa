"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "~~/components/advisa/Avatar";
import { type Advisor, advisors, getAdvisorSlug, getRateColor } from "~~/components/advisa/advisors";

const filters = ["All", "Work", "Student", "Family", "Tourist", "Permanent residency"];

const AdvisorCard = ({ advisor }: { advisor: Advisor }) => (
  <article className="market-card">
    <div className="market-card__identity">
      <Avatar />
      <div>
        <div className="advisor-name-row">
          <strong>{advisor.name}</strong>
          <span className="verified-chip">✓ Verified</span>
        </div>
        <span>
          {advisor.specialty} · {advisor.flag} {advisor.origin}
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
      <p className="market-card__langs">{advisor.languages.join(" · ")}</p>
      <Link className="app-primary-button app-primary-button--small" href={`/advisors/${getAdvisorSlug(advisor)}`}>
        View adviser
      </Link>
    </div>
  </article>
);

export default function AdvisorsPage() {
  const [filter, setFilter] = useState("All");
  const filteredAdvisors = advisors.filter(a => filter === "All" || a.specialty === filter);

  return (
    <div className="app-screen app-screen--market">
      <h1>Find your immigration adviser</h1>
      <p className="market-intro">
        Every listed adviser starts with a live licence check. Choose the one that fits your visa category and budget,
        then keep payment protected in escrow.
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
          <AdvisorCard advisor={advisor} key={advisor.name} />
        ))}
      </div>
    </div>
  );
}
