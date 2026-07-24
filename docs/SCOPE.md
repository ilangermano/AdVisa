# SCOPE.md — MVP scope for the Web3NZ Hackathon build

Web3NZ Hackathon, University of Canterbury, Christchurch, 24–26 July 2026. Submission
deadline **Sunday 10:30am**. See `CONTEXT.md` for the project summary and rules.

## MUST — demo does not exist without these
1. IAA register check — entering an adviser name returns Licensed / Not Licensed
2. PDF → AI extracts milestones, dates, amounts → escrow terms
3. Lumin sign → webhook → hash anchored on-chain
4. Escrow funded in MockNZDD, milestone releases
5. **Auto-refund on missed deadline** ← the closing demo beat, must work

## SHOULD — nearly free, do after MUST
6. Plain-language summary + translation (same Anthropic call as #2)
7. Re-check licence at each milestone (reuses #1)
8. Deploy to Sepolia + Fuji (config from hour one, deploy at the end)
9. Tribunal audit trail export (read event log → PDF; only if 1–5 green)

## CUT — roadmap slide only, DO NOT BUILD
- eERC encrypted payments (zk circuits + converter mode — a weekend on its own)
- Milestone certificates signed via Lumin (use an EIP-191 signed message instead)
- Job offer / accredited employer verification
- Multi-visa pathway support (demo is AEWV only)
- Dispute arbitration (we are not an arbiter)
- Any governance token

## Demo path — the only path that must not break
1. Enter unlicensed adviser → blocked
2. Enter licensed adviser → passes
3. Upload fee agreement PDF → AI extracts 3 milestones live
4. Show plain-language summary in Hindi
5. Both sign in Lumin → hash appears on-chain
6. Fund $4,000 MockNZDD → 20% releases
7. **Advance clock past lodgement deadline → reclaim button lights up**
8. Migrant reclaims → remaining funds return

Anything not in these eight steps can be ugly.

## Milestones

### MVP — 3 milestones on a $4,000 fee
| # | Milestone | Proof | Share | $ |
|---|---|---|---|---|
| 0 | Engagement | Fee agreement signed in Lumin | 20% | $800 |
| 1 | Application lodged with INZ | INZ acknowledgment + application number | 60% | $2,400 |
| 2 | Decision received | INZ outcome letter — approved OR declined | 20% | $800 |

Milestone 1 carries the most money because that is where the documented fraud happens:
advisers taking payment and claiming to have lodged when they have not.

### Full 5-milestone model — roadmap slide only, document but do not build
| # | Milestone | Proof | Share |
|---|---|---|---|
| 0 | Engagement | Fee agreement signed | 20% |
| 1 | Eligibility assessment | Written signed opinion | 15% |
| 2 | Application lodged | INZ acknowledgment | 40% |
| 3 | RFI responded | Dated response filed — **returns to migrant if no RFI arises** | 10% |
| 4 | Decision received | INZ outcome letter, approved or declined | 15% |

## Order of work
1. Docs first (this file and its siblings) so the team has context immediately
2. `MockNZDD.sol` and `VisaEscrow.sol`
3. Deploy script and tests
4. Lumin webhook handler stub with TODOs
5. Stop. Frontend features wait until explicitly requested.
