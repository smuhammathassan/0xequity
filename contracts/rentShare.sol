//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "./Interface/IPropertyToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {IRentShare} from "./Interface/IRentShare.sol";
import {PriceFeedLib} from "./libraries/PricefeedLib.sol";
import {RentShareLib} from "./libraries/RentShareLib.sol";

error AlreadyPaused();
error AlreadyUnpaused();
error SetRentFirst();
error OnlyAdminRole();
error OnlyMaintainerRole();

contract RentShare is IRentShare, AccessControlEnumerable {
    using RentShareLib for Storage;
    using SafeERC20 for IERC20; // Wrappers around ERC20 operations that throw on failure

    //----------------------------------------
    // Constants
    //----------------------------------------

    bytes32 public constant MAINTAINER_ROLE = keccak256("Maintainer");

    //----------------------------------------
    // Storage
    //----------------------------------------

    Storage internal storageParams;

    //----------------------------------------
    // Modifiers
    //----------------------------------------

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdminRole();
        }
        _;
    }

    modifier onlyMaintainer() {
        if (!hasRole(MAINTAINER_ROLE, msg.sender)) {
            revert OnlyMaintainerRole();
        }
        _;
    }

    //----------------------------------------
    // Constructor
    //----------------------------------------
    constructor(address _rewardTokenAddress) {
        storageParams.rewardToken = _rewardTokenAddress;
        storageParams.REWARDS_PRECISION = 1e12;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    //----------------------------------------
    // External view
    //----------------------------------------

    /**
     * @param _poolId id of the pool
     * @param _staker address of the staker
     * @return amount of token staked by user for specific pool
     */
    function getPoolStakerAmount(
        uint256 _poolId,
        address _staker
    ) external view returns (uint256) {
        return storageParams.poolStakers[_poolId][_staker].amount;
    }

    //----------------------------------------
    // External
    //----------------------------------------

    /**
     * @notice to update the rewards for the specific pool
     * @param _poolId id of the pool
     * @param _amount amounf of rewards tokens to distribute per month.
     */
    function updateRewardPerMonth(
        uint256 _poolId,
        uint256 _amount
    ) external onlyAdmin {
        Pool storage pool = storageParams.pools[_poolId];
        //1 Month (30.44 days)  = 2629743 Seconds
        pool.rewardTokensPerSecond =
            (_amount * storageParams.REWARDS_PRECISION) /
            2629743;
        emit PoolRewardUpdated(_poolId, _amount);
    }

    //Have to add the onlyMarketPlace modifier on this one
    /**
     * @notice Create a new staking pool
     * @dev not transfering in any token just using calculation on the bases of transfer
     * @param _stakeToken address of token to be staked
     * @return poolId id of created pool
     */
    function createPool(
        IERC20 _stakeToken,
        address maintainer
    ) external onlyMaintainer returns (uint256 poolId) {
        Pool memory pool;
        pool.stakeToken = _stakeToken;
        pool.rewardTokensPerSecond = 0;
        storageParams.pools.push(pool);
        poolId = storageParams.pools.length - 1;
        _grantRole(MAINTAINER_ROLE, maintainer);
        emit PoolCreated(poolId);
    }

    /**
     * @notice Deposit tokens to an existing pool
     * @param _poolId id of the pool
     * @param _sender address of the caller
     * @param _amount amount of the deposit
     */
    function deposit(
        uint256 _poolId,
        address _sender,
        uint256 _amount
    ) external onlyMaintainer {
        require(_amount > 0, "Deposit amount can't be zero");

        //fetching pool id
        Pool storage pool = storageParams.pools[_poolId];
        //fetching staker details
        PoolStaker storage staker = storageParams.poolStakers[_poolId][_sender];

        // Update pool stakers
        _harvestRewards(_poolId, _sender);

        // Update current staker
        staker.amount = staker.amount + _amount;
        //update the reward debt for current staker
        staker.rewardDebt =
            (staker.amount * pool.accumulatedRewardsPerShare) /
            storageParams.REWARDS_PRECISION;

        // Update pool
        pool.tokensStaked = pool.tokensStaked + _amount;

        // Deposit tokens
        emit Deposit(_sender, _poolId, _amount);
        // pool.stakeToken.safeTransferFrom(
        //     address(_sender),
        //     address(this),
        //     _amount
        // );
    }

    /**
     * @notice Withdraw tokens from an existing pool
     * @param _poolId id of the pool.
     * @param _sender address of caller.
     * @param _amount amount of token to withdraw
     */
    function withdraw(
        uint256 _poolId,
        address _sender,
        uint256 _amount
    ) external onlyMaintainer {
        Pool storage pool = storageParams.pools[_poolId];
        PoolStaker storage staker = storageParams.poolStakers[_poolId][_sender];

        uint256 amount = staker.amount;
        require(_amount > 0, "Withdraw amount can't be zero");

        // Pay rewards
        _harvestRewards(_poolId, _sender);

        // Update staker
        staker.amount -= _amount;
        staker.rewardDebt =
            (staker.amount * pool.accumulatedRewardsPerShare) /
            storageParams.REWARDS_PRECISION;

        // Update pool
        pool.tokensStaked = pool.tokensStaked - _amount;

        // Withdraw tokens
        emit Withdraw(_sender, _poolId, amount);
        //pool.stakeToken.safeTransfer(address(_sender), _amount);
    }

    //----------------------------------------
    // Public
    //----------------------------------------

    /**
     * @notice anyone should be able to harvest rewards for given pool id
     * @param _poolId id of the pool
     */

    function harvestRewards(uint256 _poolId) public {
        _harvestRewards(_poolId, _msgSender());
    }

    /**
     * @notice Harvest user rewards from a given pool id
     * @param _poolId id of the pool.
     * @param sender address of the caller.
     */
    function _harvestRewards(
        uint256 _poolId,
        address sender
    ) internal onlyMaintainer {
        updatePoolRewards(_poolId);
        storageParams.harvestRewards(_poolId, sender);
    }

    //----------------------------------------
    // Private
    //----------------------------------------

    /**
     * @notice Update pool's accumulatedRewardsPerShare and lastRewardedTimestamp
     * @param _poolId id of the pool
     */
    function updatePoolRewards(uint256 _poolId) private {
        storageParams.updatePoolRewards(_poolId);
    }
}
