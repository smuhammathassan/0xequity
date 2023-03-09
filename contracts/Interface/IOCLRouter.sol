// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOCLRouter {
    function swapTokensForExactOut(
        address tokenIn, // usdc
        address tokenOut, // jtry
        uint256 amountOut, // itny jtry chye
        address reciepient,
        address[] memory paths // 0 index is CTRY , 1 index is customVault of TRY, 2 Vault Router of USDC
    ) external returns (uint256);

    function getOutputAmount(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut);
}
