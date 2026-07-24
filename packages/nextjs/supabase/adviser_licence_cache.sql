create table if not exists public.adviser_licence_cache (
  licence_ref text primary key,
  name text not null,
  status text not null,
  checked_at timestamptz not null default now()
);

alter table public.adviser_licence_cache drop constraint if exists adviser_licence_cache_status_check;
alter table public.adviser_licence_cache
  add constraint adviser_licence_cache_status_check
  check (status in ('licensed', 'not_licensed', 'unknown'));

create index if not exists adviser_licence_cache_name_idx
  on public.adviser_licence_cache (lower(name));

alter table public.adviser_licence_cache enable row level security;

grant select, insert, update on table public.adviser_licence_cache to service_role;

comment on table public.adviser_licence_cache is
  'Server-side cache for live IAA licence checks. Positive rows use keccak256(licenceNumber); negative lookups use an internal deterministic lookup hash and must not be passed on-chain.';
