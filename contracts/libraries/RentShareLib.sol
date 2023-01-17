// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "hardhat/console.sol";
import {IRentShare} from "../Interface/IRentShare.sol";
import {IPropertyToken} from "../Interface/IPropertyToken.sol";

// This contract uses the library to set and retrieve state variables
library RentShareLib {
    event HarvestRewards(
        address indexed user,
        uint256 indexed poolId,
        uint256 amount
    );

    function updatePoolRewards(
        IRentShare.Storage storage _storageParams,
        uint256 _poolId
    ) external {
        //fetching the pool
        IRentShare.Pool storage pool = _storageParams.pools[_poolId];
        //if the total tokenStaked is zero so far then update the lastRewardedTimestamp as the current block.timeStamp
        if (pool.tokensStaked == 0) {
            pool.lastRewardedTimestamp = block.timestamp;
            return;
        }
        //calculating the blockSinceLastReward i.e current block.timestamp - LastTimestampRewarded
        uint256 TimeStampSinceLastReward = block.timestamp -
            pool.lastRewardedTimestamp;
        //calculating the rewards since last block rewarded.
        uint256 rewards = (TimeStampSinceLastReward *
            pool.rewardTokensPerSecond) / 1e12;
        //accumulatedRewardPerShare += rewards * REWARDS_PRECISION / tokenStaked
        pool.accumulatedRewardsPerShare =
            pool.accumulatedRewardsPerShare +
            ((rewards * _storageParams.REWARDS_PRECISION) / pool.tokensStaked);
        //updated the last reward block to current block
        pool.lastRewardedTimestamp = block.timestamp;
    }

    function harvestRewards(
        IRentShare.Storage storage _storageParams,
        uint256 _poolId,
        address sender
    ) external {
        IRentShare.Pool storage pool = _storageParams.pools[_poolId];
        IRentShare.PoolStaker storage staker = _storageParams.poolStakers[
            _poolId
        ][sender];

        uint256 rewardsToHarvest = ((staker.amount *
            pool.accumulatedRewardsPerShare) /
            _storageParams.REWARDS_PRECISION) - staker.rewardDebt;
        if (rewardsToHarvest == 0) {
            staker.rewardDebt =
                (staker.amount * pool.accumulatedRewardsPerShare) /
                _storageParams.REWARDS_PRECISION;
            return;
        }
        staker.rewards = 0;
        staker.rewardDebt =
            (staker.amount * pool.accumulatedRewardsPerShare) /
            _storageParams.REWARDS_PRECISION;
        emit HarvestRewards(sender, _poolId, rewardsToHarvest);
        IPropertyToken(_storageParams.rewardToken).mint(
            sender,
            rewardsToHarvest
        );
    }
}
