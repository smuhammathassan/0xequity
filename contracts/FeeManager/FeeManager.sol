// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

// import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract FeeManager {
    // string jTRY = "jTRY";
    // string jUSDC = "jUSDC";

    function calculateXEQForBuy(address _token, uint256 _amountOfTokens)
        external
        pure
        returns (uint256)
    {
        (_token, _amountOfTokens);
        // string memory tokenName = IERC20Metadata(_token).name();
        // if (
        //     keccak256(abi.encodePacked(tokenName)) ==
        //     keccak256(abi.encodePacked(jTRY))
        // ) {
        return 100 * (1 ether);
        // }

        // if (
        //     keccak256(abi.encodePacked(tokenName)) ==
        //     keccak256(abi.encodePacked(jUSDC))
        // ) {
        //     return 10 * (1 ether);
        // }
    }

    function calculateXEQForSell(address _token, uint256 _amountOfTokens)
        external
        pure
        returns (uint256)
    {
        (_token, _amountOfTokens);
        // string memory tokenName = IERC20Metadata(_token).name();
        // if (
        //     keccak256(abi.encodePacked(tokenName)) ==
        //     keccak256(abi.encodePacked(jTRY))
        // ) {
        return 100 * (1 ether);
        // }

        // if (
        //     keccak256(abi.encodePacked(tokenName)) ==
        //     keccak256(abi.encodePacked(jUSDC))
        // ) {
        //     return 10 * (1 ether);
        // }
    }
}
