// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import {IERC4626StakingPool} from "./../interfaces/IERC4626StakingPool.sol";
import {IGauge} from "./../interfaces/IGauge.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {IMintableBurnableERC20} from "./../../Interface/IMintableBurnableERC20.sol";

import "hardhat/console.sol";

/// @title VaultRouter
/// @author 0xClandestine
///     modified from https://github.com/ZeframLou/playpen/blob/main/src/ERC20StakingPool.sol
/// @notice A modern, gas optimized staking pool contract for rewarding ERC20 stakers
/// with ERC20 tokens periodically and continuously, deposits are wrapped as an ERC4626.
contract VaultRouter {
    using SafeTransferLib for ERC20;

    address public stakeToken;
    address customVaultAddress;
    address mainVault;
    address public xToken;
    address public gauge;

    constructor(
        address _stakeToken,
        address _customVaultAddress,
        address _mainVault,
        address _xToken,
        address _gauge
    ) {
        stakeToken = _stakeToken;
        customVaultAddress = _customVaultAddress;
        mainVault = _mainVault;
        xToken = _xToken;
        gauge = _gauge;
    }

    function stake(
        uint256 assets,
        address cTokenReceiver,
        bool depositSTokensToGauge
    ) external returns (uint256 shares) {
        ERC20(stakeToken).safeTransferFrom(msg.sender, address(this), assets);
        ERC20(stakeToken).safeApprove(customVaultAddress, assets);
        // tx below will result in receiving xTokens to this contract from custom vault
        uint256 xTokensReceived = IERC4626StakingPool(customVaultAddress).stake(
            assets
        );
        // approving
        ERC20(xToken).safeApprove(mainVault, xTokensReceived);
        console.log("After token appeove");
        // now staking to the main vault using xToken
        shares = IERC4626StakingPool(mainVault).stake(
            xTokensReceived,
            cTokenReceiver,
            msg.sender
        );
        console.log("After main vault stake");

        if (depositSTokensToGauge) {
            ERC20(mainVault).safeApprove(gauge, shares * 100000000);
            console.log("After gauge appprove");
            IGauge(gauge).depositFor(shares, 0, msg.sender);
        } else {
            // now transferring sTokens to user
            ERC20(mainVault).safeTransfer(msg.sender, shares);
        }
    }

    // function withdraw()
}
