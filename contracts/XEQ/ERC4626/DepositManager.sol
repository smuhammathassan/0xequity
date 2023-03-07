// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "./../interfaces/IERC4626StakingPool.sol";

interface IERC20Meta {
    function balanceOf(address) external view returns (uint256);
}

import "./../../libraries/WadRayMath.sol";

// interface IERC20Meta {
//     function balanceOf(address) external view returns (uint256);
// }

contract DepositManager {
    using WadRayMath for uint256;

    address public vaultCaller;

    mapping(address => mapping(address => uint256))
        public userToControllerBalances; // user-addr -> contoller(c-token reciever) -> balance
    mapping(address => uint256) public controllerUtilization;
    mapping(address => uint256) public controllerSupply;
    // mapping(address => uint256) public customVaultSupply;
    // address public cToken;
    address public RESERVE_POOL;

    constructor(address reservePool) {
        vaultCaller = msg.sender;
        RESERVE_POOL = reservePool;
        // cToken = _cToken;
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
    ) public {
        userToControllerBalances[sender][cTokensReceiver] += assets;
        controllerSupply[cTokensReceiver] += assets;
        if (
            cTokensReceiver != RESERVE_POOL &&
            userToControllerBalances[RESERVE_POOL][cTokensReceiver] > 0
        ) {
            console.log("just after if");
            address[] memory addrs = new address[](1);
            console.log("arr 0 ");
            addrs[0] = cTokensReceiver;
            console.log("arr 1 ");
            uint256 min = userToControllerBalances[RESERVE_POOL][
                cTokensReceiver
            ] < assets
                ? userToControllerBalances[RESERVE_POOL][cTokensReceiver]
                : assets;
            console.log("arr 2 ");
            console.log(min, "isside if and MIN()");
            if (min > 0) {
                withdrawForReserve(addrs, min);
                console.log("After withd");
                // controllerUtilization[RESERVE_POOL] -= min;
                console.log("After withd minus");
            }
        }
    }

    // function registerCustomVaultDeposit(address customVault, uint256 amount)
    //     external
    // {
    //     customVaultSupply[customVault] += amount;
    // }

    // function withdrawCustomVaultDeposit(address customVault, uint256 amount)
    //     external
    // {
    //     customVaultSupply[customVault] -= amount;
    // }

    // function notiftyUsage(address _controller, uint256 _amount) external {}

    function calculateUtilization(address _user, address _controller)
        public
        view
        returns (uint256)
    {
        console.log(
            userToControllerBalances[_user][_controller],
            "userToControllerBalances[_user][_controller]"
        );
        console.log(
            controllerSupply[_controller],
            "controllerSupply[_controller]"
        );
        if (IERC4626StakingPool(vaultCaller).decimals() == 18) {
            return
                userToControllerBalances[_user][_controller]
                    .wadDiv(controllerSupply[_controller])
                    .wadMul(controllerUtilization[_controller]);
        } else {
            return
                (
                    (userToControllerBalances[_user][_controller] * (1e12))
                        .wadDiv(controllerSupply[_controller] * (1e12))
                        .wadMul(controllerUtilization[_controller] * (1e12))
                ) / 1e12;
        }
    }

    function borrowFund(address _controller, uint256 _amount) external {
        controllerUtilization[_controller] += _amount;
    }

    function repayFund(address _controller, uint256 _amount) external {
        controllerUtilization[_controller] -= _amount;
    }

    function toWithdrawFromController(address controller, address user)
        public
        view
        returns (uint256)
    {
        uint256 userutiliztionInController = calculateUtilization(
            user,
            controller
        );
        console.log(
            "User utilization in controleer dm",
            userutiliztionInController
        );
        console.log(
            "to with fromc ",
            userToControllerBalances[user][controller] -
                userutiliztionInController
        );
        return
            userToControllerBalances[user][controller] -
            userutiliztionInController;
    }

    function toWithdrawFromReserves(
        address controller,
        address user,
        uint256 amountToWithdraw
    ) public view returns (uint256, bool) {
        uint256 _toWithdrawFromController = toWithdrawFromController(
            controller,
            user
        );
        //   if(toWithdrawFromController < amountToWithdraw){

        //   }
        //   else {
        bool flag = _toWithdrawFromController < amountToWithdraw ? true : false;
        if (flag) {
            return ((amountToWithdraw - _toWithdrawFromController), true);
        }

        return ((_toWithdrawFromController - amountToWithdraw), false);
        //   }
    }

    function withdraw(
        address sender,
        address[] memory controllers,
        uint256 amountToWithdraw
    ) public {
        // uint withdrawable = testWithdraw(sender,controllers,amountToWithdraw);
        // uint userTotalDeposited;
        for (uint256 i; i < controllers.length; i++) {
            // uint requestAmountFromContoller = userToControllerBalances[sender][controllers[i]] / controllerSupply[controllers[i]] * amountToWithdraw;
            (uint256 withdrawable, bool flag) = toWithdrawFromReserves(
                controllers[i],
                sender,
                amountToWithdraw
            );
            uint256 amountToWithdrawFromController = toWithdrawFromController(
                controllers[i],
                sender
            );
            if (flag) {
                console.log(withdrawable, "withdrawable inside the log");
                uint256 userUtilization = calculateUtilization(
                    sender,
                    controllers[i]
                );

                // userToControllerBalances[RESERVE_POOL][controllers[i]] += withdrawable;
                if (controllers[i] != RESERVE_POOL) {
                    userToControllerBalances[RESERVE_POOL][
                        controllers[i]
                    ] += userUtilization;
                }
                console.log(
                    controllerUtilization[RESERVE_POOL],
                    "controllerUtilization[RESERVE_POOL]"
                );
                console.log(userUtilization, "userUtilization");
                controllerUtilization[RESERVE_POOL] += userUtilization;
                userToControllerBalances[sender][controllers[i]] = 0;
            } else {
                console.log("Inside the else of withdrawaw");

                userToControllerBalances[sender][
                    controllers[i]
                ] -= amountToWithdrawFromController;
            }
            controllerSupply[controllers[i]] -= amountToWithdrawFromController;
            console.log("after subtract");
        }
    }

    function getAmountToWithdrawFromControllers(
        address sender,
        address[] memory controllers
    ) public view returns (uint256) {
        uint256 totalWithdrawedFromControllers;
        for (uint256 i; i < controllers.length; i++) {
            totalWithdrawedFromControllers += toWithdrawFromController(
                controllers[i],
                sender
            );
        }
        return totalWithdrawedFromControllers;
    }

    /////////////////////////////////////////////////////////////////////

    function withdrawForReserve(
        address[] memory controllers,
        uint256 amountToWithdraw
    ) public {
        for (uint256 i; i < controllers.length; i++) {
            (uint256 withdrawable, bool flag) = toWithdrawFromReserves(
                controllers[i],
                RESERVE_POOL,
                amountToWithdraw
            );
            uint256 amountToWithdrawFromController = toWithdrawFromController(
                controllers[i],
                RESERVE_POOL
            );
            console.log(
                amountToWithdrawFromController,
                "amountToWithdrawFromController"
            );
            if (flag) {
                console.log(withdrawable, "withdrawable inside the log");
                uint256 userUtilization = calculateUtilization(
                    RESERVE_POOL,
                    controllers[i]
                );

                if (controllers[i] != RESERVE_POOL) {
                    userToControllerBalances[RESERVE_POOL][
                        controllers[i]
                    ] -= amountToWithdrawFromController;
                }
                console.log(
                    controllerUtilization[RESERVE_POOL],
                    "controllerUtilization[RESERVE_POOL]"
                );
                console.log(userUtilization, "userUtilization");
                controllerUtilization[
                    RESERVE_POOL
                ] -= amountToWithdrawFromController;
            } else {
                console.log("Inside the else of withdrawaw");

                userToControllerBalances[RESERVE_POOL][
                    controllers[i]
                ] -= amountToWithdrawFromController;
            }
            console.log("after subtract");
        }
    }

    // user 1 = 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4
    // user 2 = 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2
    // AMM controller = 0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db
    // Reserves controller = 0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB

    // ["0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db","0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB"]
    // ["0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB","0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db"]
}

