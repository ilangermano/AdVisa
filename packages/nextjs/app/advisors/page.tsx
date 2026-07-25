"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { AdVisaMark } from "~~/components/advisa/AdvisaLogo";
import { ExplorerLink } from "~~/components/advisa/ExplorerLink";
import { type Advisor, advisors, formatMoney, getMilestones, getRateColor } from "~~/components/advisa/advisors";
import { useOnchainAdvisaFlow } from "~~/hooks/advisa/useOnchainAdvisaFlow";
import { notification } from "~~/utils/scaffold-eth";

type Screen =
  | "market"
  | "profile"
  | "agreement"
  | "pay"
  | "receipt"
  | "applications"
  | "case"
  | "seeded-case"
  | "seeded-document"
  | "messages"
  | "user-profile";
type PaymentMethod = "card" | "crypto";

const getScreenFromPathname = (pathname: string): Screen => {
  if (pathname.startsWith("/advisor/")) return "profile";
  if (pathname.startsWith("/agreement/")) return "agreement";
  if (pathname.startsWith("/checkout/")) return "pay";
  if (pathname.startsWith("/receipt/")) return "receipt";
  if (pathname.startsWith("/messages/")) return "messages";
  if (pathname === "/applications/action-required/document") return "seeded-document";
  if (pathname === "/applications/action-required") return "seeded-case";
  if (pathname.startsWith("/applications/")) return "case";
  if (pathname === "/applications") return "applications";
  if (pathname === "/account") return "user-profile";
  return "market";
};

const getAdvisorIndexFromPathname = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const advisorId =
    ["advisor", "agreement", "checkout", "receipt", "messages"].includes(segments[0]) || segments[0] === "applications"
      ? segments[1]
      : undefined;
  const index = advisors.findIndex(advisor => advisor.id === advisorId);
  return index >= 0 ? index : undefined;
};

const getScreenPath = (screen: Screen, advisor: Advisor) => {
  switch (screen) {
    case "profile":
      return `/advisor/${advisor.id}`;
    case "agreement":
      return `/agreement/${advisor.id}`;
    case "pay":
      return `/checkout/${advisor.id}`;
    case "receipt":
      return `/receipt/${advisor.id}`;
    case "applications":
      return "/applications";
    case "case":
      return `/applications/${advisor.id}`;
    case "seeded-case":
      return "/applications/action-required";
    case "seeded-document":
      return "/applications/action-required/document";
    case "messages":
      return `/messages/${advisor.id}`;
    case "user-profile":
      return "/account";
    default:
      return "/advisors";
  }
};

const filters = ["All", "Work", "Student", "Family", "Tourist", "Permanent residency"];

const simplifiedAgreementCopy = {
  English: {
    heading: "What you are agreeing to",
    intro: "{advisor} will provide the agreed {service} for a total professional fee of {fee}.",
    points: [
      "The full fee is protected in blockchain escrow before work starts.",
      "Money is released only after each listed milestone is completed and verified.",
      "You must provide truthful information and requested documents on time.",
      "Changes to the work or fee schedule require both parties to agree.",
      "Unreleased money remains protected if the engagement ends or a deadline is missed.",
    ],
  },
  "Te Reo Māori": {
    heading: "He whakamārama māmā mō tō whakaaetanga",
    intro: "Ka whakarato a {advisor} i te ratonga {service} kua whakaaetia, mō te utu ngaio katoa o {fee}.",
    points: [
      "Ka tiakina te utu katoa ki roto i te pūnaha pupuri moni ā-poraka i mua i te tīmatanga o te mahi.",
      "Ka tukuna te moni ina oti, ina whakamanahia hoki ia wāhanga mahi.",
      "Me tuku koe i ngā kōrero pono me ngā tuhinga e tonoa ana i te wā tika.",
      "Me whakaae ngā taha e rua ki ngā panonitanga o te mahi, o ngā utu rānei.",
      "Ka noho haumaru ngā moni kāore anō kia tukuna mēnā ka mutu te whakaaetanga.",
    ],
  },
  Español: {
    heading: "Qué estás aceptando",
    intro: "{advisor} prestará el servicio acordado de {service} por una tarifa profesional total de {fee}.",
    points: [
      "La tarifa completa queda protegida en un depósito de garantía en blockchain antes de comenzar.",
      "El dinero solo se libera cuando cada etapa indicada se completa y verifica.",
      "Debes proporcionar información veraz y los documentos solicitados a tiempo.",
      "Cualquier cambio en el trabajo o las tarifas requiere el acuerdo de ambas partes.",
      "Los fondos no liberados permanecen protegidos si termina el encargo o vence un plazo.",
    ],
  },
  中文: {
    heading: "您同意的主要内容",
    intro: "{advisor} 将提供约定的 {service} 服务，专业服务总费用为 {fee}。",
    points: [
      "工作开始前，全部费用将存入区块链托管合约中受到保护。",
      "只有在每个里程碑完成并经过验证后，相应款项才会释放。",
      "您必须及时提供真实信息和所要求的文件。",
      "服务范围或费用的任何变更都必须由双方同意。",
      "如果服务终止或错过期限，尚未释放的资金仍会受到保护。",
    ],
  },
  हिन्दी: {
    heading: "आप किन बातों से सहमत हो रहे हैं",
    intro: "{advisor}, {fee} की कुल पेशेवर फीस पर सहमत {service} सेवा प्रदान करेंगे।",
    points: [
      "काम शुरू होने से पहले पूरी फीस ब्लॉकचेन एस्क्रो में सुरक्षित रखी जाती है।",
      "हर माइलस्टोन पूरा और सत्यापित होने के बाद ही संबंधित राशि जारी होती है।",
      "आपको सही जानकारी और मांगे गए दस्तावेज समय पर देने होंगे।",
      "काम या फीस में बदलाव के लिए दोनों पक्षों की सहमति जरूरी है।",
      "समझौता समाप्त होने या समय सीमा चूकने पर जारी न हुई राशि सुरक्षित रहती है।",
    ],
  },
  العربية: {
    heading: "ما الذي توافق عليه",
    intro: "سيقدم {advisor} خدمة {service} المتفق عليها مقابل أتعاب مهنية إجمالية قدرها {fee}.",
    points: [
      "تُحمى الأتعاب كاملة في حساب ضمان على البلوكشين قبل بدء العمل.",
      "لا تُفرج الأموال إلا بعد إكمال كل مرحلة مدرجة والتحقق منها.",
      "يجب تقديم معلومات صحيحة والمستندات المطلوبة في الوقت المحدد.",
      "أي تغيير في نطاق العمل أو الرسوم يتطلب موافقة الطرفين.",
      "تبقى الأموال غير المفرج عنها محمية إذا انتهى التكليف أو فات موعد نهائي.",
    ],
  },
  Português: {
    heading: "O que você está aceitando",
    intro: "{advisor} prestará o serviço acordado de {service} pela taxa profissional total de {fee}.",
    points: [
      "A taxa integral fica protegida em custódia blockchain antes do início do trabalho.",
      "O dinheiro só é liberado quando cada etapa listada é concluída e verificada.",
      "Você deve fornecer informações verdadeiras e os documentos solicitados no prazo.",
      "Mudanças no trabalho ou nas taxas precisam da concordância de ambas as partes.",
      "Os valores não liberados continuam protegidos se o contrato terminar ou o prazo expirar.",
    ],
  },
} as const;

