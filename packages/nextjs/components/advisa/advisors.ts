export type Advisor = {
  name: string;
  first: string;
  title: string;
  specialty: string;
  countries: string;
  rate: number;
  rating: number;
  cases: number;
  reviewCount: number;
  reply: string;
  fee: number;
  hash1: string;
  hash2: string;
};

export const advisors: Advisor[] = [
  {
    name: "Daniel Reyes",
    first: "Daniel",
    title: "Licensed immigration adviser",
    specialty: "Student",
    countries: "New Zealand",
    rate: 96,
    rating: 4.8,
    cases: 148,
    reviewCount: 121,
    reply: "~2h",
    fee: 1450,
    hash1: "0x91b2…e04a",
    hash2: "0x3fa8…77c1",
  },
  {
    name: "Amara Osei, LL.M.",
    first: "Amara",
    title: "Licensed immigration adviser",
    specialty: "Work",
    countries: "New Zealand",
    rate: 94,
    rating: 4.9,
    cases: 212,
    reviewCount: 187,
    reply: "~1h",
    fee: 1800,
    hash1: "0x8f3a…c21e",
    hash2: "0x6d90…b3f4",
  },
  {
    name: "Mei-Lin Chow",
    first: "Mei-Lin",
    title: "Licensed immigration adviser",
    specialty: "Family",
    countries: "New Zealand",
    rate: 91,
    rating: 4.7,
    cases: 176,
    reviewCount: 143,
    reply: "~4h",
    fee: 1200,
    hash1: "0x4dc7…a911",
    hash2: "0xb27e…d05c",
  },
  {
    name: "Tomas Novak",
    first: "Tomas",
    title: "Licensed immigration adviser",
    specialty: "Permanent residency",
    countries: "New Zealand",
    rate: 89,
    rating: 4.8,
    cases: 231,
    reviewCount: 198,
    reply: "~3h",
    fee: 2400,
    hash1: "0x77aa…1f2b",
    hash2: "0x0c4d…98e7",
  },
  {
    name: "Sofia Marino",
    first: "Sofia",
    title: "Licensed immigration adviser",
    specialty: "Tourist",
    countries: "New Zealand",
    rate: 88,
    rating: 4.6,
    cases: 94,
    reviewCount: 71,
    reply: "~2h",
    fee: 650,
    hash1: "0xe19c…44d0",
    hash2: "0x52b6…c8a3",
  },
  {
    name: "Yusuf Adeyemi",
    first: "Yusuf",
    title: "Licensed immigration adviser",
    specialty: "Work",
    countries: "New Zealand",
    rate: 87,
    rating: 4.7,
    cases: 165,
    reviewCount: 139,
    reply: "~5h",
    fee: 1600,
    hash1: "0xa30f…6e12",
    hash2: "0x9d81…f450",
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
