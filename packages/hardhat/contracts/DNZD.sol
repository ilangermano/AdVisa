// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @title DNZD
/// @notice ABI declaration used by AdVisa for NewMoney's dNZD token.
/// @dev This abstract contract is never deployed. NewMoney deploys and funds the
/// token; AdVisa only registers its existing address and uses standard ERC-20 calls.
abstract contract DNZD is IERC20Metadata {}
