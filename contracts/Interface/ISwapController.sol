//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface ISwapController {
    function swapTokens(
        address _recipient,
        uint256 _amountIn,
        address _tokenIn,
        uint256 _amountOut
    ) external;
}
