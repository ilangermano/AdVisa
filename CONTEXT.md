# CONTEXT.md — AdVisa master brief

## What this is
AdVisa is escrow and verification rails for New Zealand immigration adviser fees. A
migrant engages a licensed immigration adviser. We check the adviser's licence against
the public IAA register before any money moves. The legally-required fee agreement is
signed through Lumin and its hash is anchored on-chain. The fee sits in escrow and
releases in tranches against milestones. If the adviser misses a deadline or loses their
licence, the money returns to the migrant automatically.

**We are NOT an immigration advice service.** We are payment and verification
infrastructure underneath licensed advisers. Never write copy implying otherwise.

Built for the Web3NZ Hackathon, University of Canterbury, Christchurch, 24–26 July 2026.
Submission deadline: **Sunday 10:30am**.

Full detail lives in `docs/`: `SCOPE.md` (what to build), `CONTRACTS.md` (the escrow
design), `INTEGRATIONS.md` (Lumin, IAA, Anthropic, Privy, tokens), `ARCHITECTURE.md`
(on-chain vs off-chain, why a chain at all), `PRODUCT.md` (facts, numbers, pitch — do not
invent new ones).

## Non-negotiable rules
1. **No personal data on-chain. Ever.** Only SHA-256 hashes, addresses, amounts,
   timestamps, enums. No names, passport numbers, visa categories, emails, or document
   contents. If you are about to write a `string` to a contract, stop.
2. **Milestones pay for actions, never outcomes.** A tranche may be tied to "application
   lodged with INZ" but never "visa approved". Advisers do not control INZ decisions.
3. **Licence status is read live, never stored on-chain.** Mutable government data. Cache
   in Supabase with a timestamp; re-read at every milestone.
4. **Both sides get protection.** Migrant can reclaim on adviser delay. Adviser can claim
   on migrant non-response. Do not build only the sympathetic half.
5. **Escrow uses `IERC20`, never a hardcoded token address.** MockNZDD on testnet, real
   dNZD in production. Same code.

## Stack — exact, do not substitute
| Layer | Choice |
|---|---|
| Contracts | Solidity ^0.8.24 + Hardhat (via Scaffold-ETH 2) |
| Libraries | OpenZeppelin Contracts v5 — SafeERC20, ReentrancyGuard, AccessControl |
| Frontend | Next.js App Router + TypeScript |
| Contract hooks | wagmi + viem (Scaffold-ETH auto-generates these) |
| Auth + wallets | Privy — embedded wallets, email login, no seed phrase |
| Off-chain data | Supabase — Postgres + Storage + RLS |
| AI | Anthropic API, model `claude-sonnet-4-6` |
| Signing | Lumin Sign API + webhooks |
| Hosting | Vercel |

Do NOT use Remix — all contract work lives in `packages/hardhat` with tests.
Do NOT use Reown/WalletConnect for our own auth flow — Privy only.

## Networks
Deploy identical contracts to both. Never fork contract source per chain.

| Network | Chain ID | RPC |
|---|---|---|
| Ethereum Sepolia | 11155111 | `process.env.SEPOLIA_RPC_URL` |
| Avalanche Fuji | 43113 | `https://api.avax-test.network/ext/bc/C/rpc` |

Fire Eyes prize track ($1000) requires Ethereum; Avalanche track ($500) requires C-Chain.

## Commands
```bash
yarn chain                        # local hardhat node
yarn deploy                       # deploy to local chain
yarn deploy --network sepolia     # testnet deploy
yarn deploy --network fuji
yarn start                        # nextjs dev server, localhost:3000
yarn test                         # hardhat test suite (packages/hardhat)
yarn account                      # print/fund deployer address
```

## Layout
```
CONTEXT.md, SETUP.md, README.md     — root docs
docs/                               — SCOPE, CONTRACTS, INTEGRATIONS, ARCHITECTURE, PRODUCT
packages/hardhat/contracts/         — VisaEscrow.sol, MockNZDD.sol
packages/hardhat/deploy/            — rocketh deploy scripts (numbered)
packages/hardhat/test/              — mocha/chai tests
packages/nextjs/app/                — Next.js App Router
packages/nextjs/app/api/webhooks/   — server-only route handlers (Lumin, etc.)
```

## Style
- TypeScript strict, no `any`
- Solidity: custom errors not `require` strings, NatSpec on every external function
- Money in smallest unit (`uint256`, 18 decimals), never floats
- Server secrets never in the client bundle — Anthropic and Lumin keys are server-only
- Commits: `feat:` `fix:` `docs:` `chore:`

## Known limitations — say these out loud in the pitch, do not hide
- The anchor is written by a server-held wallet (`RELAYER_ROLE`). Production needs a
  relayer or multisig, not a single hot key.
- Advisers holding client money is regulated in NZ. A stablecoin escrow may not satisfy
  the code of conduct's trust-account rules. This is a real blocker, not a detail.
- MockNZDD is not dNZD. Real dNZD is Ethereum/Base/Solana only, not on testnets or
  Avalanche — we say so plainly in the pitch.
- We protect the licensed channel. An employer selling a job for $45k will never onboard.
  We make the unlicensed channel conspicuous; we do not stop it.
- `create-eth@latest` scaffolded this project on Hardhat 3 + rocketh (not classic
  hardhat-deploy) and Next.js 16 (not 14) and ships RainbowKit/WalletConnect by default.
  Contract and deploy code here follows the actual generated toolchain; Privy replaces
  RainbowKit only once frontend wallet wiring begins (not yet built — see SCOPE.md).

## MVP scope
See `docs/SCOPE.md` for the full MUST/SHOULD/CUT list and the eight-step demo path. The
closing demo beat is auto-refund on missed deadline — it must work.
