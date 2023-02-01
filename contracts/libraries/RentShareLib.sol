// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "hardhat/console.sol";
import {IFinder} from "../Interface/IFinder.sol";
import {ZeroXInterfaces} from "../constants.sol";
import {IRentShare} from "../Interface/IRentShare.sol";
import {IPropertyToken} from "../Interface/IPropertyToken.sol";

// This contract uses the library to set and retrieve state variables
library RentShareLib {
    event HarvestRewards(
        address indexed user,
        uint256 indexed poolId,
        uint256 amount
    );

    function isTrustedForwarder(
        IRentShare.Storage storage _storageParams,
        address _forwarder
    ) external view returns (bool) {
        try
            IFinder(_storageParams.finder).getImplementationAddress(
                ZeroXInterfaces.TRUSTED_FORWARDER
            )
        returns (address trustedForwarder) {
            if (_forwarder == trustedForwarder) {
                return true;
            } else {
                return false;
            }
        } catch {
            return false;
        }
    }

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

    function _getAccumulatedRewards(
        IRentShare.Storage storage _storageParams,
        string memory tokenSymbol,
        address _staker
    ) external view returns (uint256 rewardsToHarvest) {
        uint256 poolId = _storageParams.symbolToPoolId[tokenSymbol];
        //fetching the pool
        //fetching the pool
        IRentShare.Pool memory pool = _storageParams.pools[poolId];
        //if the total tokenStaked is zero so far then update the lastRewardedTimestamp as the current block.timeStamp
        if (pool.tokensStaked == 0) {
            pool.lastRewardedTimestamp = block.timestamp;
            return 0;
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

        //-------------------------------------------------------------------------

        IRentShare.PoolStaker memory staker = _storageParams.poolStakers[
            poolId
        ][_staker];

        rewardsToHarvest =
            ((staker.amount * pool.accumulatedRewardsPerShare) /
                _storageParams.REWARDS_PRECISION) -
            staker.rewardDebt;
    }

    function harvestRewards(
        IRentShare.Storage storage _storageParams,
        uint256 _poolId,
        address sender
    ) external {
        if (!_storageParams.rewardsPaused[_poolId]) {
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
}
