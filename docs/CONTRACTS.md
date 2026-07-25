# CONTRACTS.md — VisaEscrow design

## Design principles
- Escrow holds generic `IERC20`, address is a constructor arg
- No strings stored, `bytes32` hashes only
- Deadlines are absolute unix timestamps
- Every state transition emits an event — **the event log IS the audit trail**
- Custom errors, not revert strings
- Separate constructor-supplied administrator and relayer addresses
- OpenZeppelin's delayed, two-step default-admin transfer
- Reject zero-value milestones, same-party engagements and expired deadlines

## Engagement lifecycle
```
Created --anchorAgreement()--> Anchored --fund()--> Active
                                                      |
              +---------------------------------------+--------------------------+
              |                        |                                          |
     completeMilestone()        reclaimTranche()                            refundAll()
              |                        |                                          |
    tranche -> adviser        tranche -> migrant                    all unreleased -> migrant
    next milestone opens      engagement ENDS                              ENDS
```

`fund()` MUST revert unless `agreementHash != bytes32(0)`. Money cannot move before a
real signature event. This is the core product claim — protect it with a test.

## Tranche resolution — exactly four ways
| Trigger | Caller | Result |
|---|---|---|
| Proof submitted, deadline not passed | backend (RELAYER_ROLE) | tranche → adviser |
| Deadline + 5-day grace passed | migrant only | all unreleased → migrant, ends |
| Migrant unresponsive 30 days, ball in their court | adviser only | tranche → adviser |
| Licence check fails | backend (RELAYER_ROLE) | all unreleased → migrant, ends |

## The clock
The deadline only runs on whoever owes the next action.
- Ball in adviser's court (assessment, lodgement, RFI due) → deadline runs
- Ball in migrant's court (documents outstanding) → **clock pauses**
- Ball in INZ's court (awaiting decision) → **no deadline at all**

Backend calls `pauseClock()` / `resumeClock()`. On resume, push the deadline forward by
the paused duration.

Reclaim is a **claim, not an auto-sweep**. The tranche becomes reclaimable and the
migrant chooses. Auto-refunding would kill engagements over a one-day slip.

Constants: `GRACE_PERIOD = 5 days`, `UNRESPONSIVE_PERIOD = 30 days`.

## Structs
```solidity
enum State { Created, Anchored, Active, Ended }
enum Status { Pending, Released, Reclaimed }

struct Milestone {
    uint256 amount;
    uint64  deadline;    // 0 = no deadline (awaiting INZ)
    uint64  pausedAt;    // 0 = clock running
    bytes32 proofHash;
    Status  status;
}

struct Engagement {
    address migrant;
    address adviser;
    bytes32 adviserLicenceRef;  // keccak256(licenceNumber) — NOT the number
    bytes32 agreementHash;      // sha256 of the signed PDF
    uint256 totalAmount;
    uint256 releasedAmount;
    uint64  lastMigrantAction;
    uint8   currentMilestone;
    State   state;
}
```

## Functions
```solidity
function createEngagement(address adviser, bytes32 licenceRef, uint256[] calldata amounts, uint64[] calldata deadlines) external returns (uint256 id);
function anchorAgreement(uint256 id, bytes32 agreementHash) external onlyRole(RELAYER_ROLE);
function fund(uint256 id) external;                              // migrant pulls tokens in
function submitProof(uint256 id, bytes32 proofHash) external onlyRole(RELAYER_ROLE);
function completeMilestone(uint256 id) external onlyRole(RELAYER_ROLE);
function reclaimTranche(uint256 id) external;                    // migrant only, after deadline+grace
function claimUnresponsive(uint256 id) external;                 // adviser only, after 30d
function refundAll(uint256 id) external onlyRole(RELAYER_ROLE);  // licence revoked
function pauseClock(uint256 id) external onlyRole(RELAYER_ROLE);
function resumeClock(uint256 id) external onlyRole(RELAYER_ROLE);
function getMilestones(uint256 id) external view returns (Milestone[] memory);
```

`reclaimTranche` and `claimUnresponsive` must be callable by the party themselves and
must NOT be blockable by RELAYER_ROLE. That asymmetry is the point — say it in the
pitch: "nobody at our company can stop this, including us."

The default administrator can grant or revoke operational roles but cannot move escrowed
funds. Transferring that administrator uses OpenZeppelin's two-step flow with a one-day
delay. `RELAYER_ROLE` is assigned separately during deployment.

## Events — these ARE the audit trail
```solidity
event EngagementCreated(uint256 indexed id, address indexed migrant, address indexed adviser, uint256 total);
event AgreementAnchored(uint256 indexed id, bytes32 agreementHash, uint64 at);
event Funded(uint256 indexed id, uint256 amount);
event ProofSubmitted(uint256 indexed id, uint8 milestone, bytes32 proofHash);
event MilestoneReleased(uint256 indexed id, uint8 milestone, uint256 amount);
event TrancheReclaimed(uint256 indexed id, uint8 milestone, uint256 amount);
event ClockPaused(uint256 indexed id, uint8 milestone, uint64 at);
event ClockResumed(uint256 indexed id, uint8 milestone, uint64 at);
event LicenceRevoked(uint256 indexed id, uint256 refunded);
```

## Tests that must pass before demo
1. `fund()` reverts when `agreementHash` is zero
2. `completeMilestone()` pays exactly the tranche amount, no more
3. `reclaimTranche()` reverts before deadline + grace
4. `reclaimTranche()` succeeds after, returns ALL unreleased funds ← **this is the demo**
5. Paused clock does not advance the deadline
6. Non-migrant cannot reclaim; non-adviser cannot claim unresponsive
7. `refundAll()` returns everything unreleased and ends the engagement
8. Reentrancy guard holds on every payout path
9. Unprivileged wallets cannot call relayer operations
10. Zero-value, same-party and expired engagements revert
11. Empty proof hashes revert at submission time

## MockNZDD.sol
ERC-20, 18 decimals, name "Mock NZ Digital Dollar", symbol "dNZD", open public `mint()`.
Local Hardhat only — it is never used for a public-network deployment.

## DNZD.sol
Abstract ERC-20 metadata ABI declaration for NewMoney's existing dNZD token. It is not
deployed by AdVisa. The deploy script registers NewMoney's confirmed address and points
`VisaEscrow` at it.
