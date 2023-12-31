//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

contract IPropertyToken {
    function addMinter(address account) external {}

    function mint(address _to, uint256 _amount) external {}

    function unlock(uint256 _amount) external {}
}
