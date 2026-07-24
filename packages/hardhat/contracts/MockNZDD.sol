// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockNZDD
/// @notice Test-only stand-in for dNZD (NewMoney's reserve-backed NZ digital dollar).
/// @dev TESTNET ONLY. Never deploy this to mainnet — `mint` is open to anyone and the
/// token carries no reserve backing. Production escrow points at the real dNZD token
/// address via the `IERC20` constructor argument on `VisaEscrow`; this contract exists
/// only so the demo can fund and release escrow without a real stablecoin.
contract MockNZDD is ERC20 {
    constructor() ERC20("Mock NZ Digital Dollar", "dNZD") {}

    /// @notice Mints `amount` tokens to `to`. Open to any caller — testnet only.
    /// @param to Recipient of the minted tokens.
    /// @param amount Amount to mint, in the token's smallest unit (18 decimals).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
