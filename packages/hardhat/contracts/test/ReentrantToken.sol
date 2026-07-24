// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IReentryTarget {
    function completeMilestone(uint256 id) external;
}

/// @title ReentrantToken
/// @notice TEST ONLY. A malicious ERC20 whose `transfer` calls back into a target
/// contract's `completeMilestone` mid-transfer, used by VisaEscrow.ts to prove the
/// ReentrancyGuard on the payout path actually holds against a hostile token. Never
/// deploy this outside the test suite.
contract ReentrantToken is ERC20 {
    address public target;
    uint256 public attackId;
    bool public attacking;

    constructor() ERC20("Reentrant Attacker", "EVIL") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setAttack(address target_, uint256 attackId_) external {
        target = target_;
        attackId = attackId_;
        attacking = true;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        bool ok = super.transfer(to, amount);
        if (attacking) {
            attacking = false;
            IReentryTarget(target).completeMilestone(attackId);
        }
        return ok;
    }
}
