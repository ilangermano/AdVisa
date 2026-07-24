# INTEGRATIONS.md

## 1. Lumin Sign webhook → on-chain anchor
A webhook means Lumin calls US, not us polling them.

```
Both parties sign in Lumin
  -> Lumin POSTs to /api/webhooks/lumin
  -> verify HMAC signature FIRST, before parsing body
  -> download final signed PDF
  -> sha256(pdf) -> bytes32
  -> store PDF in Supabase Storage (private bucket)
  -> escrow.anchorAgreement(engagementId, hash)   [server wallet, RELAYER_ROLE]
  -> AgreementAnchored event; fund() now unlocks
```

Handler at `packages/nextjs/app/api/webhooks/lumin/route.ts`. Verify with
`crypto.timingSafeEqual` against an HMAC of the RAW body. Never parse before verifying.
Idempotency: key on the Lumin document ID, no-op if already anchored — Lumin retries.
Local dev: use `ngrok http 3000` and register the ngrok URL as the webhook endpoint.

## 2. IAA register check
Public register of licensed immigration advisers, maintained under s.77 of the
Immigration Advisers Licensing Act 2007. Search by name; returns licence type, status,
and whether cancelled or suspended.
- Read live every check, never store status on-chain
- Cache in Supabase with `checked_at`; anything older than 24h is stale
- Store only `keccak256(licenceNumber)` on-chain
- Re-run at every milestone; on failure call `refundAll()`
- Scrape server-side if no clean API — browser scraping hits CORS

## 3. Anthropic API — extraction, translation, plain language
One server-side route does all three. PDF as base64 `document` block.

```ts
// SERVER ONLY — key must never reach the client bundle
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
        { type: "text", text: PROMPT },
      ],
    }],
  }),
});
```

Prompt must demand JSON only — no prose, no markdown fences — returning:

```json
{
  "milestones": [{ "name": "", "description": "", "amount": 0, "dueInWorkingDays": 0 }],
  "totalFee": 0,
  "currency": "NZD",
  "plainLanguageSummary": "",
  "translatedSummary": "",
  "redFlags": [{ "severity": "high|medium|low", "issue": "" }]
}
```

Strip ``` fences before `JSON.parse` anyway.

Red flag heuristics: fee outside NZ$2,000–6,000, vague or unmeasurable deliverables, no
conflict-of-interest declaration, any clause tying payment to visa approval, any request
for payment outside the agreement.

## 4. Privy
Email + SMS login, embedded wallet created on first login. The migrant must never see
the words "wallet", "seed phrase", or "gas". Sponsor gas or pre-fund the embedded wallet
on testnet — "insufficient funds for gas" during the demo loses a track.
`PrivyProvider` wraps the app in `packages/nextjs/app/providers.tsx`.

## 5. Tokens
Real dNZD is issued by NewMoney, 1:1 reserve-backed under a NZ bare trust, live on
Ethereum, Base and Solana — **not on testnets, not on Avalanche**. We use MockNZDD and
say so plainly in the pitch. NewMoney dev docs: github.com/GetNewMoney/dev-docs