/*

pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "./../interfaces/IERC4626StakingPool.sol";

interface IERC20Meta {
    function balanceOf(address) external view returns (uint256);
}

contract DepositManager {
    address public vaultCaller;

    mapping(address => mapping(address => uint256))
        public userToControllerBalances; // user-addr -> contoller(c-token reciever) -> balance
    mapping(address => uint256) public controllerUtilization;
    mapping(address => uint256) public controllerSupply;
    mapping(address => uint256) public customVaultSupply;
    mapping(address => uint256) public userToTotalBalance;
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
        userToTotalBalance[sender] += assets;
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
        view
        returns (uint256)
    {
        // uint256 balanceOfController = IERC20Meta(cToken).balanceOf(
        //     address(_controller)
        // );
        return
            (((userToControllerBalances[_user][_controller] * (1e18)) /
                controllerSupply[_controller]) *
                (controllerUtilization[_controller])) / (1e18);

        // (userToControllerBalances[_user][_controller] /
        //     controllerSupply[_controller]) * (balanceOfController);
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
    ) external returns (uint256 withdrawedAmount) {
        uint256 utilization = calcControllerUtilization(
            _controller,
            controllerUtilization[_controller]
        );
        withdrawedAmount = _amount - utilization;
        userToControllerBalances[_user][_controller] -= withdrawedAmount;
        controllerSupply[_controller] -= withdrawedAmount;
        userToTotalBalance[_user] -= withdrawedAmount;
        // userToControllerBalances[_user][_controller] -= _amount;
        // controllerSupply[_controller] -= _amount;
    }

    function calcControllerUtilization(
        address _controller,
        uint256 _balanceOfController
    ) public view returns (uint256) {
        return controllerSupply[_controller] - _balanceOfController;
    }

    function borrowFund(address _controller, uint256 _amount) external {
        controllerUtilization[_controller] += _amount;
    }

    function repayFund(address _controller, uint256 _amount) external {
        controllerUtilization[_controller] -= _amount;
    }

    function updateCToken(address _cToken) external {
        cToken = _cToken;
    }

    function getWithdrawable(address sender, uint256 amountToWithdraw)
        external
        view
        returns (uint256)
    {
        address[] memory controllers = IERC4626StakingPool(vaultCaller)
            .getAllowedCTokenAddresses();
        uint256 totalUtilization;
        uint256 userTotalDeposited;
        for (uint256 i; i < controllers.length; i++) {
            totalUtilization += calculateUtilization(sender, controllers[i]);
            userTotalDeposited += userToControllerBalances[sender][
                controllers[i]
            ];
        }
        require(
            amountToWithdraw <= userTotalDeposited,
            "withdraw amount exceeds balance"
        );

        // TODO: take from reserves and manage entries if no liq to the controller
        uint256 withdrawable = userTotalDeposited - totalUtilization;
        if (amountToWithdraw <= withdrawable) {
            return amountToWithdraw;
        } else {
            revert("Withdraw amount exceeds balance");
            // fetch tokens from reserves
        }
        // return withdrawable;
    }
}

*/
