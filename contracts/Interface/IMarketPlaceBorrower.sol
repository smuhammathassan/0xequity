// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >0.8.0;

/**
 * @title interface for storage struct and functions for PoolBorrower.sol
 */
interface IMarketPlaceBorrower {
    struct Storage {
        address poolToBorrowFrom;
        address allowedMarketPlace;
        uint256 amountBorrowed;
        address customVault;
    }

    function borrowTokens(
        uint256 _tokensToBorrowWithoutFees,
        address _propertyToken,
        uint256 _noOfTokens
    ) external;

    function buyPropertyTokens(
        address _propertyToken,
        uint256 _repayAmount,
        uint256 _currentPertokenPrice
    ) external;

    function getPoolToBorrowFromAddress() external view returns (address);
}
