-- AdVisa Supabase schema — off-chain data only (see docs/ARCHITECTURE.md).
--
-- Owner: Privy/Supabase/demo-assembly track. Ask here before adding a column or
-- table so the shared names in CONTEXT.md stay in sync across tracks.
--
-- How to apply: paste this whole file into the Supabase project's SQL editor and run
-- it (Table Editor -> SQL Editor -> New query). Safe to re-run — every statement is
-- idempotent (`if not exists`).
--
-- RLS policy: every table below has RLS enabled with NO policies for `anon` or
-- `authenticated`. That is deliberate, not an oversight. We authenticate users with
-- Privy, not Supabase Auth, so there is no `auth.uid()` to key policies on. Rather than
-- half-wiring a third-party-JWT integration under hackathon deadline pressure, every
-- read and write goes through a Next.js server route using the service-role client
-- (packages/nextjs/services/supabase/server.ts), which bypasses RLS entirely. If the
-- frontend needs to show a migrant their own engagement, add a server route that
-- queries with the service-role key and returns only the fields it should see — don't
-- open a table-level policy to the anon key.

create extension if not exists pgcrypto;

-- Live IAA register lookups, cached with a timestamp (docs/INTEGRATIONS.md § 2).
-- Never store licence status on-chain — only its cache lives here, re-read at every
-- milestone; anything older than 24h is stale and must be re-checked.
create table if not exists adviser_licence_cache (
  licence_ref text primary key,
  name text not null,
  status text not null check (status in ('licensed', 'not_licensed', 'suspended', 'cancelled')),
  checked_at timestamptz not null default now()
);

-- One row per VisaEscrow engagement. `contract_engagement_id` is the on-chain uint256
-- id from VisaEscrow.createEngagement — nullable until the on-chain engagement exists.
-- `migrant_id` / `adviser_id` are the same addresses used on-chain (Privy embedded
-- wallet addresses), not a separate off-chain identity system.
create table if not exists engagements (
  id uuid primary key default gen_random_uuid(),
  migrant_id text not null,
  adviser_id text not null,
  adviser_licence_ref text references adviser_licence_cache (licence_ref),
  contract_engagement_id bigint unique,
  agreement_pdf_path text,
  lumin_document_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists engagements_migrant_id_idx on engagements (migrant_id);
create index if not exists engagements_adviser_id_idx on engagements (adviser_id);

-- Uploaded fee agreement PDFs and the Anthropic extraction output (milestones,
-- amounts, plain-language summary, translation, red flags — docs/INTEGRATIONS.md § 3).
-- The PDF itself lives in Supabase Storage at `storage_path`; only its sha256 goes
-- on-chain, never the document contents.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id),
  storage_path text not null,
  extracted_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists documents_engagement_id_idx on documents (engagement_id);

alter table adviser_licence_cache enable row level security;
alter table engagements enable row level security;
alter table documents enable row level security;
