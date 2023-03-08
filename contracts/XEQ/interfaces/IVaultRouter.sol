pragma solidity ^0.8.9;

interface IVaultRouter {
    function stake(
        uint256 assets,
        address cTokenReceiver,
        address buybackPoolVault,
        bool depositSTokensToGauge,
        bool skipPassOnPoolTransfer,
        bool depositToPassOnPoolGauge
    ) external returns (uint256 shares);
}
