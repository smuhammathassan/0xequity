//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Interface/IPropertyToken.sol";

contract StakingManager is Ownable {
    using SafeERC20 for IERC20; // Wrappers around ERC20 operations that throw on failure

    address public rewardToken; // Token to be payed as reward

    // private rewardTokensPerSecond; // Number of reward tokens minted per block
    uint256 private constant REWARDS_PRECISION = 1e12; // A big number to perform mul and div operations

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

    Pool[] public pools; // Staking pools

    // Mapping poolId => staker address => PoolStaker
    mapping(uint256 => mapping(address => PoolStaker)) public poolStakers;

    function viewPoolStakers(uint256 _poolId, address _staker) public view {
        console.log(poolStakers[_poolId][_staker].amount);
    }

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
    event PoolCreated(uint256 poolId);

    // Constructor
    constructor(address _rewardTokenAddress) {
        rewardToken = _rewardTokenAddress;
        //rewardTokensPerSecond = _rewardTokensPerBlock;
    }

    function updateRewardPerMonth(uint256 _poolId, uint256 _amount) external {
        Pool storage pool = pools[_poolId];
        //1 Month (30.44 days)  = 2629743 Seconds
        pool.rewardTokensPerSecond = (_amount * 1e12) / 2629743;
    }

    //Have to add the onlyMarketPlace modifier on this one
    /**
     * @dev Create a new staking pool
     */
    function createPool(
        IERC20 _stakeToken,
        uint256 _rewardPerMonth
    ) external returns (uint256 poolId) {
        Pool memory pool;
        pool.stakeToken = _stakeToken;
        pool.rewardTokensPerSecond = (_rewardPerMonth * 1e12) / 2629743;
        pools.push(pool);
        poolId = pools.length - 1;
        emit PoolCreated(poolId);
    }

    /**
     * @dev Deposit tokens to an existing pool
     */
    function deposit(
        uint256 _poolId,
        address _sender,
        uint256 _amount
    ) external {
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
     * @dev Withdraw tokens from an existing pool
     */
    function withdraw(
        uint256 _poolId,
        address _sender,
        uint256 _amount
    ) external {
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

    /**
     * @dev Harvest user rewards from a given pool id
     */
    function harvestRewards(uint256 _poolId, address sender) public {
        updatePoolRewards(_poolId);
        Pool storage pool = pools[_poolId];
        PoolStaker storage staker = poolStakers[_poolId][sender];
        console.log("Staker Amount ----------", staker.amount);
        console.log(
            "Acc Reward Per Share  ----------",
            pool.accumulatedRewardsPerShare
        );
        console.log(
            "----------------",
            staker.amount * pool.accumulatedRewardsPerShare
        );
        uint256 rewardsToHarvest = ((staker.amount *
            pool.accumulatedRewardsPerShare) / REWARDS_PRECISION) -
            staker.rewardDebt;
        if (rewardsToHarvest == 0) {
            console.log("Reward To Harvest 0");
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
        console.log("minting reward tokens", rewardsToHarvest);
        IPropertyToken(rewardToken).mint(sender, rewardsToHarvest);
    }

    /**
     * @dev Update pool's accumulatedRewardsPerShare and lastRewardedTimestamp
     */
    function updatePoolRewards(uint256 _poolId) private {
        //fetching the pool
        Pool storage pool = pools[_poolId];
        //if the total tokenStaked is zero so far then update the lastRewardedTimestamp as the current block.number
        if (pool.tokensStaked == 0) {
            pool.lastRewardedTimestamp = block.timestamp;
            return;
        }
        //calculating the blockSinceLastReward i.e current block number - LastBlockRewarded

        uint256 TimeStampSinceLastReward = block.timestamp -
            pool.lastRewardedTimestamp;
        console.log("Timestamp sine Last Reward : ", TimeStampSinceLastReward);
        console.log("Reward Tokens Per Second : ", pool.rewardTokensPerSecond);
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
