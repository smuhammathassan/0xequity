pragma solidity ^0.8.9;

interface IVaultRouter {
    function stake(
        uint256 assets,
        address cTokenReceiver,
        bool depositSTokensToGauge
    ) external returns (uint256 shares);
}
