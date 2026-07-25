export type Advisor = {
  id: string;
  name: string;
  first: string;
  title: string;
  specialty: string;
  countries: string;
  flag: string;
  origin: string;
  rate: number;
  rating: number;
  cases: number;
  reviewCount: number;
  photoUrl: string;
  reply: string;
  fee: number;
  licenceRef: string;
  walletAddress: `0x${string}`;
  hash1: string;
  hash2: string;
  languages: string[];
  bio: string;
  agreement: {
    visaType: string;
    validityDays: number;
    plainSummary: string;
    redFlags: string[];
  };
};

export const advisors: Advisor[] = [
  {
    id: "daniel-reyes",
    name: "Daniel Reyes",
    first: "Daniel",
    title: "Licensed immigration adviser",
    specialty: "Student",
    countries: "New Zealand",
    flag: "🇲🇽",
    origin: "Mexico",
    rate: 96,
    rating: 4.8,
    cases: 148,
    reviewCount: 121,
    photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=85",
    reply: "~2h",
    fee: 1450,
    licenceRef: "IAA-2024001",
    walletAddress: "0x445432a7e9c2e4DCBEf1B131bFe56ad7B0dB20E9",
    hash1: "0x91b2…e04a",
    hash2: "0x3fa8…77c1",
    languages: ["English", "Spanish", "Mandarin"],
    bio: "Daniel specialises in student visa pathways to New Zealand universities and polytechnics. With 148 successful applications across undergraduate, postgraduate, and pathway programmes, he guides clients through the full process from offer letter to visa grant — including health and character requirements.",
    agreement: {
      visaType: "Student Visa (Specific Purpose)",
      validityDays: 60,
      plainSummary:
        "This agreement covers Daniel Reyes preparing and lodging your New Zealand student visa application. You will pay $1,450 in total, split across three steps: $290 is released after your initial consultation and document checklist review, $580 after Daniel lodges the application with INZ, and $580 after INZ issues a decision letter. If Daniel does not lodge within 60 days of you signing, the unfunded portions return to you automatically.",
      redFlags: [],
    },
  },
  {
    id: "amara-osei",
    name: "Amara Osei, LL.M.",
    first: "Amara",
    title: "Licensed immigration adviser",
    specialty: "Work",
    countries: "New Zealand",
    flag: "🇬🇭",
    origin: "Ghana",
    rate: 94,
    rating: 4.9,
    cases: 212,
    reviewCount: 187,
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=85",
    reply: "~1h",
    fee: 1800,
    licenceRef: "IAA-2024002",
    walletAddress: "0x445432a7e9c2e4DCBEf1B131bFe56ad7B0dB20E9",
    hash1: "0x8f3a…c21e",
    hash2: "0x6d90…b3f4",
    languages: ["English", "French", "Twi"],
    bio: "Amara holds an LL.M. in immigration law and has handled over 200 work visa cases across Accredited Employer, Essential Skills, and Talent (Accredited Employer) categories. She is known for fast turnaround and clear written communication — her clients consistently report that every milestone was explained before any money moved.",
    agreement: {
      visaType: "Accredited Employer Work Visa (AEWV)",
      validityDays: 45,
      plainSummary:
        "This agreement covers Amara Osei preparing and lodging your Accredited Employer Work Visa application. The total fee is $1,800, paid in three escrow tranches: $360 on consultation completion and document review, $720 after she lodges the application with INZ, and $720 after you receive the INZ decision letter. If lodgement has not occurred within 45 days of your signature, all unfunded amounts are returned to you automatically — no claim or dispute process needed.",
      redFlags: [],
    },
  },
  {
    id: "mei-lin-chow",
    name: "Mei-Lin Chow",
    first: "Mei-Lin",
    title: "Licensed immigration adviser",
    specialty: "Family",
    countries: "New Zealand",
    flag: "🇭🇰",
    origin: "Hong Kong",
    rate: 91,
    rating: 4.7,
    cases: 176,
    reviewCount: 143,
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=85",
    reply: "~4h",
    fee: 1200,
    licenceRef: "IAA-2024003",
    walletAddress: "0x445432a7e9c2e4DCBEf1B131bFe56ad7B0dB20E9",
    hash1: "0x4dc7…a911",
    hash2: "0xb27e…d05c",
    languages: ["English", "Mandarin", "Cantonese"],
    bio: "Mei-Lin focuses exclusively on family and partnership visa categories, including Partner of a New Zealander, Parent, and Dependent Child visas. She provides support in Mandarin and Cantonese and has a particular strength in assembling relationship evidence packages that meet INZ's proof-of-partnership requirements.",
    agreement: {
      visaType: "Partner of a New Zealander (Resident Visa)",
      validityDays: 90,
      plainSummary:
        "This agreement covers Mei-Lin Chow preparing your Partner of a New Zealander resident visa application, including relationship evidence compilation and character/health clearances. The total fee is $1,200, split across three tranches: $240 released after consultation and document checklist sign-off, $480 after lodgement with INZ, and $480 after the INZ decision. The lodgement deadline is 90 days from the date you both sign — after which, any unfunded balance returns to you without requiring any action on your part.",
      redFlags: [],
    },
  },
  {
    id: "tomas-novak",
    name: "Tomas Novak",
    first: "Tomas",
    title: "Licensed immigration adviser",
    specialty: "Permanent residency",
    countries: "New Zealand",
    flag: "🇨🇿",
    origin: "Czech Republic",
    rate: 89,
    rating: 4.8,
    cases: 231,
    reviewCount: 198,
    photoUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=256&q=85",
    reply: "~3h",
    fee: 2400,
    licenceRef: "IAA-2024004",
    walletAddress: "0x445432a7e9c2e4DCBEf1B131bFe56ad7B0dB20E9",
    hash1: "0x77aa…1f2b",
    hash2: "0x0c4d…98e7",
    languages: ["English", "Czech", "Slovak"],
    bio: "Tomas has the most permanent residency approvals of any adviser on the platform. He specialises in Skilled Migrant Category and Residence from Work pathways, and has handled complex cases involving points calculations, Expression of Interest strategy, and employer obligations. His clients rate his documentation thoroughness as his standout quality.",
    agreement: {
      visaType: "Skilled Migrant Category (Residence Visa)",
      validityDays: 120,
      plainSummary:
        "This agreement covers Tomas Novak managing your Skilled Migrant Category residence application from Expression of Interest submission through to visa grant. The total fee is $2,400, released in three stages: $480 after consultation and Expression of Interest review, $960 after INZ selects your EOI and Tomas lodges the full residence application, and $960 after INZ issues a final residence decision. The lodgement window is 120 days. If lodgement does not occur within that period, all unfunded tranches are automatically returned.",
      redFlags: [],
    },
  },
  {
    id: "sofia-marino",
    name: "Sofia Marino",
    first: "Sofia",
    title: "Licensed immigration adviser",
    specialty: "Tourist",
    countries: "New Zealand",
    flag: "🇮🇹",
    origin: "Italy",
    rate: 88,
    rating: 4.6,
    cases: 94,
    reviewCount: 71,
    photoUrl: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=256&q=85",
    reply: "~2h",
    fee: 650,
    licenceRef: "IAA-2024005",
    walletAddress: "0x445432a7e9c2e4DCBEf1B131bFe56ad7B0dB20E9",
    hash1: "0xe19c…44d0",
    hash2: "0x52b6…c8a3",
    languages: ["English", "Italian", "Spanish"],
    bio: "Sofia handles visitor visa applications for New Zealand, with a focus on clients who have had previous refusals or complex travel histories. She works with clients from European, Latin American, and Southeast Asian backgrounds and is known for building well-evidenced applications that address INZ officer concerns head-on.",
    agreement: {
      visaType: "Visitor Visa (Multiple Entry)",
      validityDays: 30,
      plainSummary:
        "This agreement covers Sofia Marino preparing and lodging your New Zealand visitor visa application. The total fee is $650, split across three tranches: $130 after consultation and funds check review, $260 after she lodges your application with INZ, and $260 once INZ issues its decision. The full lodgement must happen within 30 days of signing. If it does not, any remaining balance in escrow is returned to you automatically.",
      redFlags: [],
    },
  },
  {
    id: "yusuf-adeyemi",
    name: "Yusuf Adeyemi",
    first: "Yusuf",
    title: "Licensed immigration adviser",
    specialty: "Work",
    countries: "New Zealand",
    flag: "🇳🇬",
    origin: "Nigeria",
    rate: 87,
    rating: 4.7,
    cases: 165,
    reviewCount: 139,
    photoUrl: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=256&q=85",
    reply: "~5h",
    fee: 1600,
    licenceRef: "IAA-2024006",
    walletAddress: "0x445432a7e9c2e4DCBEf1B131bFe56ad7B0dB20E9",
    hash1: "0xa30f…6e12",
    hash2: "0x9d81…f450",
    languages: ["English", "Yoruba", "Hausa", "Arabic"],
    bio: "Yusuf specialises in work visas for clients from West Africa and the Gulf region, where he has strong knowledge of sector-specific requirements for trades, healthcare, and engineering roles. He conducts consultations in English, Yoruba, Hausa, and Arabic, and has advised clients from Nigeria, Saudi Arabia, the UAE, and Ghana.",
    agreement: {
      visaType: "Accredited Employer Work Visa (AEWV)",
      validityDays: 45,
      plainSummary:
        "This agreement covers Yusuf Adeyemi preparing and lodging your Accredited Employer Work Visa application. The total fee is $1,600, paid in three escrow tranches: $320 after consultation and employer accreditation check, $640 after Yusuf lodges the full application with INZ, and $640 after INZ issues its visa decision. Lodgement must occur within 45 days of signing. If it does not, the unfunded balance is returned to you automatically with no action needed on your part.",
      redFlags: [],
    },
  },
];

export const formatMoney = (amount: number) => `$${amount.toLocaleString("en-US")}`;

export const getRateColor = (rate: number) => {
  const hue = Math.max(0, Math.min(120, (rate - 80) * (120 / 16)));
  return `hsl(${hue}, 62%, 34%)`;
};

export const getMilestones = (advisor: Advisor) => {
  const consultation = Math.round(advisor.fee * 0.2);
  const filing = Math.round(advisor.fee * 0.4);

  return {
    consultation,
    filing,
    decision: advisor.fee - consultation - filing,
  };
};
