//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "./Interface/IPropertyToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

error AlreadyPaused();
error AlreadyUnpaused();
error SetRentFirst();
error OnlyAdminRole();
error OnlyMaintainerRole();

contract StakingManager is AccessControlEnumerable {
    using SafeERC20 for IERC20; // Wrappers around ERC20 operations that throw on failure

    //----------------------------------------
    // Constants
    //----------------------------------------

    bytes32 public constant MAINTAINER_ROLE = keccak256("Maintainer");

    //----------------------------------------
    // Structs
    //----------------------------------------

    // Staking user for a pool
    struct PoolStaker {
        uint256 amount; // The tokens quantity the user has staked.
        uint256 rewards; // The reward tokens quantity the user can harvest
        uint256 rewardDebt; // The amount relative to accumulatedRewardsPerShare the user can't get as reward
    }

    // Staking pool
    struct Pool {
        IERC20 stakeToken; // Token to be staked
        uint256 tokensStaked; // Total tokens staked
        uint256 lastRewardedTimestamp; // Last block number the user had their rewards calculated
        uint256 accumulatedRewardsPerShare; // Accumulated rewards per share times REWARDS_PRECISION
        uint256 rewardTokensPerSecond; // Number of reward tokens minted per block for this pool
    }

    //----------------------------------------
    // Storage
    //----------------------------------------

    Pool[] public pools; // Staking pools
    address public rewardToken; // Token to be payed as reward
    uint256 private constant REWARDS_PRECISION = 1e12; // A big number to perform mul and div operations
    // Mapping poolId => staker address => PoolStaker
    mapping(uint256 => mapping(address => PoolStaker)) public poolStakers;

    //----------------------------------------
    // Events
    //----------------------------------------

    // Events
    event Deposit(address indexed user, uint256 indexed poolId, uint256 amount);
    event Withdraw(
        address indexed user,
        uint256 indexed poolId,
        uint256 amount
    );
    event HarvestRewards(
        address indexed user,
        uint256 indexed poolId,
        uint256 amount
    );
    event PoolCreated(uint256 indexed poolId);
    event RewardsPaused(uint256 indexed poolId);
    event RewardsUnpaused(uint256 indexed poolId);
    event PoolRewardUpdated(uint256 indexed poolId, uint256 indexed amount);

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
        rewardToken = _rewardTokenAddress;
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
        return poolStakers[_poolId][_staker].amount;
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
        Pool storage pool = pools[_poolId];
        //1 Month (30.44 days)  = 2629743 Seconds
        pool.rewardTokensPerSecond = (_amount * REWARDS_PRECISION) / 2629743;
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
        pools.push(pool);
        poolId = pools.length - 1;
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
        Pool storage pool = pools[_poolId];
        //fetching staker details
        PoolStaker storage staker = poolStakers[_poolId][_sender];

        // Update pool stakers
        harvestRewards(_poolId, _sender);

        // Update current staker
        staker.amount = staker.amount + _amount;
        //update the reward debt for current staker
        staker.rewardDebt =
            (staker.amount * pool.accumulatedRewardsPerShare) /
            REWARDS_PRECISION;

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
        Pool storage pool = pools[_poolId];
        PoolStaker storage staker = poolStakers[_poolId][_sender];

        uint256 amount = staker.amount;
        require(_amount > 0, "Withdraw amount can't be zero");

        // Pay rewards
        harvestRewards(_poolId, _sender);

        // Update staker
        staker.amount -= _amount;
        staker.rewardDebt =
            (staker.amount * pool.accumulatedRewardsPerShare) /
            REWARDS_PRECISION;

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
     * @notice Harvest user rewards from a given pool id
     * @param _poolId id of the pool.
     * @param sender address of the caller.
     */
    function harvestRewards(
        uint256 _poolId,
        address sender
    ) public onlyMaintainer {
        updatePoolRewards(_poolId);
        Pool storage pool = pools[_poolId];
        PoolStaker storage staker = poolStakers[_poolId][sender];

        uint256 rewardsToHarvest = ((staker.amount *
            pool.accumulatedRewardsPerShare) / REWARDS_PRECISION) -
            staker.rewardDebt;
        if (rewardsToHarvest == 0) {
            staker.rewardDebt =
                (staker.amount * pool.accumulatedRewardsPerShare) /
                REWARDS_PRECISION;
            return;
        }
        staker.rewards = 0;
        staker.rewardDebt =
            (staker.amount * pool.accumulatedRewardsPerShare) /
            REWARDS_PRECISION;
        emit HarvestRewards(sender, _poolId, rewardsToHarvest);
        IPropertyToken(rewardToken).mint(sender, rewardsToHarvest);
    }

    //----------------------------------------
    // Private
    //----------------------------------------

    /**
     * @notice Update pool's accumulatedRewardsPerShare and lastRewardedTimestamp
     * @param _poolId id of the pool
     */
    function updatePoolRewards(uint256 _poolId) private {
        //fetching the pool
        Pool storage pool = pools[_poolId];
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
            ((rewards * REWARDS_PRECISION) / pool.tokensStaked);
        //updated the last reward block to current block
        pool.lastRewardedTimestamp = block.timestamp;
    }
}
