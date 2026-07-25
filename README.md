# AdVisa

Escrow and verification rails for New Zealand immigration adviser fees.

A migrant engages a licensed immigration adviser. AdVisa checks the adviser's licence
against the public IAA register before any money moves, anchors the signed fee
agreement on-chain, and releases the fee from escrow in tranches against milestones. If
the adviser misses a deadline or loses their licence, the money returns to the migrant
automatically.

**AdVisa is not an immigration advice service.** It is payment and verification
infrastructure underneath licensed advisers.

Built for the Web3NZ Hackathon, University of Canterbury, Christchurch, 24–26 July 2026.

## Docs
- [`CONTEXT.md`](./CONTEXT.md) — master brief: rules, stack, networks, layout, style
- [`docs/SCOPE.md`](./docs/SCOPE.md) — MVP scope and the demo path
- [`docs/CONTRACTS.md`](./docs/CONTRACTS.md) — `VisaEscrow` design
- [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md) — Lumin, IAA register, Anthropic, Privy, tokens
- [`docs/NEWMONEY_TESTNET.md`](./docs/NEWMONEY_TESTNET.md) — dNZD request template and deployment inputs
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — on-chain vs off-chain, and why a chain at all
- [`docs/PRODUCT.md`](./docs/PRODUCT.md) — market facts, competitors, pitch
- [`SETUP.md`](./SETUP.md) — step-by-step environment setup

## Quickstart
See [`SETUP.md`](./SETUP.md) for the full walkthrough. Short version:

```bash
yarn install
cp .env.example .env.local
cp .env.example packages/hardhat/.env
yarn chain      # terminal 1
yarn deploy     # terminal 2
yarn start      # terminal 3 — localhost:3000
```

## Stack
Solidity ^0.8.24 + Hardhat (Scaffold-ETH 2) · OpenZeppelin Contracts v5 · Next.js App
Router + TypeScript · wagmi/viem · Privy · Supabase · Anthropic API · Lumin Sign ·
Vercel. See `CONTEXT.md` for the full table and the non-negotiable rules.

## Testnet deployment

AdVisa targets Base Sepolia and uses NewMoney's test dNZD token. Set
`DNZD_TOKEN_ADDRESS` to the address confirmed by NewMoney, then deploy with
`yarn deploy --network baseSepolia`.

| Network | Chain ID | VisaEscrow | dNZD |
|---|---:|---|---|
| Base Sepolia | 84532 | Pending | [`0x63ee…1853`](https://sepolia.basescan.org/token/0x63ee4b77d3912DC7bCe711c3BE7bF12D532F1853) |

## License
MIT — see [`LICENCE`](./LICENCE).
