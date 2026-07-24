# ARCHITECTURE.md

## On-chain vs off-chain
Default is off-chain. A thing goes on-chain only if it must survive us going insolvent,
being acquired, or being accused of tampering.

| On-chain | Off-chain (Supabase) |
|---|---|
| Escrow balance, tranche amounts | The fee agreement PDF |
| `sha256(agreement)` | Migrant name, passport, visa category |
| `keccak256(licenceNumber)` | Adviser name, contact, licence number |
| Deadlines, pause state | Live IAA licence status (cached, timestamped) |
| Release / reclaim / refund events | AI extraction output, translations |
| Milestone proof hashes | INZ acknowledgment PDF |

## Why a chain at all — three reasons, know them for Q&A
Roughly 70% of this app is ordinary software and that is fine.
1. **We must not be the custodian.** A database version means five students holding
   millions of dollars of migrants' money, promising to release it fairly —
   structurally identical to the adviser they didn't trust. Escrow in a contract means
   the refund fires whether or not our company exists.
2. **Evidence that survives us.** A hash proves a document existed unchanged at a time,
   even when WE are the accused party. A row in our own database proves nothing about
   our own conduct.
3. **Cross-border settlement.** Family overseas funds escrow in minutes for cents,
   landing straight into a contract with release conditions attached.

## Backend roles
Server wallet holds `RELAYER_ROLE`. It can anchor, submit proofs, complete milestones,
trigger licence-revocation refunds. It CANNOT move funds arbitrarily and CANNOT block a
migrant's reclaim.
