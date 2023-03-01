// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >0.8.0;

interface ICToken {
    function burnCTokens(uint256 _amount) external;
}
