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
    }

    function borrowTokens(uint256 _tokensToBorrowWithoutFees) external;

    function buyPropertyTokens(address _propertyToken, uint256 _amountOfTokens)
        external;

    function getPoolToBorrowFromAddress() external view returns (address);
}
