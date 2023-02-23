// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.9;

interface IERC4626StakingPool {
    function borrow(address marketplace, uint256 _amount)
        external
        returns (uint256);

    function buyPropertyTokens(
        address _propertyToken,
        uint256 _amountOfTokens,
        address _marketPlace
    ) external;

    function afterRepay(uint256 amount, address marketplace) external;

    function decreaseAssetTotalSupply(uint256 _amount) external;

    function notiftyRewardToGauge(uint256 _rewardAmount) external;

    function fees() external view returns (uint256);
}
