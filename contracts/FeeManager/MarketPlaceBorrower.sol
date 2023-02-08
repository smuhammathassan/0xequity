// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.9;

import {IMarketPlaceBorrower} from "./../Interface/IMarketPlaceBorrower.sol";
import {MarketPlaceBorrowerLib} from "./../libraries/MarketPlaceBorrowerLib.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

error OnlyAdminRole();

/**
 * @title When user wants to sell property, this contract borrows from Pool and give to marketplace.
 */
contract MarketPlaceBorrower is IMarketPlaceBorrower, AccessControl {
    using MarketPlaceBorrowerLib for Storage;

    //----------------------------------------
    // Storage
    //----------------------------------------

    Storage internal _storageParams;

    //----------------------------------------
    // Modifiers
    //----------------------------------------

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdminRole();
        }
        _;
    }

    constructor(address _poolToBorrowFrom) {
        _storageParams.initialize(_poolToBorrowFrom);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setAllowedMarketPlace(address _marketPlace) external onlyAdmin {
        _storageParams._setMarketPlace(_marketPlace);
    }

    function borrowTokens(uint256 _tokensToBorrowWithoutFees) external {
        _storageParams._borrowTokensFromPool(_tokensToBorrowWithoutFees);
    }

    function getPoolToBorrowFromAddress() external view returns(address poolToBorrowFrom){
        poolToBorrowFrom = _storageParams.poolToBorrowFrom;
    }
}
