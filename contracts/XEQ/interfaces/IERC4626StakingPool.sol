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

    function swapStakeTokenWithCToken(
        address recipient,
        uint256 amountIn,
        address cToken
    ) external;

    function stake(uint256 assets) external returns (uint256 shares);

    function stake(
        uint256 assets,
        address cTokensReceiver,
        address sender
    ) external returns (uint256 shares);

    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) external returns (uint256 shares);

    function getAllowedCTokenAddresses()
        external
        view
        returns (address[] memory);

    function withdrawFromVaultRouter(
        uint256 _totalAmount,
        uint256 _reservePoolAmount,
        address _receiver,
        address _owner
    ) external;

    function decimals() external view returns (uint8);
}
