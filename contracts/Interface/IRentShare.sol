//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRentShare {
    //----------------------------------------
    // Events
    //----------------------------------------

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

    struct Storage {
        Pool[] pools; // Staking pools
        address rewardToken; // Token to be payed as reward
        uint256 REWARDS_PRECISION; // A big number to perform mul and div operations
        // Mapping poolId => staker address => PoolStaker
        mapping(uint256 => mapping(address => PoolStaker)) poolStakers;
    }

    //----------------------------------------
    // Function Sig
    //----------------------------------------

    function createPool(
        IERC20 _stakeToken,
        address maintainer
    ) external returns (uint256 poolId);

    function deposit(
        uint256 _poolId,
        address _sender,
        uint256 _amount
    ) external;

    function withdraw(
        uint256 _poolId,
        address _sender,
        uint256 _amount
    ) external;

    function harvestRewards(uint256 _poolId) external;
}
