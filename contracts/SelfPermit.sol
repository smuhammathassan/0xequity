// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.9;

import {ISelfPermit} from "./Interface/ISelfPermit.sol";
import {IERC20PermitAllowed} from "./Interface/IERC20PermitAllowed.sol";
import {ERC2771Context} from "./ERC2771Context.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

/// @title Self Permit
/// @notice Functionality to call permit on any EIP-2612-compliant token for use in the route
/// @dev These functions are expected to be embedded in multicalls to allow EOAs to approve a contract and call a function
/// that requires an approval in a single transaction.
abstract contract SelfPermit is ISelfPermit, ERC2771Context {
    /// @inheritdoc ISelfPermit
    function selfPermit(
        address token,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable override {
        IERC20Permit(token).permit(
            _msgSender(),
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );
    }

    /// @inheritdoc ISelfPermit
    function selfPermitAllowed(
        address token,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable override {
        IERC20PermitAllowed(token).permit(
            _msgSender(),
            address(this),
            nonce,
            expiry,
            true,
            v,
            r,
            s
        );
    }

    /// @inheritdoc ISelfPermit
    function selfPermitIfNecessary(
        address token,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable override {
        if (IERC20(token).allowance(_msgSender(), address(this)) < value)
            selfPermit(token, value, deadline, v, r, s);
    }

    /// @inheritdoc ISelfPermit
    function selfPermitAllowedIfNecessary(
        address token,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable override {
        if (
            IERC20(token).allowance(_msgSender(), address(this)) <
            type(uint256).max
        ) selfPermitAllowed(token, nonce, expiry, v, r, s);
    }
}
