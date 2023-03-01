// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import {IMintableBurnableERC20} from "./../../Interface/IMintableBurnableERC20.sol";
import {DepositManager} from "./DepositManager.sol";
import {IDepositManager} from "./../interfaces/IDepositMananger.sol";

error AddressNotRegistered();

/// @title DepositManager
contract CTokenManager {
    address public cTokenAddress; // CToken to be minted
    mapping(address => uint256) public addressToCTokenPercentage; // 100 is 1% , 5000 = 50%
    address[] public allowedAddressesForCToken;
    uint256 public immutable PERCENTAGE_BASED_POINT = 10000; // 100 %

    address public depositManager;

    constructor(address _cToken) {
        cTokenAddress = _cToken;
        depositManager = address(new DepositManager(_cToken));
    }

    function _init(address _poolReserves) internal {
        allowedAddressesForCToken.push(_poolReserves);
        addressToCTokenPercentage[_poolReserves] = 2000; // 20 %
    }

    function _handleDeposit(
        uint256 assets,
        address cTokensReceiver,
        address sender
    ) internal {
        _handleCTokensMinting(assets, cTokensReceiver, sender);
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
                _distributeCtokens(cTokensReceiver, assets);
            } else {
                revert AddressNotRegistered();
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
                _distributeCtokens(currentAddr, tokensToSend);
            }
        }
    }

    function _distributeCtokens(address _to, uint256 _amount) internal {
        IMintableBurnableERC20(cTokenAddress).mint(_to, _amount);
    }
}
