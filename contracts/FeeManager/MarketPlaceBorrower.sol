// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.9;

import {IMarketPlaceBorrower} from "./../Interface/IMarketPlaceBorrower.sol";
import {IMarketplaceMeta} from "./../Interface/IMarketplaceMeta.sol";
import {MarketPlaceBorrowerLib} from "./../libraries/MarketPlaceBorrowerLib.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./PositionManager.sol";

error OnlyAdminRole();

/**
 * @title When user wants to sell property, this contract borrows from Pool and give to marketplace.
 */
contract MarketPlaceBorrower is
    IMarketPlaceBorrower,
    PositionManager,
    AccessControl
{
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

    function borrowTokens(
        uint256 _tokensToBorrowWithoutFees,
        address _propertyToken,
        uint256 _noOfTokens
    ) external {
        uint256 actualBorrowAmount = _storageParams._borrowTokensFromPool(
            _tokensToBorrowWithoutFees
        );
        addBorrowPosition(_propertyToken, actualBorrowAmount, _noOfTokens);
    }

    function buyPropertyTokens(
        address _propertyToken,
        uint256 _repayAmount,
        uint256 _currentPertokenPrice
    ) external {
        uint256 _amountOfTokens = _repayAmount / _currentPertokenPrice;
        _storageParams._buyPropertyTokensForMP(_propertyToken, _amountOfTokens);
        uint256 remaining = repay(
            _repayAmount,
            _propertyToken,
            _currentPertokenPrice,
            _storageParams.poolToBorrowFrom
        );
        _storageParams._afterRepay(remaining);
    }

    function updatePoolTOBorrowFromAddress(address _newPool)
        external
        onlyAdmin
    {
        _storageParams._updatePoolToBorrowFromAddress(_newPool);
    }

    function getPoolToBorrowFromAddress()
        external
        view
        returns (address poolToBorrowFrom)
    {
        poolToBorrowFrom = _storageParams.poolToBorrowFrom;
    }
}
