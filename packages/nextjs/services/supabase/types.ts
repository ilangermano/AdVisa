// Hand-written to match supabase/schema.sql exactly. If you change a column there,
// change it here in the same commit — this isn't generated from a live project.

export type AdviserLicenceStatus = "licensed" | "not_licensed" | "unknown" | "suspended" | "cancelled";

export type AdviserLicenceCacheRow = {
  licence_ref: string;
  name: string;
  status: AdviserLicenceStatus;
  checked_at: string;
};

export type EngagementRow = {
  id: string;
  migrant_id: string;
  adviser_id: string;
  adviser_licence_ref: string | null;
  contract_engagement_id: number | null;
  agreement_pdf_path: string | null;
  lumin_document_id: string | null;
  created_at: string;
};

// Shape produced by the Anthropic extraction route (docs/INTEGRATIONS.md § 3).
export type ExtractedAgreement = {
  milestones: { name: string; description: string; amount: number; dueInWorkingDays: number }[];
  totalFee: number;
  currency: string;
  plainLanguageSummary: string;
  translatedSummary: string;
  redFlags: { severity: "high" | "medium" | "low"; issue: string }[];
};

export type DocumentRow = {
  id: string;
  engagement_id: string;
  storage_path: string;
  extracted_json: ExtractedAgreement | null;
  created_at: string;
};

type TableDef<Row, InsertDefaults extends keyof Row> = {
  Row: Row;
  Insert: Omit<Row, InsertDefaults> & Partial<Pick<Row, InsertDefaults>>;
  Update: Partial<Row>;
};

export type Database = {
  public: {
    Tables: {
      adviser_licence_cache: TableDef<AdviserLicenceCacheRow, "checked_at">;
      engagements: TableDef<
        EngagementRow,
        | "id"
        | "created_at"
        | "adviser_licence_ref"
        | "contract_engagement_id"
        | "agreement_pdf_path"
        | "lumin_document_id"
      >;
      documents: TableDef<DocumentRow, "id" | "created_at" | "extracted_json">;
    };
  };
};
