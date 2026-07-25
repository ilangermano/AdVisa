// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AccessControlDefaultAdminRules } from
    "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VisaEscrow
/// @notice Milestone escrow for New Zealand immigration adviser fees. Holds a generic
/// IERC20 token (MockNZDD locally, dNZD on public networks — same code, no hardcoded
/// token address) and releases it in tranches against milestones that a licensed
/// immigration adviser and their migrant client agree to up front.
/// @dev No personal data is stored here — only hashes, addresses, amounts, timestamps
/// and enums. `adviserLicenceRef` is `keccak256(licenceNumber)`, never the number
/// itself; `agreementHash` is `sha256` of the signed fee agreement PDF, anchored only
/// after both parties sign in Lumin. Licence status itself is never stored on-chain —
/// it is checked live off-chain and, on failure, the backend calls `refundAll`.
/// Every state transition emits an event; the event log is the audit trail.
contract VisaEscrow is AccessControlDefaultAdminRules, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint48 public constant DEFAULT_ADMIN_DELAY = 1 days;

    /// @notice Role held by the server-side relayer wallet. Can anchor agreements,
    /// submit proofs, complete milestones, pause/resume the clock, and trigger
    /// licence-revocation refunds. It CANNOT move funds arbitrarily and CANNOT block
    /// `reclaimTranche` or `claimUnresponsive` — those are callable by the migrant and
    /// adviser respectively, with no relayer gate in between.
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    /// @notice Grace period after a milestone deadline before the migrant may reclaim.
    uint64 public constant GRACE_PERIOD = 5 days;

    /// @notice How long the clock must sit paused (ball in the migrant's court) before
    /// the adviser may claim the tranche as unresponsive.
    uint64 public constant UNRESPONSIVE_PERIOD = 30 days;

    enum State {
        Created,
        Anchored,
        Active,
        Ended
    }

    enum Status {
        Pending,
        Released,
        Reclaimed
    }

    struct Milestone {
        uint256 amount;
        uint64 deadline; // 0 = no deadline (awaiting INZ)
        uint64 pausedAt; // 0 = clock running
        bytes32 proofHash;
        Status status;
    }

    struct Engagement {
        address migrant;
        address adviser;
        bytes32 adviserLicenceRef; // keccak256(licenceNumber) — NOT the number
        bytes32 agreementHash; // sha256 of the signed PDF
        uint256 totalAmount;
        uint256 releasedAmount;
        uint64 lastMigrantAction;
        uint8 currentMilestone;
        State state;
    }

    /// @notice The token this escrow holds. MockNZDD locally, dNZD on public networks.
    IERC20 public immutable token;

    uint256 private _nextEngagementId = 1;

    mapping(uint256 => Engagement) public engagements;
    mapping(uint256 => Milestone[]) private _milestones;

    event EngagementCreated(uint256 indexed id, address indexed migrant, address indexed adviser, uint256 total);
    event AgreementAnchored(uint256 indexed id, bytes32 agreementHash, uint64 at);
    event Funded(uint256 indexed id, uint256 amount);
    event ProofSubmitted(uint256 indexed id, uint8 milestone, bytes32 proofHash);
    event MilestoneReleased(uint256 indexed id, uint8 milestone, uint256 amount);
    event TrancheReclaimed(uint256 indexed id, uint8 milestone, uint256 amount);
    event ClockPaused(uint256 indexed id, uint8 milestone, uint64 at);
    event ClockResumed(uint256 indexed id, uint8 milestone, uint64 at);
    event LicenceRevoked(uint256 indexed id, uint256 refunded);

    error ZeroAddress();
    error InvalidToken();
    error SameParty();
    error ZeroAmount();
    error TooManyMilestones();
    error DeadlineNotFuture();
    error EmptyMilestones();
    error MismatchedArrayLengths();
    error EngagementNotFound();
    error NotMigrant();
    error NotAdviser();
    error WrongState(State expected, State actual);
    error AgreementNotAnchored();
    error InvalidAgreementHash();
    error InvalidProofHash();
    error MilestoneNotPending();
    error NoProofSubmitted();
    error DeadlinePassed();
    error DeadlineNotReached();
    error NoDeadlineSet();
    error ClockAlreadyPaused();
    error ClockNotPaused();
    error NotUnresponsiveYet();

    constructor(IERC20 token_, address admin_, address relayer_)
        AccessControlDefaultAdminRules(DEFAULT_ADMIN_DELAY, admin_)
    {
        if (address(token_) == address(0) || address(token_).code.length == 0) revert InvalidToken();
        if (relayer_ == address(0)) revert ZeroAddress();
        token = token_;
        _grantRole(RELAYER_ROLE, relayer_);
    }

    modifier engagementExists(uint256 id) {
        if (id == 0 || id >= _nextEngagementId) revert EngagementNotFound();
        _;
    }

    /// @notice Creates a new engagement. Caller becomes the migrant.
    /// @param adviser Address of the licensed immigration adviser.
    /// @param licenceRef `keccak256(licenceNumber)` — never the raw licence number.
    /// @param amounts Tranche amounts, in the escrow token's smallest unit.
    /// @param deadlines Absolute unix timestamps per tranche; 0 = no deadline.
    /// @return id The new engagement's id.
    function createEngagement(
        address adviser,
        bytes32 licenceRef,
        uint256[] calldata amounts,
        uint64[] calldata deadlines
    ) external returns (uint256 id) {
        if (adviser == address(0)) revert ZeroAddress();
        if (adviser == msg.sender) revert SameParty();
        if (amounts.length == 0) revert EmptyMilestones();
        if (amounts.length > type(uint8).max) revert TooManyMilestones();
        if (amounts.length != deadlines.length) revert MismatchedArrayLengths();

        id = _nextEngagementId++;

        Engagement storage engagement = engagements[id];
        engagement.migrant = msg.sender;
        engagement.adviser = adviser;
        engagement.adviserLicenceRef = licenceRef;
        engagement.state = State.Created;

        uint256 total = 0;
        Milestone[] storage milestoneList = _milestones[id];
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] == 0) revert ZeroAmount();
            if (deadlines[i] != 0 && deadlines[i] <= block.timestamp) revert DeadlineNotFuture();
            total += amounts[i];
            milestoneList.push(
                Milestone({
                    amount: amounts[i],
                    deadline: deadlines[i],
                    pausedAt: 0,
                    proofHash: bytes32(0),
                    status: Status.Pending
                })
            );
        }
        engagement.totalAmount = total;

        emit EngagementCreated(id, msg.sender, adviser, total);
    }

    /// @notice Anchors the sha256 hash of the signed fee agreement PDF. Called by the
    /// relayer once Lumin confirms both parties have signed.
    function anchorAgreement(uint256 id, bytes32 agreementHash) external engagementExists(id) onlyRole(RELAYER_ROLE) {
        Engagement storage engagement = engagements[id];
        if (engagement.state != State.Created) revert WrongState(State.Created, engagement.state);
        if (agreementHash == bytes32(0)) revert InvalidAgreementHash();

        engagement.agreementHash = agreementHash;
        engagement.state = State.Anchored;

        emit AgreementAnchored(id, agreementHash, uint64(block.timestamp));
    }

    /// @notice Migrant pulls their tokens into escrow. Reverts unless the agreement has
    /// been anchored — money cannot move before a real signature event.
    function fund(uint256 id) external engagementExists(id) nonReentrant {
        Engagement storage engagement = engagements[id];
        if (msg.sender != engagement.migrant) revert NotMigrant();
        if (engagement.state != State.Anchored) revert WrongState(State.Anchored, engagement.state);
        if (engagement.agreementHash == bytes32(0)) revert AgreementNotAnchored();

        engagement.state = State.Active;
        engagement.lastMigrantAction = uint64(block.timestamp);

        token.safeTransferFrom(msg.sender, address(this), engagement.totalAmount);

        emit Funded(id, engagement.totalAmount);
    }

    /// @notice Records evidence (a hash) that the current milestone's action happened.
    /// Does not move funds — `completeMilestone` does that.
    function submitProof(uint256 id, bytes32 proofHash) external engagementExists(id) onlyRole(RELAYER_ROLE) {
        Milestone storage milestone = _currentMilestone(id);
        if (milestone.status != Status.Pending) revert MilestoneNotPending();
        if (proofHash == bytes32(0)) revert InvalidProofHash();

        milestone.proofHash = proofHash;

        emit ProofSubmitted(id, engagements[id].currentMilestone, proofHash);
    }

    /// @notice Releases the current tranche to the adviser once proof has been
    /// submitted and the milestone's deadline has not passed. Opens the next milestone,
    /// or ends the engagement if this was the last one.
    function completeMilestone(uint256 id) external engagementExists(id) onlyRole(RELAYER_ROLE) nonReentrant {
        Engagement storage engagement = engagements[id];
        uint8 index = engagement.currentMilestone;
        Milestone storage milestone = _currentMilestone(id);

        if (milestone.status != Status.Pending) revert MilestoneNotPending();
        if (milestone.proofHash == bytes32(0)) revert NoProofSubmitted();
        if (milestone.deadline != 0 && block.timestamp > milestone.deadline) revert DeadlinePassed();

        milestone.status = Status.Released;
        engagement.releasedAmount += milestone.amount;

        uint8 nextIndex = index + 1;
        engagement.currentMilestone = nextIndex;
        if (nextIndex >= _milestones[id].length) {
            engagement.state = State.Ended;
        }

        token.safeTransfer(engagement.adviser, milestone.amount);

        emit MilestoneReleased(id, index, milestone.amount);
    }

    /// @notice Migrant reclaims all unreleased funds after the current milestone's
    /// deadline plus the grace period has passed. A deliberate claim, not an
    /// auto-sweep — the engagement ends and nobody, including the relayer, can stop it.
    function reclaimTranche(uint256 id) external engagementExists(id) nonReentrant {
        Engagement storage engagement = engagements[id];
        if (msg.sender != engagement.migrant) revert NotMigrant();

        uint8 index = engagement.currentMilestone;
        Milestone storage milestone = _currentMilestone(id);
        if (milestone.status != Status.Pending) revert MilestoneNotPending();
        if (milestone.deadline == 0) revert NoDeadlineSet();
        if (block.timestamp <= milestone.deadline + GRACE_PERIOD) revert DeadlineNotReached();

        uint256 refunded = _endAndRefundRemaining(id);

        emit TrancheReclaimed(id, index, refunded);
    }

    /// @notice Adviser claims the current tranche when the clock has sat paused (ball
    /// in the migrant's court) for at least `UNRESPONSIVE_PERIOD` with no resume.
    function claimUnresponsive(uint256 id) external engagementExists(id) nonReentrant {
        Engagement storage engagement = engagements[id];
        if (msg.sender != engagement.adviser) revert NotAdviser();

        uint8 index = engagement.currentMilestone;
        Milestone storage milestone = _currentMilestone(id);
        if (milestone.status != Status.Pending) revert MilestoneNotPending();
        if (milestone.pausedAt == 0) revert ClockNotPaused();
        if (block.timestamp < milestone.pausedAt + UNRESPONSIVE_PERIOD) revert NotUnresponsiveYet();

        milestone.status = Status.Released;
        engagement.releasedAmount += milestone.amount;

        uint8 nextIndex = index + 1;
        engagement.currentMilestone = nextIndex;
        if (nextIndex >= _milestones[id].length) {
            engagement.state = State.Ended;
        }

        token.safeTransfer(engagement.adviser, milestone.amount);

        emit MilestoneReleased(id, index, milestone.amount);
    }

    /// @notice Refunds all unreleased funds to the migrant and ends the engagement.
    /// Called by the relayer when the adviser's IAA licence check fails.
    function refundAll(uint256 id) external engagementExists(id) onlyRole(RELAYER_ROLE) nonReentrant {
        Engagement storage engagement = engagements[id];
        if (engagement.state != State.Active) revert WrongState(State.Active, engagement.state);

        uint256 refunded = _endAndRefundRemaining(id);

        emit LicenceRevoked(id, refunded);
    }

    /// @notice Pauses the current milestone's deadline clock — ball moves to the
    /// migrant's court (e.g. documents outstanding).
    function pauseClock(uint256 id) external engagementExists(id) onlyRole(RELAYER_ROLE) {
        Engagement storage engagement = engagements[id];
        uint8 index = engagement.currentMilestone;
        Milestone storage milestone = _currentMilestone(id);

        if (milestone.status != Status.Pending) revert MilestoneNotPending();
        if (milestone.deadline == 0) revert NoDeadlineSet();
        if (milestone.pausedAt != 0) revert ClockAlreadyPaused();

        milestone.pausedAt = uint64(block.timestamp);

        emit ClockPaused(id, index, milestone.pausedAt);
    }

    /// @notice Resumes a paused clock, pushing the deadline forward by the paused
    /// duration so the adviser is not penalised for the migrant's delay.
    function resumeClock(uint256 id) external engagementExists(id) onlyRole(RELAYER_ROLE) {
        Engagement storage engagement = engagements[id];
        uint8 index = engagement.currentMilestone;
        Milestone storage milestone = _currentMilestone(id);

        if (milestone.pausedAt == 0) revert ClockNotPaused();

        uint64 pausedDuration = uint64(block.timestamp) - milestone.pausedAt;
        milestone.deadline += pausedDuration;
        milestone.pausedAt = 0;
        engagement.lastMigrantAction = uint64(block.timestamp);

        emit ClockResumed(id, index, uint64(block.timestamp));
    }

    /// @notice Returns every milestone for an engagement.
    function getMilestones(uint256 id) external view engagementExists(id) returns (Milestone[] memory) {
        return _milestones[id];
    }

    function _currentMilestone(uint256 id) private view returns (Milestone storage) {
        Engagement storage engagement = engagements[id];
        if (engagement.state != State.Active) revert WrongState(State.Active, engagement.state);
        return _milestones[id][engagement.currentMilestone];
    }

    /// @dev Marks every remaining pending milestone as reclaimed, ends the engagement,
    /// and transfers everything unreleased back to the migrant.
    function _endAndRefundRemaining(uint256 id) private returns (uint256 refunded) {
        Engagement storage engagement = engagements[id];
        Milestone[] storage milestoneList = _milestones[id];

        for (uint256 i = engagement.currentMilestone; i < milestoneList.length; i++) {
            if (milestoneList[i].status == Status.Pending) {
                milestoneList[i].status = Status.Reclaimed;
            }
        }

        refunded = engagement.totalAmount - engagement.releasedAmount;
        engagement.releasedAmount = engagement.totalAmount;
        engagement.state = State.Ended;

        if (refunded > 0) {
            token.safeTransfer(engagement.migrant, refunded);
        }
    }
}