type SimplifiedLanguage = keyof typeof simplifiedAgreementCopy;

const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1-");

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const Avatar = ({ advisor, size = "normal" }: { advisor?: Advisor; size?: "small" | "normal" | "large" }) =>
  advisor ? (
    <img className={`app-avatar app-avatar--${size}`} src={advisor.photoUrl} alt={`${advisor.name} profile`} />
  ) : (
    <span className={`striped-avatar app-avatar app-avatar--${size}`} aria-hidden="true" />
  );

const AdvisorCard = ({ advisor, onOpen }: { advisor: Advisor; onOpen: () => void }) => (
  <article className="market-card">
    <div className="market-card__identity">
      <Avatar advisor={advisor} />
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
      <button className="app-primary-button app-primary-button--small" type="button" onClick={onOpen}>
        View adviser
      </button>
    </div>
  </article>
);

const ProfileScreen = ({
  advisor,
  escrowAddress,
  goBack,
  goToAgreement,
}: {
  advisor: Advisor;
  escrowAddress?: string;
  goBack: () => void;
  goToAgreement: () => void;
}) => {
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
        ← Back to advisers
      </button>
      <div className="profile-layout">
        <div className="profile-main">
          <section className="app-card profile-header-card">
            <div className="profile-identity">
              <Avatar advisor={advisor} size="large" />
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
                  <p>Name and licence number match the IAA public register exactly — this is the same person.</p>
                </div>
              </div>
            </div>
            <div className="chain-card__proof">
              <span className="chain-card__proof-label">Technical proof (for your records)</span>
              <div className="hash-list">
                <span>Licence reference {advisor.licenceRef} ✓</span>
                {escrowAddress && (
                  <ExplorerLink label="View VisaEscrow contract" shorten={false} type="address" value={escrowAddress} />
                )}
              </div>
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
          <h3>Paid in 3 protected steps:</h3>
          <ol>
            <li>1 · Consultation</li>
            <li>2 · Application lodged</li>
            <li>3 · INZ outcome letter uploaded</li>
          </ol>
          <button className="app-primary-button app-primary-button--wide" type="button" onClick={goToAgreement}>
            Request a consultation
          </button>
          <small>🔒 You pay nothing today. Money goes into escrow only after you approve the invoice.</small>
        </aside>
      </div>
    </div>
  );
};

type SignState = "review" | "signing" | "signed";

const LegalDocument = ({
  advisor,
  escrowAddress,
  milestones,
}: {
  advisor: Advisor;
  escrowAddress?: string;
  milestones: ReturnType<typeof getMilestones>;
}) => (
  <div className="legal-doc">
    <div className="legal-doc__title">
      <h2>Immigration Adviser Fee Agreement</h2>
      <p>
        Prepared under the Immigration Advisers Licensing Act 2007 and the Code of Conduct 2014. This agreement must be
        signed by both parties before any payment is accepted.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>1. Parties</h3>
      <div className="legal-doc__parties">
        <div>
          <span className="legal-doc__party-label">IMMIGRATION ADVISER</span>
          <strong>{advisor.name}</strong>
          <span>{advisor.title}</span>
          <span>IAA Licence · {advisor.licenceRef}</span>
          <ExplorerLink type="address" value={advisor.walletAddress} />
        </div>
        <div>
          <span className="legal-doc__party-label">CLIENT</span>
          <strong>You (the applicant)</strong>
          <span>Identity verified via Privy</span>
          <span>Wallet: escrow counterparty</span>
        </div>
      </div>
    </div>

    <div className="legal-doc__section">
      <h3>2. Scope of Services</h3>
      <p>
        {advisor.name} agrees to provide licensed immigration advice and to prepare, complete, and lodge an application
        for a <strong>{advisor.agreement.visaType}</strong> on behalf of the client. Services include initial
        consultation, document review, preparation of all INZ-required forms, liaison with INZ on the client&apos;s
        behalf, and uploading of the INZ decision letter upon receipt.
      </p>
      <p>
        Services do not include legal representation in any appeal, review, or Tribunal proceeding. Immigration advice
        does not guarantee a visa outcome — INZ retains sole discretion over all decisions.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>3. Fee Schedule &amp; Milestone Payments</h3>
      <p>
        The total fee for services is <strong>{formatMoney(advisor.fee)} NZD</strong>. Payment is held in a
        smart-contract escrow managed by AdVisa and released in three milestone tranches as follows:
      </p>
      {escrowAddress && (
        <p>
          Public escrow contract: <ExplorerLink type="address" value={escrowAddress} />
        </p>
      )}
      <table className="legal-doc__table">
        <thead>
          <tr>
            <th>#</th>
            <th>Milestone</th>
            <th>Release condition</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Consultation</td>
            <td>Initial consultation completed and document checklist reviewed</td>
            <td>{formatMoney(milestones.consultation)}</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Lodgement</td>
            <td>Application lodged with INZ; lodgement receipt uploaded to AdVisa</td>
            <td>{formatMoney(milestones.filing)}</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Outcome</td>
            <td>INZ decision letter uploaded to AdVisa; case closed</td>
            <td>{formatMoney(milestones.decision)}</td>
          </tr>
        </tbody>
      </table>
      <p>
        No amount is payable to the adviser until the corresponding milestone has been completed and verified. The
        escrow contract enforces this automatically — AdVisa has no discretion to release funds early.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>4. Lodgement Deadline &amp; Automatic Refund</h3>
      <p>
        The adviser must lodge the visa application within{" "}
        <strong>{advisor.agreement.validityDays} calendar days</strong> of the date both parties sign this agreement. If
        lodgement has not occurred by that deadline, any escrow balance not yet released under clause 3 will be
        automatically returned to the client&apos;s wallet without any action required from either party. The escrow
        smart contract enforces this condition on-chain — it cannot be overridden by the adviser or by AdVisa.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>5. Cancellation &amp; Withdrawal</h3>
      <p>
        The client may cancel this agreement at any time by written notice. Milestone tranches already released under
        clause 3 are non-refundable. Tranches not yet released remain in escrow and are returned to the client
        automatically on cancellation. The adviser may withdraw from the engagement with seven days&apos; written
        notice; in that event, all unreleased escrow funds are returned to the client immediately.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>6. Code of Conduct</h3>
      <p>
        {advisor.name} is bound by the Immigration Advisers Code of Conduct 2014. The client has the right to complain
        to the Immigration Advisers Authority (IAA) if they believe the adviser has breached the Code. AdVisa is a
        payment and verification platform only — it is not an immigration advice service and does not supervise or
        endorse the advice given by the adviser.
      </p>
    </div>

    <div className="legal-doc__section">
      <h3>7. Electronic Execution</h3>
      <p>
        This agreement is executed electronically via Lumin Sign. Each party&apos;s electronic signature carries the
        same legal effect as a handwritten signature under the Contract and Commercial Law Act 2017. The SHA-256 hash of
        the signed document is recorded on the Base Sepolia blockchain by AdVisa&apos;s relayer within 60 seconds of
        both parties signing, providing an immutable timestamp and proof of content.
      </p>
    </div>
  </div>
);

