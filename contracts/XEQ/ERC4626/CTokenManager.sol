// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import {IMintableBurnableERC20} from "./../../Interface/IMintableBurnableERC20.sol";
import {DepositManager} from "./DepositManager.sol";
import {IDepositManager} from "./../interfaces/IDepositManager.sol";
import {IERC4626StakingPool} from "./../interfaces/IERC4626StakingPool.sol";
import {IGauge} from "./../interfaces/IGauge.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";

error AddressNotRegistered();

/// @title DepositManager
contract CTokenManager {
    using SafeTransferLib for ERC20;

    address public cTokenAddress; // CToken to be minted
    mapping(address => uint256) public addressToCTokenPercentage; // 100 is 1% , 5000 = 50%
    mapping(address => uint256) public passOnPoolToPercentage; // 100 is 1% , 5000 = 50%
    address[] public allowedAddressesForCToken;
    address[] public allowedAddressesForPassOnPools;
    uint256 public immutable PERCENTAGE_BASED_POINT = 10000; // 100 %

    address public depositManager;

    constructor(address _cToken) {
        cTokenAddress = _cToken;
    }

    function _init(address _poolReserves) internal {
        allowedAddressesForCToken.push(_poolReserves);
        addressToCTokenPercentage[_poolReserves] = 2000; // 20 %
        depositManager = address(new DepositManager(_poolReserves));
    }

    function _handleDeposit(
        uint256 assets,
        address cTokensReceiver,
        address passOnPool,
        address sender,
        address stakeToken,
        bool skipPassOnPoolTransfer,
        bool depositToPassOnPoolGauge
    ) internal {
        _handleCTokensMinting(assets, cTokensReceiver, sender);
        _handlePassOnPoolStaking(
            assets,
            passOnPool,
            sender,
            stakeToken,
            skipPassOnPoolTransfer,
            depositToPassOnPoolGauge
        );
    }

    function _handleCTokensMinting(
        uint256 assets,
        address cTokensReceiver,
        address sender
    ) internal {
        // if the specified address is zero then distribute normally
        if (cTokensReceiver == address(0x00)) {
            mintCTokenToAllocatedAddresses(assets, sender);
        } else {
            // when the specified address is allowed
            if (addressToCTokenPercentage[cTokensReceiver] != 0) {
                // means user has allowed this contoller to have 100% of deposit
                IDepositManager(depositManager).registerUserDeposits(
                    assets,
                    cTokensReceiver,
                    sender
                );
                // userToControllerBalances[sender][cTokensReceiver] += assets;
                // _distributeCtokens(cTokensReceiver, assets);
            } else {
                revert AddressNotRegistered();
            }
        }
    }

    function _handlePassOnPoolStaking(
        uint256 asset,
        address passOnPool,
        address sender,
        address stakeToken,
        bool skipPassOnPoolTransfer,
        bool depositToPassOnPoolGauge
    ) internal {
        // if the specified address is zero then distribute normally
        if (!skipPassOnPoolTransfer) {
            if (passOnPool == address(0x00)) {
                stakeXTokenInPassOnPool(
                    sender,
                    asset,
                    stakeToken,
                    depositToPassOnPoolGauge
                );
                // mintCTokenToAllocatedAddresses(assets, sender);
            } else {
                // when the specified address is allowed
                if (passOnPoolToPercentage[passOnPool] != 0) {
                    ERC20(stakeToken).safeApprove(passOnPool, asset);
                    IERC4626StakingPool(passOnPool).normalStake(
                        asset,
                        address(this)
                    );

                    if (depositToPassOnPoolGauge) {
                        address _gaugeAddress = IERC4626StakingPool(passOnPool)
                            .gaugeAddress();

                        ERC20(passOnPool).safeApprove(_gaugeAddress, asset);
                        IGauge(_gaugeAddress).depositFor(asset, 0, sender);
                    } else {
                        ERC20(passOnPool).safeTransfer(sender, asset);
                    }
                } else {
                    revert AddressNotRegistered();
                }
            }
        }
    }

    function stakeXTokenInPassOnPool(
        address sender,
        uint256 assets,
        address stakeToken,
        bool depositToPassOnPoolGauge
    ) internal {
        uint256 arrayLength = allowedAddressesForPassOnPools.length;
        uint256 tokensToSend;
        address currentAddr;
        uint256 totalToSend;
        address _gaugeAddress;
        for (uint256 i; i < arrayLength; i++) {
            currentAddr = allowedAddressesForPassOnPools[i];
            // 1000000000000000000 TOKENS
            // addr 1 500 => 5%
            // (1000000000000000000 * 500) / 10000 => addr 1 tokensToSend
            tokensToSend =
                (assets * passOnPoolToPercentage[currentAddr]) /
                PERCENTAGE_BASED_POINT;
            totalToSend += tokensToSend;

            // userToControllerBalances[sender][currentAddr] += tokensToSend;

            if (tokensToSend > 0) {
                ERC20(stakeToken).safeApprove(currentAddr, tokensToSend);
                IERC4626StakingPool(currentAddr).normalStake(
                    tokensToSend,
                    address(this)
                );
                if (depositToPassOnPoolGauge) {
                    _gaugeAddress = IERC4626StakingPool(currentAddr)
                        .gaugeAddress();

                    ERC20(currentAddr).safeApprove(_gaugeAddress, tokensToSend);
                    IGauge(_gaugeAddress).depositFor(tokensToSend, 0, sender);
                } else {
                    ERC20(currentAddr).safeTransfer(sender, tokensToSend);
                }
                // _distributeCtokens(currentAddr, tokensToSend);
            }
        }
    }

    /// @param _amount number of assets
    function mintCTokenToAllocatedAddresses(uint256 _amount, address sender)
        internal
    {
        uint256 arrayLength = allowedAddressesForCToken.length;
        uint256 tokensToSend;
        address currentAddr;
        for (uint256 i; i < arrayLength; i++) {
            currentAddr = allowedAddressesForCToken[i];
            // 1000000000000000000 TOKENS
            // addr 1 500 => 5%
            // (1000000000000000000 * 500) / 10000 => addr 1 tokensToSend
            tokensToSend =
                (_amount * addressToCTokenPercentage[currentAddr]) /
                PERCENTAGE_BASED_POINT;

            IDepositManager(depositManager).registerUserDeposits(
                tokensToSend,
                currentAddr,
                sender
            );

            // userToControllerBalances[sender][currentAddr] += tokensToSend;

            if (tokensToSend > 0) {
                // _distributeCtokens(currentAddr, tokensToSend);
            }
        }
    }

    function _distributeCtokens(address _to, uint256 _amount) internal {
        IMintableBurnableERC20(cTokenAddress).mint(_to, _amount);
    }

    function getAllowedCTokenAddresses()
        external
        view
        returns (address[] memory)
    {
        return allowedAddressesForCToken;
    }

    function getAllowedPassOnPoolAddresses()
        external
        view
        returns (address[] memory)
    {
        return allowedAddressesForPassOnPools;
    }
}
