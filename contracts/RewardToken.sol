// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract RewardToken is ERC20 {
    constructor() ERC20("RewardToken", "RT") {}

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount * 1e18);
        console.log(
            "====================================Minted ",
            _amount,
            " to ",
            _to
        );
    }
}
