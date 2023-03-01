// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {IMintableBurnableERC20} from "./../../Interface/IMintableBurnableERC20.sol";
import "hardhat/console.sol";

/// @title ReservesPool

contract ReservesPool {
    using SafeTransferLib for ERC20;

    address public cToken; // token that will be received from vault on depositing assets
    address public vaultCaller;

    constructor(address _cToken) {
        console.log("Hello from the reserves constructor");
        cToken = _cToken;
        vaultCaller = msg.sender;
    }

    modifier onlyVaultCaller() {
        require(msg.sender == vaultCaller, "Caller should be vault");
        _;
    }

    function burnCTokens(uint256 _amount) external onlyVaultCaller {
        IMintableBurnableERC20(cToken).burn(_amount);
    }

    // TODO : add access control
    function updateVaultCaller(address _newVault) external {
        vaultCaller = _newVault;
    }
}
