// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "../Interface/IMarketPlaceBorrower.sol";
import "./../XEQ/interfaces/IERC4626StakingPool.sol";
error ZeroAddress();
error InvalidAmount();
error InvalidMarketplaceCaller();

// This contract uses the library to set and retrieve state variables
library MarketPlaceBorrowerLib {
    function initialize(
        IMarketPlaceBorrower.Storage storage _storageParams,
        address _poolToBorrowFrom
    ) internal {
        zeroAddrCheck(_poolToBorrowFrom);
        _storageParams.poolToBorrowFrom = _poolToBorrowFrom;
    }

    function _setMarketPlace(
        IMarketPlaceBorrower.Storage storage _storageParams,
        address _marketPlace
    ) internal {
        zeroAddrCheck(_marketPlace);
        _storageParams.allowedMarketPlace = _marketPlace;
    }

    function _borrowTokensFromPool(
        IMarketPlaceBorrower.Storage storage _storageParams,
        uint256 _amount
    ) internal {
        if (_amount == 0) {
            revert InvalidAmount();
        }

        if (msg.sender != _storageParams.allowedMarketPlace) {
            revert InvalidMarketplaceCaller();
        }

        _storageParams.amountBorrowed += _amount;
        
        IERC4626StakingPool(_storageParams.poolToBorrowFrom).borrow(_storageParams.allowedMarketPlace,_amount); 
    }

    function zeroAddrCheck(address _addr) internal pure {
        if (_addr == address(0x00)) {
            revert ZeroAddress();
        }
    }
}
