pragma solidity ^0.8.9;

interface IDepositManager {
    function registerUserDeposits(
        uint256 assets,
        address cTokensReceiver,
        address sender
    ) external;
}
