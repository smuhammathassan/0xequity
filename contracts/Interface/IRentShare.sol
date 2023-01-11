//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IStakingManager {
    function createPool(IERC20 _stakeToken, address maintainer)
        external
        returns (uint256 poolId)
    {}

    function deposit(
        uint256 _poolId,
        address _sender,
        uint256 _amount
    ) external {}

    function withdraw(
        uint256 _poolId,
        address _sender,
        uint256 _amount
    ) external {}

    function harvestRewards(uint256 _poolId, address sender) external {}
}