const AgreementScreen = ({
  advisor,
  agreementHash,
  anchorTxHash,
  escrowAddress,
  goBack,
  goToPay,
  onSign,
}: {
  advisor: Advisor;
  agreementHash: string;
  anchorTxHash?: string;
  escrowAddress?: string;
  goBack: () => void;
  goToPay: () => void;
  onSign: () => Promise<void>;
}) => {
  const milestones = getMilestones(advisor);
  const [signState, setSignState] = useState<SignState>("review");
  const [simplifiedLanguage, setSimplifiedLanguage] = useState<SimplifiedLanguage>("English");
  const docRef = useRef<HTMLDivElement>(null);
  const simplifiedCopy = simplifiedAgreementCopy[simplifiedLanguage];
  const translate = (value: string) =>
    value
      .replace("{advisor}", advisor.name)
      .replace("{service}", advisor.agreement.visaType)
      .replace("{fee}", `${formatMoney(advisor.fee)} NZD`);

  const handleSign = async () => {
    setSignState("signing");
    try {
      await onSign();
      setSignState("signed");
      notification.success("Agreement signed and anchored on Base Sepolia");
    } catch (error) {
      setSignState("review");
      notification.error(error instanceof Error ? error.message : "Could not sign the agreement");
    }
  };

  return (
    <div className="app-screen app-screen--agreement">
      <button className="back-button" type="button" onClick={goBack}>
        ← Back to {advisor.first}&apos;s profile
      </button>

      <div className="agreement-header">
        <div>
          <h1>Fee Agreement</h1>
          <p className="agreement-header__sub">
            {advisor.specialty} visa · with {advisor.name}
          </p>
        </div>
        {signState === "signed" && (
          <div className="chain-badge chain-badge--small">
            <span className="verified-dot" />
            HASH ANCHORED ON-CHAIN
          </div>
        )}
      </div>

      {/* Scrollable legal document */}
      <section className="app-card agreement-doc-card">
        <div className="agreement-doc-card__header">
          <span className="agreement-doc-card__label">LEGAL DOCUMENT</span>
          <span className="agreement-doc-card__hint">Scroll to read ↓</span>
        </div>
        <div className="agreement-doc-scroll" ref={docRef}>
          <LegalDocument advisor={advisor} escrowAddress={escrowAddress} milestones={milestones} />
        </div>
      </section>

      {/* AI plain language summary */}
      <section className="app-card agreement-summary-card">
        <div className="agreement-summary-card__eyebrow">
          <span className="verified-dot" />
          PLAIN LANGUAGE SUMMARY · AI EXTRACTED
        </div>
        <p className="agreement-summary-card__text">{advisor.agreement.plainSummary}</p>
        {advisor.agreement.redFlags.length === 0 ? (
          <div className="agreement-no-flags">
            <span>✓</span>
            No red flags detected — standard milestone-based fee structure.
          </div>
        ) : (
          <ul className="agreement-flags-list">
            {advisor.agreement.redFlags.map(flag => (
              <li key={flag}>⚠ {flag}</li>
            ))}
          </ul>
        )}
        <div className="simplified-agreement">
          <div className="simplified-agreement__heading">
            <div>
              <span>TRANSLATED SUMMARY</span>
              <h3>{simplifiedCopy.heading}</h3>
            </div>
            <label>
              Language
              <select
                aria-label="Agreement summary language"
                onChange={event => setSimplifiedLanguage(event.target.value as SimplifiedLanguage)}
                value={simplifiedLanguage}
              >
                {Object.keys(simplifiedAgreementCopy).map(language => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </label>
          </div>
          <p>{translate(simplifiedCopy.intro)}</p>
          <ul>
            {simplifiedCopy.points.map(point => (
              <li key={point}>{translate(point)}</li>
            ))}
          </ul>
          <small>The signed English fee agreement remains the authoritative legal version.</small>
        </div>
      </section>

      {/* Payment schedule */}
      <section className="app-card payment-card">
        <h2>Payment Schedule</h2>
        <p className="agreement-section__sub">Escrow releases only when each milestone is completed and verified.</p>
        <div className="release-list">
          <div>
            <span>1</span>
            <p>Consultation completed · document checklist reviewed</p>
            <strong>{formatMoney(milestones.consultation)}</strong>
          </div>
          <div>
            <span>2</span>
            <p>Application lodged with INZ · lodgement receipt uploaded</p>
            <strong>{formatMoney(milestones.filing)}</strong>
          </div>
          <div>
            <span>3</span>
            <p>INZ outcome letter uploaded · case closed</p>
            <strong>{formatMoney(milestones.decision)}</strong>
          </div>
        </div>
      </section>

      {/* Signing panel */}
      <div className="agreement-sign-panel">
        {signState === "review" && (
          <>
            <button className="app-primary-button app-primary-button--wide" type="button" onClick={handleSign}>
              Sign with Privy wallet →
            </button>
            <p className="agreement-actions__sub">
              Your electronic signature has the same legal effect as a handwritten one under NZ law.
            </p>
          </>
        )}

        {signState === "signing" && (
          <div className="agreement-signing-state">
            <div className="agreement-signing-state__spinner" aria-hidden="true" />
            <div>
              <strong>Waiting for your secure signature…</strong>
              <p>Privy will ask you to approve the agreement hash before it is anchored on Base Sepolia.</p>
            </div>
          </div>
        )}

        {signState === "signed" && (
          <div className="agreement-signed-state">
            <div className="agreement-signed-state__badge">
              <span>✓</span>
              <div>
                <strong>Agreement signed and sealed</strong>
                <p>
                  Both you and {advisor.first} have signed. This document is now locked — it cannot be changed by
                  anyone, including us.
                </p>
                <div className="signed-meta">
                  <div className="signed-meta__ref">
                    <span className="signed-meta__pill">Privy signed</span>
                    <span>
                      Agreement {agreementHash.slice(0, 10)}...{agreementHash.slice(-8)}
                    </span>
                  </div>
                  <div className="signed-meta__hash">
                    {anchorTxHash ? (
                      <ExplorerLink label="View anchor transaction" shorten={false} type="tx" value={anchorTxHash} />
                    ) : escrowAddress ? (
                      <ExplorerLink
                        label="View anchored agreement contract"
                        shorten={false}
                        type="address"
                        value={escrowAddress}
                      />
                    ) : null}
                    {" · "}
                    {new Date().toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
            <button className="app-primary-button app-primary-button--wide" type="button" onClick={goToPay}>
              Fund escrow →
            </button>
            <p className="agreement-actions__sub">
              Agreement locked. Funds go to escrow — not to {advisor.first} — until each milestone is verified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentScreen = ({
  address,
  advisor,
  escrowAddress,
  fundEscrow,
  method,
  paymentStatus,
  setMethod,
  goBack,
  confirm,
}: {
  address?: string;
  advisor: Advisor;
  escrowAddress?: string;
  fundEscrow: () => Promise<string | undefined>;
  method: PaymentMethod;
  paymentStatus: string;
  setMethod: (method: PaymentMethod) => void;
  goBack: () => void;
  confirm: (txHash?: string) => void;
}) => {
  const milestones = getMilestones(advisor);
  const [payStep, setPayStep] = useState<"details" | "processing">("details");
  const [cardDetails, setCardDetails] = useState({ name: "", number: "", expiry: "", cvc: "" });
  const paymentInFlight = useRef(false);

  const handlePay = async () => {
    if (
      method === "card" &&
      (!cardDetails.name.trim() ||
        cardDetails.number.replace(/\D/g, "").length !== 16 ||
        !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry) ||
        cardDetails.cvc.length !== 3)
    ) {
      notification.error("Complete the card details before continuing");
      return;
    }

    if (paymentInFlight.current) return;
    paymentInFlight.current = true;
    setPayStep("processing");
    try {
      const txHash = await fundEscrow();
      notification.success("Your payment is now protected in VisaEscrow");
      confirm(txHash);
    } catch (error) {
      paymentInFlight.current = false;
      setPayStep("details");
      notification.error(error instanceof Error ? error.message : "Could not fund escrow");
    }
  };

  if (payStep === "processing") {
    return (
      <div className="app-screen app-screen--payment pay-processing">
        <div className="pay-processing__spinner" aria-hidden="true" />
        <strong>{paymentStatus}…</strong>
        <p>Sending {formatMoney(advisor.fee)} into escrow on Base Sepolia. Keep Privy open until it confirms.</p>
      </div>
    );
  }

  return (
    <div className="app-screen app-screen--payment">
      <button className="back-button" type="button" onClick={goBack}>
        ← Back to fee agreement
      </button>
      <h1>Fund Escrow</h1>
      <p className="payment-intro">
        You&apos;ve approved the invoice. {formatMoney(advisor.fee)} goes into escrow held by AdVisa — not to{" "}
        {advisor.first}. Funds release only as milestones are completed.
      </p>

      <section className="app-card payment-card">
        <h2>Escrow breakdown</h2>
        <div className="release-list">
          <div>
            <span>1</span>
            <p>Consultation — released on payment</p>
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
            <div className="pay-card-preview__number">{cardDetails.number || "####-####-####-####"}</div>
            <div className="pay-card-preview__footer">
              <div>
                <span>CARDHOLDER</span>
                <strong>{cardDetails.name || "YOUR NAME"}</strong>
              </div>
              <div>
                <span>EXPIRES</span>
                <strong>{cardDetails.expiry || "MM/YY"}</strong>
              </div>
            </div>
          </div>
          <div className="pay-card-fields">
            <div className="pay-field">
              <label className="pay-label">Card number</label>
              <input
                autoComplete="cc-number"
                className="pay-input"
                inputMode="numeric"
                maxLength={19}
                onChange={event =>
                  setCardDetails(current => ({ ...current, number: formatCardNumber(event.target.value) }))
                }
                placeholder="4242-4242-4242-4242"
                value={cardDetails.number}
              />
            </div>
            <div className="pay-field-row">
              <div className="pay-field">
                <label className="pay-label">Expiry</label>
                <input
                  autoComplete="cc-exp"
                  className="pay-input"
                  inputMode="numeric"
                  maxLength={5}
                  onChange={event =>
                    setCardDetails(current => ({ ...current, expiry: formatExpiry(event.target.value) }))
                  }
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                />
              </div>
              <div className="pay-field">
                <label className="pay-label">CVV</label>
                <input
                  autoComplete="cc-csc"
                  className="pay-input"
                  inputMode="numeric"
                  maxLength={3}
                  onChange={event =>
                    setCardDetails(current => ({
                      ...current,
                      cvc: event.target.value.replace(/\D/g, "").slice(0, 3),
                    }))
                  }
                  placeholder="123"
                  value={cardDetails.cvc}
                />
              </div>
            </div>
            <div className="pay-field">
              <label className="pay-label">Name on card</label>
              <input
                autoComplete="cc-name"
                className="pay-input"
                onChange={event => setCardDetails(current => ({ ...current, name: event.target.value }))}
                placeholder="Your name"
                value={cardDetails.name}
              />
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
            {address ? (
              <ExplorerLink className="pay-crypto-addr" type="address" value={address} />
            ) : (
              <span className="pay-crypto-addr">Preparing wallet…</span>
            )}
          </div>
          <div className="pay-crypto-amount">
            <span className="pay-crypto-amount__label">Amount to send</span>
            <strong className="pay-crypto-amount__value">{formatMoney(advisor.fee)} dNZD</strong>
            <span className="pay-crypto-amount__sub">1 dNZD = $1.00 NZD · New Zealand dollar stablecoin</span>
          </div>
          <div className="pay-crypto-details">
            <div className="pay-crypto-row">
              <span>Escrow contract</span>
              {escrowAddress ? (
                <ExplorerLink className="pay-mono" type="address" value={escrowAddress} />
              ) : (
                <strong className="pay-mono">Loading…</strong>
              )}
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
};

const CaseScreen = ({
  advisor,
  escrowAddress,
  paid,
  goToMarket,
  goToMessages,
}: {
  advisor: Advisor;
  escrowAddress?: string;
  paid: boolean;
  goToMarket: () => void;
  goToMessages: () => void;
}) => {
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
                  <strong>Application lodgement — happening now</strong>
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
            {escrowAddress && (
              <div className="case-contract">
                <ExplorerLink label="View escrow contract" shorten={false} type="address" value={escrowAddress} />
              </div>
            )}
          </section>
          <section className="app-card case-advisor-card">
            <div>
              <Avatar size="small" />
              <p>
                <strong>{advisor.name}</strong>
                <span>● Usually replies in {advisor.reply}</span>
              </p>
            </div>
            <button className="secondary-button secondary-button--wide" type="button" onClick={goToMessages}>
              Message {advisor.first}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
};

const ReceiptScreen = ({
  advisor,
  escrowAddress,
  method,
  txHash,
  goToApplications,
}: {
  advisor: Advisor;
  escrowAddress?: string;
  method: PaymentMethod;
  txHash?: string;
  goToApplications: () => void;
}) => {
  const milestones = getMilestones(advisor);
  const date = new Date().toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="app-screen app-screen--receipt">
      <div className="receipt-badge">
        <span className="receipt-badge__icon">✓</span>
        <div>
          <strong>Payment confirmed — your money is in escrow</strong>
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
          <span>Released now — consultation confirmed</span>
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
          {txHash ? (
            <ExplorerLink className="receipt-mono" type="tx" value={txHash} />
          ) : (
            <strong className="receipt-mono">Confirmed on Base Sepolia</strong>
          )}
        </div>
        <div className="receipt-row">
          <span>Escrow contract</span>
          {escrowAddress ? (
            <ExplorerLink className="receipt-mono" type="address" value={escrowAddress} />
          ) : (
            <strong className="receipt-mono">Loading…</strong>
          )}
        </div>
        <div className="receipt-row">
          <span>Payment method</span>
          <strong>{method === "card" ? "Card / bank transfer" : "Crypto wallet (dNZD)"}</strong>
        </div>
        <div className="receipt-row">
          <span>Network</span>
          <strong>Base Sepolia</strong>
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
                {formatMoney(milestones.consultation)} has been released to {advisor.first} — your consultation is now
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
                {formatMoney(milestones.decision)} releases automatically. If the deadline is missed, all remaining
                funds return to you.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <button className="app-primary-button app-primary-button--payment" type="button" onClick={goToApplications}>
        Go to My Applications →
      </button>
      <div className="payment-reassurance">
        <span>🔒 Your money cannot move without a verified milestone</span>
      </div>
    </div>
  );
};

const seededAdvisor = advisors[1]; // Amara Osei, AEWV, $1,800
const seededMilestones = getMilestones(seededAdvisor);

const SeededDocumentScreen = ({ goBack, goToMessages }: { goBack: () => void; goToMessages: () => void }) => (
  <div className="app-screen app-screen--document">
    <div className="document-viewer-toolbar">
      <button className="back-button" type="button" onClick={goBack}>
        Back to milestone
      </button>
      <button className="secondary-button" type="button" onClick={goToMessages}>
        Message {seededAdvisor.first}
      </button>
    </div>

    <div className="document-viewer-meta">
      <div>
        <span>INZ LODGEMENT RECEIPT</span>
        <h1>Application submission receipt</h1>
      </div>
      <span className="document-status">Received by INZ</span>
    </div>

    <section className="app-card agreement-doc-card inz-receipt-card">
      <div className="agreement-doc-card__header">
        <span className="agreement-doc-card__label">OFFICIAL DOCUMENT</span>
        <span className="agreement-doc-card__hint">Submitted 25 Jul 2026</span>
      </div>
      <div className="agreement-doc-scroll inz-receipt-scroll">
        <article className="legal-doc inz-receipt">
          <div className="legal-doc__title inz-receipt__title">
            <div className="inz-receipt__masthead">
              <div>
                <span>NEW ZEALAND</span>
                <strong>Immigration New Zealand</strong>
                <small>Te Ratonga Manene</small>
              </div>
              <div>
                <span>APPLICATION REFERENCE</span>
                <strong>NZ-WV-2026-071842</strong>
              </div>
            </div>
            <span className="inz-receipt__eyebrow">ONLINE APPLICATION RECEIPT</span>
            <h2>Your application has been received</h2>
            <p>
              Immigration New Zealand received this application through Immigration Online. Keep this receipt with your
              records and quote the application reference in any correspondence.
            </p>
          </div>

          <div className="legal-doc__section">
            <h3>1. Application Details</h3>
            <div className="legal-doc__parties inz-receipt__details">
              <div>
                <span className="legal-doc__party-label">APPLICANT</span>
                <strong>AdVisa client</strong>
                <span>Accredited Employer Work Visa</span>
                <span>Received and awaiting allocation</span>
              </div>
              <div>
                <span className="legal-doc__party-label">SUBMITTED BY</span>
                <strong>{seededAdvisor.name}</strong>
                <span>Licensed immigration adviser</span>
                <span>25 July 2026, 2:32 PM NZST</span>
              </div>
            </div>
          </div>

          <div className="legal-doc__section">
            <h3>2. Submission Record</h3>
            <table className="legal-doc__table">
              <tbody>
                <tr>
                  <th>Submission channel</th>
                  <td>Immigration Online</td>
                </tr>
                <tr>
                  <th>Application status</th>
                  <td>Received and awaiting allocation</td>
                </tr>
                <tr>
                  <th>Receipt issued</th>
                  <td>25 July 2026, 2:38 PM NZST</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="legal-doc__section">
            <h3>3. Documents Included</h3>
            <table className="legal-doc__table inz-receipt__files">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Identity and passport evidence</td>
                  <td>Received</td>
                </tr>
                <tr>
                  <td>Employment agreement and job description</td>
                  <td>Received</td>
                </tr>
                <tr>
                  <td>Health and character declarations</td>
                  <td>Received</td>
                </tr>
                <tr>
                  <td>Licensed adviser declaration</td>
                  <td>Received</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="legal-doc__section inz-receipt__notice">
            <h3>Important Notice</h3>
            <p>
              This receipt confirms lodgement only. It is not a visa decision or confirmation that the application is
              complete. Immigration New Zealand may request further information while assessing the application.
            </p>
            <span>Generated by Immigration Online - 25 Jul 2026</span>
          </div>
        </article>
      </div>
    </section>
  </div>
);

type ConversationMessage = {
  id: number;
  sender: "adviser" | "client";
  text: string;
  time: string;
};

const MessageScreen = ({ advisor, goBack }: { advisor: Advisor; goBack: () => void }) => {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;

    setMessages(current => [
      ...current,
      {
        id: Date.now(),
        sender: "client",
        text,
        time: new Date().toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" }),
      },
    ]);
    setDraft("");
  };

  return (
    <div className="app-screen app-screen--messages">
      <button className="back-button" type="button" onClick={goBack}>
        Back to application
      </button>

      <section className="message-workspace">
        <header className="message-header">
          <Avatar size="small" />
          <div>
            <h1>{advisor.name}</h1>
            <p>Licensed immigration adviser - Usually replies in {advisor.reply}</p>
          </div>
          <span>Available</span>
        </header>

        <div className="message-thread" aria-live="polite">
          {messages.length === 0 ? (
            <div className="message-empty-state">
              <strong>No messages yet</strong>
              <p>Start a conversation with {advisor.first} about your application.</p>
            </div>
          ) : (
            <>
              <div className="message-day">Today</div>
              {messages.map(message => (
                <div
                  className={message.sender === "client" ? "message-row message-row--client" : "message-row"}
                  key={message.id}
                >
                  <div className="message-bubble">
                    <p>{message.text}</p>
                    <time>{message.time}</time>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <form
          className="message-composer"
          onSubmit={event => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <label htmlFor="adviser-message">Message {advisor.first}</label>
          <div>
            <textarea
              id="adviser-message"
              placeholder="Write a message..."
              rows={3}
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button aria-label="Send message" disabled={!draft.trim()} type="submit">
              <PaperAirplaneIcon aria-hidden="true" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

const SeededCaseScreen = ({
  approved,
  escrowAddress,
  onApprove,
  goBack,
  goToDocument,
  goToMessages,
}: {
  approved: boolean;
  escrowAddress?: string;
  onApprove: () => void;
  goBack: () => void;
  goToDocument: () => void;
  goToMessages: () => void;
}) => {
  const [approving, setApproving] = useState(false);

  const handleApprove = () => {
    setApproving(true);
    setTimeout(() => {
      onApprove();
      setApproving(false);
    }, 1600);
  };

  return (
    <div className="app-screen app-screen--case">
      <button className="back-button" type="button" onClick={goBack}>
        ← Back to My Applications
      </button>
      <div className="case-heading">
        <div>
          <h1>Your engagement</h1>
          <p>
            {seededAdvisor.specialty} visa · {seededAdvisor.countries} · with {seededAdvisor.name}
          </p>
        </div>
        <span
          className={
            approved ? "case-status-badge case-status-badge--ok" : "case-status-badge case-status-badge--action"
          }
        >
          {approved ? "Step 2 approved ✓" : "Action needed · step 2 of 3"}
        </span>
      </div>

      {!approved && (
        <div className="seeded-approval-banner">
          <div className="seeded-approval-banner__icon">!</div>
          <div>
            <strong>Amara has lodged your application — your approval is needed</strong>
            <p>
              Amara uploaded the INZ lodgement receipt on 25 Jul. Review the document below, then approve to release{" "}
              {formatMoney(seededMilestones.filing)} from escrow.
            </p>
          </div>
        </div>
      )}

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
                    You met {seededAdvisor.first} on 18 Jul and agreed the plan.{" "}
                    {formatMoney(seededMilestones.consultation)} released.
                  </p>
                </div>
              </div>
              <div className="timeline__item">
                <div className="timeline__rail">
                  <span
                    className={approved ? "timeline__dot timeline__dot--done" : "timeline__dot timeline__dot--action"}
                  >
                    {approved ? "✓" : "!"}
                  </span>
                  <span className={approved ? "timeline__line timeline__line--done" : "timeline__line"} />
                </div>
                <div>
                  <strong>Application lodged with INZ</strong>
                  {approved ? (
                    <p>
                      Lodgement receipt verified. {formatMoney(seededMilestones.filing)} released to{" "}
                      {seededAdvisor.first}.
                    </p>
                  ) : (
                    <p>
                      Amara uploaded the INZ lodgement receipt on 25 Jul.{" "}
                      <strong className="timeline__action-needed">
                        Your approval needed to release {formatMoney(seededMilestones.filing)}.
                      </strong>
                    </p>
                  )}
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

          {!approved && (
            <section className="app-card seeded-approve-panel">
              <div className="seeded-approve-panel__eyebrow">MILESTONE 2 — APPROVAL REQUIRED</div>
              <div className="seeded-approve-panel__doc">
                <div className="seeded-approve-panel__doc-icon">📄</div>
                <div>
                  <strong>INZ Lodgement Receipt</strong>
                  <p>Uploaded by {seededAdvisor.first} · 25 Jul 2026 · PDF, 84 KB</p>
                </div>
                <button className="secondary-button" type="button" onClick={goToDocument}>
                  View document
                </button>
              </div>
              {approving ? (
                <div className="pay-processing" style={{ padding: "28px 0 8px" }}>
                  <div className="pay-processing__spinner" aria-hidden="true" />
                  <strong>Releasing {formatMoney(seededMilestones.filing)}…</strong>
                </div>
              ) : (
                <>
                  <button className="app-primary-button app-primary-button--wide" type="button" onClick={handleApprove}>
                    Approve &amp; release {formatMoney(seededMilestones.filing)} →
                  </button>
                  <p className="agreement-actions__sub">
                    Once approved, {formatMoney(seededMilestones.filing)} is released to {seededAdvisor.first} and your
                    remaining {formatMoney(seededMilestones.decision)} stays protected until the final outcome.
                  </p>
                </>
              )}
            </section>
          )}

          <section className="app-card updates-card">
            <h2>Latest updates</h2>
            <div>
              <p>
                <time>Jul 25</time>
                <span>INZ lodgement receipt uploaded. Awaiting your approval.</span>
              </p>
              <p>
                <time>Jul 22</time>
                <span>All documents reviewed and application submitted to INZ.</span>
              </p>
              <p>
                <time>Jul 18</time>
                <span>Consultation completed. {formatMoney(seededMilestones.consultation)} released from escrow.</span>
              </p>
            </div>
          </section>
        </div>

        <aside className="case-sidebar">
          <section className="case-escrow-card">
            <div className="dark-eyebrow">YOUR ESCROW · {formatMoney(seededAdvisor.fee)}</div>
            <div className="case-milestones">
              <div>
                <span className="milestone-check milestone-check--gradient">✓</span>
                Consultation · {formatMoney(seededMilestones.consultation)} released
              </div>
              <div>
                {approved ? (
                  <span className="milestone-check milestone-check--gradient">✓</span>
                ) : (
                  <span className="milestone-empty milestone-empty--action">!</span>
                )}
                Filing · {formatMoney(seededMilestones.filing)} {approved ? "released" : "awaiting approval"}
              </div>
              <div>
                <span className="milestone-empty" />
                Outcome · {formatMoney(seededMilestones.decision)} held
              </div>
            </div>
            <div className="case-progress">
              <span style={{ width: approved ? "66%" : "33%" }} />
            </div>
            <p>
              {approved
                ? `${formatMoney(seededMilestones.consultation + seededMilestones.filing)} of ${formatMoney(seededAdvisor.fee)} released so far`
                : `${formatMoney(seededMilestones.consultation)} of ${formatMoney(seededAdvisor.fee)} released so far`}
            </p>
            {escrowAddress && (
              <div className="case-contract">
                <ExplorerLink label="View escrow contract" shorten={false} type="address" value={escrowAddress} />
              </div>
            )}
          </section>
          <section className="app-card case-advisor-card">
            <div>
              <Avatar size="small" />
              <p>
                <strong>{seededAdvisor.name}</strong>
                <span>● Usually replies in {seededAdvisor.reply}</span>
              </p>
            </div>
            <button className="secondary-button secondary-button--wide" type="button" onClick={goToMessages}>
              Message {seededAdvisor.first}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
};

const ApplicationsScreen = ({
  advisor,
  paid,
  seededApproved,
  hasNotif,
  goToSeeded,
  goToDemoCase,
  goToMarket,
}: {
  advisor: Advisor;
  paid: boolean;
  seededApproved: boolean;
  hasNotif: boolean;
  goToSeeded: () => void;
  goToDemoCase: () => void;
  goToMarket: () => void;
}) => (
  <div className="app-screen app-screen--applications">
    <h1>My Applications</h1>
    <p className="market-intro">All your active and recent engagements with immigration advisers.</p>

    <div className="applications-list">
      {/* Seeded application — always shown */}
      <article className="app-item" onClick={goToSeeded}>
        <div className="app-item__left">
          <Avatar size="small" />
          <div>
            <div className="app-item__name-row">
              <strong>{seededAdvisor.name}</strong>
              {hasNotif && <span className="app-item__notif-badge">Action needed</span>}
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
      </article>

      {/* Demo application — shown after payment */}
      {paid && (
        <article className="app-item" onClick={goToDemoCase}>
          <div className="app-item__left">
            <Avatar size="small" />
            <div>
              <div className="app-item__name-row">
                <strong>{advisor.name}</strong>
              </div>
              <span className="app-item__meta">
                {advisor.specialty} visa · {advisor.countries} · {formatMoney(advisor.fee)}
              </span>
            </div>
          </div>
          <div className="app-item__right">
            <span className="app-status-badge app-status-badge--progress">In progress · step 2</span>
            <span className="app-item__chevron">›</span>
          </div>
        </article>
      )}
    </div>

    <div className="applications-footer">
      <p>Looking for a new adviser?</p>
      <button className="secondary-button" type="button" onClick={goToMarket}>
        Browse advisers →
      </button>
    </div>
  </div>
);

const UserProfileScreen = ({
  address,
  displayEmail,
  escrowAddress,
  goBack,
  txHash,
}: {
  address?: string;
  displayEmail: string;
  escrowAddress?: string;
  goBack: () => void;
  txHash?: string;
}) => {
  const [name, setName] = useState("Your Name");
  const [email, setEmail] = useState(displayEmail !== "Account" ? displayEmail : "");
  const [phone, setPhone] = useState("");
  const [walletEmail, setWalletEmail] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="app-screen app-screen--user-profile">
      <button className="back-button" type="button" onClick={goBack}>
        ← Back
      </button>
      <div className="user-profile-layout">
        <div className="user-profile-main">
          <section className="app-card user-section">
            <div className="profile-hero">
              <span className="profile-initials-avatar">
                {name
                  .split(" ")
                  .map(w => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "?"}
              </span>
              <div>
                <h1>{name || "Your Name"}</h1>
                <p>{email || displayEmail}</p>
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
                  {address ? (
                    <ExplorerLink label="Privy wallet" shorten={false} type="address" value={address} />
                  ) : (
                    <strong>Privy wallet preparing…</strong>
                  )}
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
                  <strong>Escrow deposit — {seededAdvisor.name}</strong>
                  <span>18 Jul 2026 · {seededAdvisor.agreement.visaType}</span>
                  {txHash ? (
                    <ExplorerLink label="View payment transaction" shorten={false} type="tx" value={txHash} />
                  ) : (
                    escrowAddress && (
                      <ExplorerLink label="View escrow contract" shorten={false} type="address" value={escrowAddress} />
                    )
                  )}
                </div>
                <strong className="transaction-item__amount transaction-item__amount--out">
                  −{formatMoney(seededAdvisor.fee)}
                </strong>
              </div>
              <div className="transaction-item">
                <div>
                  <strong>Milestone 1 released — Consultation</strong>
                  <span>18 Jul 2026 · from escrow to {seededAdvisor.first}</span>
                </div>
                <strong className="transaction-item__amount transaction-item__amount--neutral">
                  {formatMoney(seededMilestones.consultation)}
                </strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const AdvisorsPage = () => {
  const { logout, user } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const [screen, setScreen] = useState<Screen>(() => getScreenFromPathname(pathname));
  const [filter, setFilter] = useState("All");
  const [selectedIndex, setSelectedIndex] = useState(() => getAdvisorIndexFromPathname(pathname) ?? 1);
  const [paidAdvisorIndex, setPaidAdvisorIndex] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paid, setPaid] = useState(false);
  const [receiptTxHash, setReceiptTxHash] = useState<string>();
  const [seededApproved, setSeededApproved] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [prevScreen, setPrevScreen] = useState<Screen>("market");
  const selectedAdvisor = advisors[selectedIndex];
  const paidAdvisor = advisors[paidAdvisorIndex];
  const onchain = useOnchainAdvisaFlow(selectedAdvisor);

  useEffect(() => {
    setScreen(getScreenFromPathname(pathname));
    const pathAdvisorIndex = getAdvisorIndexFromPathname(pathname);
    if (pathAdvisorIndex !== undefined) setSelectedIndex(pathAdvisorIndex);
  }, [pathname]);

  const displayEmail =
    user?.google?.email ?? user?.email?.address ?? (user?.phone?.number ? user.phone.number : null) ?? "Account";

  const handleSignOut = async () => {
    setPaid(false);
    setSeededApproved(false);
    setScreen("market");
    await logout();
    router.push("/");
  };

  const filteredAdvisors = advisors.filter(advisor => filter === "All" || advisor.specialty === filter);
  const showMarketTab =
    screen !== "case" &&
    screen !== "receipt" &&
    screen !== "applications" &&
    screen !== "seeded-case" &&
    screen !== "seeded-document" &&
    screen !== "messages";
  const notifCount = seededApproved ? 0 : 1;

  const openAdvisor = (advisor: Advisor) => {
    setSelectedIndex(advisors.indexOf(advisor));
    setScreen("profile");
    window.history.pushState(null, "", getScreenPath("profile", advisor));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeScreen = (nextScreen: Screen) => {
    setScreen(nextScreen);
    window.history.pushState(null, "", getScreenPath(nextScreen, selectedAdvisor));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openMessages = (advisor: Advisor, returnScreen: Screen) => {
    setPrevScreen(returnScreen);
    setSelectedIndex(advisors.indexOf(advisor));
    setScreen("messages");
    window.history.pushState(null, "", getScreenPath("messages", advisor));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openPaidCase = () => {
    setSelectedIndex(paidAdvisorIndex);
    setScreen("case");
    window.history.pushState(null, "", getScreenPath("case", paidAdvisor));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="advisors-app">
      <header className="app-topbar">
        <button className="advisa-logo app-logo-button" type="button" onClick={() => changeScreen("market")}>
          <AdVisaMark />
          <span className="advisa-logo__word">AdVisa</span>
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
            className={
              screen === "applications" ||
              screen === "case" ||
              screen === "receipt" ||
              screen === "seeded-case" ||
              screen === "seeded-document" ||
              screen === "messages"
                ? "app-tab app-tab--active"
                : "app-tab"
            }
            type="button"
            onClick={() => changeScreen("applications")}
          >
            My Applications
            {notifCount > 0 && <span className="app-tab__badge">{notifCount}</span>}
          </button>
        </nav>
        <div className="app-topbar__help">
          <div className="notif-wrapper">
            <button
              className="notif-bell-button"
              type="button"
              aria-label="Notifications"
              onClick={() => setNotifOpen(o => !o)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
            </button>
            {notifOpen && (
              <div className="notif-dropdown" role="menu">
                <div className="notif-dropdown__header">Notifications</div>
                {notifCount === 0 ? (
                  <div className="notif-empty">All caught up ✓</div>
                ) : (
                  <button
                    className="notif-item"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setNotifOpen(false);
                      changeScreen("seeded-case");
                    }}
                  >
                    <div className="notif-item__dot" />
                    <div>
                      <strong>Action needed</strong>
                      <p>
                        Amara Osei uploaded your INZ lodgement receipt — approve to release{" "}
                        {formatMoney(seededMilestones.filing)}.
                      </p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            className="app-topbar__profile-btn"
            type="button"
            onClick={() => {
              setPrevScreen(screen);
              changeScreen("user-profile");
            }}
          >
            <span>{displayEmail}</span>
            <Avatar size="small" />
          </button>
          <button className="app-signout-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
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
          escrowAddress={onchain.escrowAddress}
          goBack={() => changeScreen("market")}
          goToAgreement={() => changeScreen("agreement")}
        />
      )}
      {screen === "agreement" && (
        <AgreementScreen
          advisor={selectedAdvisor}
          agreementHash={onchain.agreementHash}
          anchorTxHash={onchain.anchorTxHash}
          escrowAddress={onchain.escrowAddress}
          goBack={() => changeScreen("profile")}
          goToPay={() => changeScreen("pay")}
          onSign={async () => {
            await onchain.signAgreement();
          }}
        />
      )}
      {screen === "pay" && (
        <PaymentScreen
          address={onchain.address}
          advisor={selectedAdvisor}
          escrowAddress={onchain.escrowAddress}
          fundEscrow={onchain.fundEscrow}
          method={paymentMethod}
          paymentStatus={onchain.paymentStatus}
          setMethod={setPaymentMethod}
          goBack={() => changeScreen("agreement")}
          confirm={txHash => {
            setReceiptTxHash(txHash);
            setPaidAdvisorIndex(selectedIndex);
            setPaid(true);
            changeScreen("receipt");
          }}
        />
      )}
      {screen === "receipt" && (
        <ReceiptScreen
          advisor={selectedAdvisor}
          escrowAddress={onchain.escrowAddress}
          method={paymentMethod}
          txHash={receiptTxHash ?? onchain.paymentTxHash}
          goToApplications={() => changeScreen("applications")}
        />
      )}
      {screen === "applications" && (
        <ApplicationsScreen
          advisor={paidAdvisor}
          paid={paid}
          seededApproved={seededApproved}
          hasNotif={!seededApproved}
          goToSeeded={() => changeScreen("seeded-case")}
          goToDemoCase={openPaidCase}
          goToMarket={() => changeScreen("market")}
        />
      )}
      {screen === "seeded-case" && (
        <SeededCaseScreen
          approved={seededApproved}
          escrowAddress={onchain.escrowAddress}
          onApprove={() => setSeededApproved(true)}
          goBack={() => changeScreen("applications")}
          goToDocument={() => changeScreen("seeded-document")}
          goToMessages={() => openMessages(seededAdvisor, "seeded-case")}
        />
      )}
      {screen === "seeded-document" && (
        <SeededDocumentScreen
          goBack={() => changeScreen("seeded-case")}
          goToMessages={() => openMessages(seededAdvisor, "seeded-document")}
        />
      )}
      {screen === "case" && (
        <CaseScreen
          advisor={selectedAdvisor}
          escrowAddress={onchain.escrowAddress}
          paid={paid}
          goToMarket={() => changeScreen("market")}
          goToMessages={() => openMessages(selectedAdvisor, "case")}
        />
      )}
      {screen === "messages" && (
        <MessageScreen
          advisor={selectedAdvisor}
          goBack={() =>
            changeScreen(
              prevScreen === "case" || prevScreen === "seeded-case" || prevScreen === "seeded-document"
                ? prevScreen
                : "applications",
            )
          }
        />
      )}
      {screen === "user-profile" && (
        <UserProfileScreen
          address={onchain.address}
          displayEmail={displayEmail}
          escrowAddress={onchain.escrowAddress}
          goBack={() => changeScreen(prevScreen)}
          txHash={receiptTxHash ?? onchain.paymentTxHash}
        />
      )}
    </div>
  );
};

export default AdvisorsPage;
