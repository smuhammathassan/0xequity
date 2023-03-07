// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import {IERC4626StakingPool} from "./../interfaces/IERC4626StakingPool.sol";
import {IGauge} from "./../interfaces/IGauge.sol";
import {IDepositManager} from "./../interfaces/IDepositManager.sol";
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
    address public customVaultAddress;
    address public mainVault;
    address public xToken;
    address public gauge;
    address public depositManager;

    mapping(address => uint256) public userToGaugeDeposits;

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
        console.log("insode the vault router before");
        // tx below will result in receiving xTokens to this contract from custom vault
        uint256 xTokensReceived = IERC4626StakingPool(customVaultAddress).stake(
            assets
        );
        console.log("insode the vault router after");

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
            userToGaugeDeposits[msg.sender] += shares;
            console.log(gauge, "This is gagueg address ");
            IGauge(gauge).depositFor(shares, 0, msg.sender);
        } else {
            // now transferring sTokens to user
            ERC20(mainVault).safeTransfer(msg.sender, shares);
        }
    }

    function updateStakeToken(address _stakeToken) external {
        stakeToken = _stakeToken;
    }

    function updatecustomVaultAddress(address _customVaultAddress) external {
        customVaultAddress = _customVaultAddress;
    }

    function updatemainVault(address _mainVault) external {
        mainVault = _mainVault;
    }

    function updatexToken(address _xToken) external {
        xToken = _xToken;
    }

    function updateDepositManager(address _depositManager) external {
        depositManager = _depositManager;
    }

    function withdraw(uint256 amount) external returns (uint256) {
        address[] memory controllers = IERC4626StakingPool(mainVault)
            .getAllowedCTokenAddresses();
        console.log("After addresess");
        console.log(depositManager, "After addresess");
        uint256 amountWithdrawable = IDepositManager(depositManager)
            .getAmountToWithdrawFromControllers(msg.sender, controllers);
        console.log("After amount to withdraw");

        ERC20(mainVault).safeTransferFrom(msg.sender, address(this), amount);
        console.log("After sft");

        IDepositManager(depositManager).withdraw(
            msg.sender,
            controllers,
            amount
        );
        console.log("After wddd");

        ERC20(mainVault).safeApprove(mainVault, amount);
        console.log("After safeapprive");

        IERC4626StakingPool(mainVault).withdrawFromVaultRouter(
            amount,
            amount - amountWithdrawable,
            address(this),
            address(this)
        );

        console.log("After wdFromVaultRouter");

        ERC20(xToken).safeApprove(customVaultAddress, amount);

        IERC4626StakingPool(customVaultAddress).withdraw(
            amount,
            address(this),
            address(this)
        );
        ERC20(stakeToken).safeTransfer(msg.sender, amount);

        // uint256 amountFromGauge = withdrawFromGauge(amountWithdrawable);
    }

    function updateGauge(address _gauge) external {
        gauge = _gauge;
    }

    // function withdrawFromGauge(uint256 amountWithdrawable)
    //     internal
    //     returns (uint256)
    // {
    //     // TODO : no need of that require as withdraw checks this automatically
    //     // first check if the user has enough deposits
    //     require(
    //         userToGaugeDeposits[msg.sender] >= amountWithdrawable,
    //         "Insufficient deposit in gauge"
    //     );
    //     userToGaugeDeposits[msg.sender] -= amountWithdrawable;
    //     IGauge(gauge).withdraw(amountWithdrawable);
    // }
}
