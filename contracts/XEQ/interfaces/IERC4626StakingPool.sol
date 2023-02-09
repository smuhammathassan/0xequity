// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.9;

interface IERC4626StakingPool {
    function borrow(address marketplace, uint256 _amount) external;

    function buyTokens(
        address _propertyToken,
        uint256 _amountOfTokens,
        address _marketPlace
    ) external;

    function fees() external view returns (uint256);
}
