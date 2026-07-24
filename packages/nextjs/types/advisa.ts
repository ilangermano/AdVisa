/**
 * Shared AdVisa types. Do not change field names or structure — other tracks
 * (escrow funding, Lumin webhook) depend on the exact shape.
 *
 * amounts are in NZD (e.g. 800, 2400, 800) — Track 4 must multiply by
 * 10n ** 18n when calling VisaEscrow.createEngagement().
 *
 * dueInWorkingDays is the AI-extracted relative deadline. Track 4 converts
 * this to an absolute unix timestamp when constructing the deadlines[] array
 * for createEngagement(). A value of 0 means no deadline (e.g. awaiting INZ).
 */

export type Milestone = {
  name: string;
  description: string;
  amount: number;
  dueInWorkingDays: number;
};

export type RedFlag = {
  severity: "high" | "medium" | "low";
  issue: string;
};

export type ExtractionResult = {
  milestones: Milestone[];
  totalFee: number;
  currency: string;
  plainLanguageSummary: string;
  translatedSummary: string;
  redFlags: RedFlag[];
};
