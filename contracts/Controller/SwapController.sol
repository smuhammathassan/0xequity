// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.7;

import {IERC4626StakingPool} from "./../XEQ/interfaces/IERC4626StakingPool.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SwapController {
    using SafeERC20 for IERC20;

    address public poolToSwapFrom; // controller will use funds from this pool for swaps
    address public owner;
    address underLyingCTokenA; // cjTry
    address underLyingCTokenB; // cJUSDC

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
        address _tokenIn,
        uint256 amountOut
    ) external {
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        IERC20(underLyingCTokenA).safeIncreaseAllowance(
            poolToSwapFrom,
            amountOut
        );
        IERC4626StakingPool(poolToSwapFrom).swapStakeTokenWithCToken(
            _recipient,
            amountOut,
            underLyingCTokenA
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
}
