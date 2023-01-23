//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface ISBT {
    function getApprovedSBTCommunities(
        string memory symbol
    ) external view returns (string[] memory);

    function getBalanceOf(
        address user,
        string memory community
    ) external view returns (uint256);
}
