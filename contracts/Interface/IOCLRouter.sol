// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOCLRouter {
    function swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    function getOutputAmount(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut);
}
