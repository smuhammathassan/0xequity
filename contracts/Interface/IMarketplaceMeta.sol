// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface IMarketplaceMeta {
    function getFeeReceiverAddress() external view returns (address);
}
