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

    function getWithdrawable(address sender, uint256 amountToWithdraw)
        external
        view
        returns (uint256);

    function getAmountToWithdrawFromControllers(
        address sender,
        address[] memory controllers
    ) external view returns (uint256);

    function withdraw(
        address sender,
        address[] memory controllers,
        uint256 amountToWithdraw
    ) external;

    function borrowFund(address _controller, uint256 _amount) external;
}
