// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >0.8.0;

interface IFeeManager {
    function calculateXEQForBuy(address _token, uint256 _amountOfTokens)
        external
        pure
        returns (uint256);

    function calculateXEQForSell(address _token, uint256 _amountOfTokens)
        external
        pure
        returns (uint256);
}
