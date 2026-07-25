# PLAN.md — AdVisa Demo Readiness

**Deadline: Sunday 26 July 2026, 10:30am — Web3NZ Hackathon, University of Canterbury**

Tick each box as you complete it. If you pick this up mid-run, start from the first unchecked item.

---

## What Is Already Done

- [x] `VisaEscrow.sol` hardened — zero-value, same-party, expired-deadline, empty-proof all revert
- [x] Admin and relayer roles separated; OZ delayed two-step admin transfer
- [x] 16 contract tests passing (`yarn test`)
- [x] Privy Email / Google / SMS sign-in wired (`providers.tsx`)
- [x] Every user gets a Privy embedded wallet on first login
- [x] Interface waits for wallet creation + testnet gas before enabling escrow console
- [x] Server API routes verify Privy access tokens (`services/privy/server.ts`)
- [x] Gas top-up endpoint (0.001 ETH) — sends only to the authenticated user's embedded wallet, rate-limited
- [x] Operator/admin routes require a Privy admin DID
- [x] AI extraction (`/api/extract-agreement`) — PDF → 3 milestones + amounts + red flags
- [x] Multi-language plain-language summary — English, हिन्दी, Português, دری in one Anthropic call
- [x] `/upload` page — PDF upload, milestone cards, language toggle, red flags panel
- [x] IAA licence check (`/api/licence-check`) — live MBIE scrape + Supabase 24h cache
- [x] Lumin webhook handler (`/api/webhooks/lumin`) — HMAC verify → SHA-256 PDF hash → `anchorAgreement` on-chain
- [x] Lumin signing-request creation (`/api/lumin/signing-requests`)
- [x] Escrow admin panel (`/api/escrow/admin`) — submitProof, completeMilestone, refundAfterLicenceCheck, pause/resume clock
- [x] Clock fast-forward (`/api/escrow/fast-forward`) — Hardhat `evm_increaseTime` for demo
- [x] `EscrowDemo` component wired to wagmi + scaffold-eth hooks
- [x] `/ops` page for admin actions
- [x] `/demo` page shell with 8-step demo checklist
- [x] `yarn next:build`, lint, and type-check all pass
- [x] `newIlan` branch pushed with API key removed from history

---

## Phase 1 — Privy Dashboard Setup [DO THIS NOW]

- [ ] Go to https://privy.io/dashboard → create a **Web** application named "AdVisa"
- [ ] Enable login methods: **Email**, **Google**, optionally SMS
- [ ] Enable **Ethereum embedded wallets** → select "all users" (not "users without wallets")
- [ ] Add allowed origin: `http://localhost:3000`
- [ ] Copy **App ID** (safe to share) and **App Secret** (never commit or paste publicly)
- [ ] Copy `.env.example` → `.env.local`:
  ```
  cp packages/nextjs/.env.example packages/nextjs/.env.local
  ```
- [ ] Set in `.env.local`:
  ```
  NEXT_PUBLIC_PRIVY_APP_ID=<your-app-id>
  PRIVY_APP_SECRET=<your-app-secret>
  ANTHROPIC_API_KEY=<new-rotated-key>
  ```
- [ ] **[SECURITY]** Rotate the old Anthropic key at https://console.anthropic.com — the key starting `sk-ant-api03-pRuhX5...` was committed to git and is compromised

---

## Phase 2 — First Login & Admin DID

- [ ] Start the app: three terminals:
  ```
  yarn chain
  yarn deploy
  yarn start
  ```
- [ ] Open http://localhost:3000 → sign in with your email via Privy
- [ ] Privy creates your embedded wallet automatically — wait for the "wallet ready" state
- [ ] Go to https://privy.io/dashboard → Users → find your account → copy your **DID** (looks like `did:privy:abc123`)
- [ ] Add to `.env.local`:
  ```
  PRIVY_ADMIN_USER_IDS=did:privy:<your-did>
  ```
  (comma-separate if multiple team members need ops access)
- [ ] Restart `yarn start` → confirm `/ops` page is accessible with your account

---

## Phase 3 — Full Env Vars (local `.env.local` + Vercel dashboard)

