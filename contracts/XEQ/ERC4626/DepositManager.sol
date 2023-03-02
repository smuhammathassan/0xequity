// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import "hardhat/console.sol";

interface IERC20Meta {
    function balanceOf(address) external view returns (uint256);
}

contract DepositManager {
    address public vaultCaller;

    mapping(address => mapping(address => uint256))
        public userToControllerBalances; // user-addr -> contoller(c-token reciever) -> balance
    mapping(address => uint256) public controllerToBalancesUtilized;
    mapping(address => uint256) public controllerSupply;
    mapping(address => uint256) public customVaultSupply;
    address public cToken;

    constructor(address _cToken) {
        vaultCaller = msg.sender;
        cToken = _cToken;
    }

    modifier onlyVaultCaller() {
        require(msg.sender == vaultCaller, "Only Vault caller");
        _;
    }

    /// @notice this keeps track of shares of users' cToken in each controller
    function registerUserDeposits(
        uint256 assets,
        address cTokensReceiver,
        address sender
    ) external onlyVaultCaller {
        userToControllerBalances[sender][cTokensReceiver] += assets;
        controllerSupply[cTokensReceiver] += assets;
    }

    function registerCustomVaultDeposit(address customVault, uint256 amount)
        external
    {
        customVaultSupply[customVault] += amount;
    }

    function withdrawCustomVaultDeposit(address customVault, uint256 amount)
        external
    {
        customVaultSupply[customVault] -= amount;
    }

    function notiftyUsage(address _controller, uint256 _amount) external {}

    function calculateUtilization(address _user, address _controller)
        public
        returns (uint256)
    {
        uint256 balanceOfController = IERC20Meta(cToken).balanceOf(
            address(_controller)
        );
        return
            (userToControllerBalances[_user][_controller] /
                controllerSupply[_controller]) *
            (controllerSupply[_controller] - balanceOfController);
        // userToControllerBalances[_user][_controller] / IERC(cTRY).balanceOf(_controller) * IERC(cTRY).balanceOf(address(this))
        // userToControllerBalances[_user][_controller] / contollerToSupply[_controller] * (contollerToSupply[_contoller] - IERC(cJTRY).balanceOf(_controller)
        // 100 / 1000 * (1000-975)
        // 100 / x * 25 = utilization
        // 100 user / 1000 controller * 25 deposit
    }

    function withDraw(
        address _user,
        address _controller,
        uint256 _amount
    ) external {
        userToControllerBalances[_user][_controller] -= _amount;
        controllerSupply[_controller] -= _amount;
    }

    function updateCToken(address _cToken) external {
        cToken = _cToken;
    }
}
