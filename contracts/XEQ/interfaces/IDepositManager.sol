pragma solidity ^0.8.9;

interface IDepositManager {
    function registerUserDeposits(
        uint256 assets,
        address cTokensReceiver,
        address sender
    ) external;

    function registerCustomVaultDeposit(address customVault, uint256 amount)
        external;

    function withdrawCustomVaultDeposit(address customVault, uint256 amount)
        external;
}