All of these must be set before the demo works end-to-end:

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com — **must be the NEW rotated key** |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy dashboard → App ID |
| `PRIVY_APP_SECRET` | Privy dashboard → App Secret |
| `PRIVY_ADMIN_USER_IDS` | Your Privy DID (from Phase 2) |
| `LUMIN_API_KEY` | Lumin dashboard |
| `LUMIN_WEBHOOK_SECRET` | Lumin dashboard (used for HMAC in `/api/webhooks/lumin`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `RELAYER_PRIVATE_KEY` | The server wallet that holds `RELAYER_ROLE` on the contract |
| `ESCROW_ADMIN_ADDRESS` | A recoverable wallet you control (not the relayer) |
| `BASE_SEPOLIA_RPC_URL` | Alchemy / QuickNode — server-side |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` | Same or `https://sepolia.base.org` |
| `DNZD_TOKEN_ADDRESS` | NewMoney's confirmed dNZD address on Base Sepolia |
| `DEPLOYER_PRIVATE_KEY` | Hardhat `.env` only — funded with Base Sepolia ETH for gas |
| `HARDHAT_RPC_URL` | `http://127.0.0.1:8545` (local only, not Vercel) |

---

## Phase 4 — Supabase Setup

- [ ] Create Supabase project (or confirm existing one is live)
- [ ] Create tables:
  - `licence_checks (adviser_name, status, licence_number, checked_at, raw)`
  - `engagements (id, chain_id, on_chain_id, lumin_document_id, state, migrant_address, adviser_address)`
- [ ] Create private Storage bucket named `documents` (for signed PDFs)
- [ ] Set RLS: service role bypasses all, anon role has no read access to sensitive tables
- [ ] Confirm `services/licence-check/supabase.ts` connects and caches correctly

---

## Phase 5 — Branch Merge

- [ ] Open PR: `newIlan` → `main` (AI extraction + multi-language)
- [ ] Merge — resolve any conflicts against latest `main`
- [ ] Pull latest `main` locally, run `yarn next:build` to confirm zero TS errors
- [ ] Also confirm Allen's Privy branch is merged into `main` (commit `d95b22f`)

---

## Phase 6 — Smart Contract Deploy to Base Sepolia

- [ ] Confirm `baseSepolia` network is in `packages/hardhat/hardhat.config.ts`
- [ ] Fund deployer wallet with Base Sepolia ETH (`yarn account` to print address)
- [ ] Get `DNZD_TOKEN_ADDRESS` from NewMoney — confirm it has contract code on Base Sepolia
- [ ] Set `DEPLOYER_PRIVATE_KEY` and `DNZD_TOKEN_ADDRESS` in `packages/hardhat/.env`
- [ ] Deploy: `yarn deploy --network baseSepolia`
- [ ] Grant `RELAYER_ROLE` to the relayer wallet (in deploy script or via manual `grantRole` tx)
- [ ] Confirm `deployedContracts.ts` auto-updates with chain `84532` entries
- [ ] Add `chains.baseSepolia` to `targetNetworks` in `packages/nextjs/scaffold.config.ts`
- [ ] Optional: `yarn verify --network baseSepolia` for BaseScan explorer

---

## Phase 7 — Lumin Integration Live Test

- [ ] Register webhook URL in Lumin dashboard: `https://<vercel-url>/api/webhooks/lumin`
- [ ] For local dev: `ngrok http 3000` and register the ngrok URL
- [ ] Create a test signing request via `/api/lumin/signing-requests`
- [ ] Both parties sign in Lumin
- [ ] Confirm webhook fires → `anchorAgreement` called on-chain → `AgreementAnchored` event visible
- [ ] Confirm `fund()` is now unlocked (reverts before anchor, succeeds after)

---

## Phase 8 — 8-Step Demo End-to-End (local Hardhat first, then Base Sepolia)

Run the full demo path. If any step fails, fix before moving to deploy.

- [ ] **Step 1** — Enter an unlicensed adviser → licence check returns blocked, UI shows error
- [ ] **Step 2** — Enter "Josh Morton" (or a real licensed name) → passes, shows licence details
- [ ] **Step 3** — Upload `test-agreement.pdf` (print `test-agreement.html` → PDF) → AI extracts 3 milestones live, red flags shown
- [ ] **Step 4** — Click Hindi button → translated summary appears instantly (no loading spinner — it's pre-fetched)
- [ ] **Step 5** — Lumin signing completes → PDF hash anchored on-chain → hash shown in UI
- [ ] **Step 6** — Migrant sets dNZD allowance → calls `fund()` → first 20% tranche ($800) auto-releases to adviser
- [ ] **Step 7** — Click "Advance Clock" in `/ops` → moves chain time past milestone deadline + 5-day grace period
- [ ] **Step 8** — "Reclaim" button activates in `EscrowDemo` → migrant calls `reclaimTranche()` → remaining $3,200 returns to migrant wallet → confirm balance

---

## Phase 9 — Frontend Deploy to Vercel

- [ ] Push all merged changes to `main`
- [ ] Run `yarn vercel:yolo --prod` OR push and let Vercel auto-deploy
- [ ] In Vercel dashboard → Settings → Environment Variables: add every variable from Phase 3
- [ ] Add Vercel production URL as allowed origin in Privy dashboard
- [ ] Update Lumin webhook URL to the Vercel production URL
- [ ] Confirm Vercel build succeeds (check build logs)
- [ ] Visit prod URL → confirm wallet connect + Privy login works
- [ ] Run through demo steps 1–4 on prod to confirm AI + licence check work

---

## Phase 10 — Morning-of Pre-Demo Checklist (before 10:30am)

- [ ] Relayer wallet has Base Sepolia ETH for gas (check with `cast balance <relayer-address> --rpc-url https://sepolia.base.org`)
- [ ] Demo migrant wallet has NewMoney test dNZD — minimum NZ$4,000 — coordinate with NewMoney
- [ ] `test-agreement.pdf` on your laptop (print `test-agreement.html` via browser → Save as PDF)
- [ ] Lumin: both demo accounts (migrant + adviser) are set up and can receive signing emails
- [ ] `/ops` page is accessible with admin Privy account
- [ ] Run one full end-to-end dry run on prod — no surprises
- [ ] Know the 3 Q&A answers judges will ask:
  1. **"Why blockchain?"** — we can't be the custodian; a contract refunds the migrant even if AdVisa disappears
  2. **"Can your company stop a refund?"** — No. `reclaimTranche` is caller-controlled; RELAYER_ROLE cannot block it
  3. **"NZ trust-account rules?"** — Known limitation, say it out loud: stablecoin escrow may not satisfy the conduct code; real blocker for production, not for the demo

---

## Known Limitations (say in the pitch, do not hide)

1. Relayer is a single hot key — production needs multisig or a durable relayer service
2. Stablecoin escrow may not satisfy NZ trust-account conduct rules — real blocker, not a detail
3. NewMoney test dNZD has no real monetary value
4. IAA register scraper depends on MBIE's undocumented JSON API — can break without notice
5. `ADVISA_DEMO_MODE=true` bypasses auth — never set this in production

---

## Quick Reference

| Command | What it does |
|---|---|
| `yarn chain` | Start local Hardhat node |
| `yarn deploy` | Deploy contracts to local (chain 31337) |
| `yarn deploy --network baseSepolia` | Deploy to Base Sepolia (chain 84532) |
| `yarn start` | Next.js dev server at localhost:3000 |
| `yarn test` | Run contract tests (expect 16 passing) |
| `yarn next:build` | Build frontend — catches TypeScript errors |
| `yarn vercel:yolo --prod` | Deploy frontend to Vercel production |
| `yarn verify --network baseSepolia` | Verify contracts on BaseScan |

| Key File | What it is |
|---|---|
| `packages/hardhat/contracts/VisaEscrow.sol` | Hardened escrow contract |
| `packages/hardhat/contracts/MockNZDD.sol` | Local-only test token |
| `packages/hardhat/deploy/01_deploy_advisa.ts` | Deploy script |
| `packages/hardhat/test/VisaEscrow.ts` | 16 contract tests |
| `packages/nextjs/app/providers.tsx` | Privy + wagmi provider (line 44) |
| `packages/nextjs/services/privy/server.ts` | Server-side Privy auth helpers |
| `packages/nextjs/contexts/PrivyWalletSetupContext.tsx` | Wallet readiness gate |
| `packages/nextjs/app/api/extract-agreement/route.ts` | AI extraction — PDF → milestones |
| `packages/nextjs/app/api/licence-check/route.ts` | IAA register check |
| `packages/nextjs/app/api/webhooks/lumin/route.ts` | Lumin signing webhook |
| `packages/nextjs/app/api/lumin/signing-requests/route.ts` | Create Lumin signing request |
| `packages/nextjs/app/api/escrow/admin/route.ts` | Relayer admin actions |
| `packages/nextjs/app/api/escrow/fast-forward/route.ts` | Clock advance (local only) |
| `packages/nextjs/app/api/wallet/prefund/route.ts` | Gas top-up for embedded wallets |
| `packages/nextjs/app/upload/_components/AgreementExtractor.tsx` | PDF upload + AI UI |
| `packages/nextjs/app/demo/page.tsx` | 8-step demo page |
| `packages/nextjs/app/ops/page.tsx` | Ops / admin panel |
| `packages/nextjs/app/_components/EscrowDemo.tsx` | Escrow interaction component |
| `packages/nextjs/components/LicenceCheckPanel.tsx` | Licence check UI |
| `packages/nextjs/types/advisa.ts` | Shared TypeScript types |
| `packages/nextjs/scaffold.config.ts` | Target networks + polling config |
| `packages/nextjs/contracts/deployedContracts.ts` | Auto-generated ABI + addresses |
| `CONTEXT.md` | Full project brief + non-negotiable rules |
| `docs/SCOPE.md` | MUST/SHOULD/CUT list + 8-step demo path |
| `docs/CONTRACTS.md` | VisaEscrow design + all function signatures |
| `docs/INTEGRATIONS.md` | Lumin, IAA, Anthropic, Privy details |
| `SETUP.md` | Setup steps for new devs |
