// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.7;

import {IERC4626StakingPool} from "./../XEQ/interfaces/IERC4626StakingPool.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICustomVault} from "./../XEQ/interfaces/ICustomVault.sol";
import {IVaultRouter} from "./../XEQ/interfaces/IVaultRouter.sol";
import "hardhat/console.sol";

contract SwapController {
    using SafeERC20 for IERC20;

    address public poolToSwapFrom; // controller will use funds from this pool for swaps
    address public owner;
    address underLyingCTokenA; // cjTry
    address underLyingCTokenB; // cJUSDC

    address public customVaultJtry; // jTRY
    address public customVaultUSDC; // USDC
    address public xToken;
    address public jTRY;
    address public feeReceiver;

    uint256 public fees = 20; // 100 is 1% so 20 is 0.2 %
    uint256 public PERCENTAGE_BASED_POINT = 10000;
    address public vaultRouter; // USDC

    constructor(
        address _poolToSwapFrom,
        address _underLyingCTokenA,
        address _underLyingCTokenB
    ) {
        poolToSwapFrom = _poolToSwapFrom;
        underLyingCTokenA = _underLyingCTokenA;
        underLyingCTokenB = _underLyingCTokenB;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller not owner");
        _;
    }

    function swapTokens(
        address _recipient,
        uint256 _amountIn,
        address _tokenIn, // usdc
        address _tokenOut, // try
        uint256 amountOut,
        address[] memory paths //  0 index is customVault of TRY, 1 Vault Router of USDC
    ) external {
        uint256 _fees = (_amountIn * fees) / PERCENTAGE_BASED_POINT;
        console.log("after safetransferFrom");
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        IERC20(_tokenIn).safeTransfer(feeReceiver, _fees);
        console.log("after safetransferFrom");
        // IERC20(paths[0]).safeIncreaseAllowance(paths[1], amountOut);

        IERC20(_tokenIn).safeIncreaseAllowance(paths[0], _amountIn - _fees);

        console.log("Before custom vault");

        ICustomVault(paths[0]).withdrawAssetForSwapController(
            _recipient,
            // paths[0],
            amountOut
            // _tokenIn,
            // _amountIn - _fees
        );

        // console.log(
        //     IERC20(_tokenOut).balanceOf(address(this)),
        //     "This contract jtry balance"
        // );

        // IERC20(_tokenOut).safeTransfer(_recipient, amountOut);

        // // send c token to vault and receive x tokens
        // IERC4626StakingPool(poolToSwapFrom).swapStakeTokenWithCToken(
        //     address(this),
        //     amountOut,
        //     underLyingCTokenA
        // );

        console.log("Yahan tak----------------------------");
        console.log("Yahan tak----------------------------", amountOut);

        // IERC20(xToken).safeIncreaseAllowance(customVaultJtry, amountOut);
        // console.log(xToken, "X token address");
        // console.log(
        //     IERC20(xToken).balanceOf(address(this)),
        //     "X token balace in swap controller"
        // );

        // uint256 shares = IERC4626StakingPool(customVaultJtry).withdraw(
        //     amountOut,
        //     address(this), // TODO: to put recepient address here
        //     address(this)
        // );
        // console.log(shares, "shares");

        // IERC20(jTRY).safeTransfer(_recipient, shares);

        // IERC20(_tokenIn).safeIncreaseAllowance(customVaultUSDC, _amountIn);

        // IERC4626StakingPool(customVaultUSDC).stake(_amountIn);

        // now depositing staking token in + depositing sToken in gauge
        IERC20(_tokenIn).safeIncreaseAllowance(paths[1], _amountIn - _fees);
        IVaultRouter(paths[1]).stake(
            _amountIn - _fees,
            address(0),
            address(0),
            true,
            false,
            false
        );
    }

    function updatePoolToSwapFromAddr(address _newPool) external {
        poolToSwapFrom = _newPool;
    }

    function updateOwner(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }

    function rescueToken(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        IERC20(_tokenAddress).safeTransfer(msg.sender, _amount);
    }

    function setCustomVaultJtry(address _customVaultJtry) external {
        customVaultJtry = _customVaultJtry;
    }

    function setXToken(address _xtoken) external {
        xToken = _xtoken;
    }

    function setJTRY(address _jTRY) external {
        jTRY = _jTRY;
    }

    function setCustomVaultUSDC(address _customVaultUSDC) external {
        customVaultUSDC = _customVaultUSDC;
    }

    function setFeeReceiver(address _receiver) external {
        feeReceiver = _receiver;
    }

    function setVaultRouter(address _vaultRouter) external {
        vaultRouter = _vaultRouter;
    }
}
