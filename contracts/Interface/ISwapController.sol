//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface ISwapController {
    function swapTokens(
        address _recipient,
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut,
        address[] memory paths // 0 index is CTRY , 1 index is customVault of TRY, 2 Vault Router of USDC
    ) external;
}
