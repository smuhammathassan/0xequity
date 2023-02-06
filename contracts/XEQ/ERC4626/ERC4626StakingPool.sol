// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import {Owned} from "solmate/src/auth/Owned.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {ERC4626} from "solmate/src/mixins/ERC4626.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";

import {FullMath} from "./../lib/FullMath.sol";
import {Multicall} from "./../lib/Multicall.sol";
import {SelfPermit} from "./../lib/SelfPermit.sol";

/// @title ERC4626StakingPool
/// @author 0xClandestine
///     modified from https://github.com/ZeframLou/playpen/blob/main/src/ERC20StakingPool.sol
/// @notice A modern, gas optimized staking pool contract for rewarding ERC20 stakers
/// with ERC20 tokens periodically and continuously, deposits are wrapped as an ERC4626.
contract ERC4626StakingPool is Owned, Multicall, SelfPermit, ERC4626 {
    /// -----------------------------------------------------------------------
    /// Library usage
    /// -----------------------------------------------------------------------

    using SafeTransferLib for ERC20;

    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------

    error Error_ZeroOwner();
    error Error_AlreadyInitialized();
    error Error_NotRewardDistributor();
    error Error_AmountTooLarge();

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    /// -----------------------------------------------------------------------
    /// Constants
    /// -----------------------------------------------------------------------

    uint256 internal constant RAY = 1e27;

    /// -----------------------------------------------------------------------
    /// Storage variables
    /// -----------------------------------------------------------------------

    /// @notice Struct containing reward info pertaining to the broader
    /// @param The last Unix timestamp (in seconds) when rewardPerTokenStored was updated
    /// @param The Unix timestamp (in seconds) at which the current reward period ends
    /// @param The per-second rate at which rewardPerToken increases
    struct RewardInfo {
        uint64 lastUpdateTime;
        uint64 periodFinish;
        uint128 rewardRate;
    }

    /// @notice Struct containing reward info pertaining to any given user
    /// @param rewards The rewardPerToken value when an account last staked/withdrew rewards
    /// @param rewardPerTokenPaid The earned() value when an account last staked/withdrew rewards
    struct UserInfo {
        uint128 rewards;
        uint128 rewardPerTokenPaid;
        uint256 stakeTime;
    }

    /// @notice Tracks reward info related to the broader contract
    RewardInfo public rewardInfo;

    /// @notice Tracks reward info related to the user
    mapping(address => UserInfo) public userInfo;

    /// @notice Tracks if an address can call notifyReward()
    mapping(address => bool) public isRewardDistributor;

    /// @notice The last stored rewardPerToken value
    uint256 public rewardPerTokenStored;

    /// -----------------------------------------------------------------------
    /// Immutable parameters
    /// -----------------------------------------------------------------------

    address public immutable stakeToken;

    address public immutable rewardToken;

    uint256 public immutable DURATION = 86400 * 7; // 7 days , REWARD distribution duration

    uint256 public immutable LOCK_DURATION = 86400 * 30; // 30 days

    /// -----------------------------------------------------------------------
    /// Initialization
    /// -----------------------------------------------------------------------

    constructor(
        address initialOwner,
        address _rewardToken,
        address _stakeToken
    ) Owned(initialOwner) ERC4626(ERC20(_stakeToken), "sTRY", "sTRY") {
        rewardToken = _rewardToken;
        stakeToken = _stakeToken;
    }

    /// -----------------------------------------------------------------------
    /// Transfer Logic
    /// -----------------------------------------------------------------------

    function transfer(address to, uint256 amount)
        public
        virtual
        override
        returns (bool)
    {
        getReward(msg.sender);
        getReward(to);
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        getReward(from);
        getReward(to);
        return super.transferFrom(from, to, amount);
    }

    /// -----------------------------------------------------------------------
    /// Internal Enter/Exit Logic
    /// -----------------------------------------------------------------------

    function _enter(address who, uint256 amount) internal {
        if (amount == 0) return;

        UserInfo storage user = userInfo[who];
        user.stakeTime = block.timestamp;
        RewardInfo storage info = rewardInfo;

        uint256 supply = totalSupply;
        uint256 balance = balanceOf[who];
        uint64 lastTime = lastTimeApplicable();
        uint256 rewardsPerToken = _rewardPerToken(
            supply,
            lastTime,
            info.rewardRate
        );

        rewardPerTokenStored = rewardsPerToken;
        info.lastUpdateTime = lastTime;

        user.rewards = uint128(
            _earned(who, balance, rewardsPerToken, user.rewards)
        );

        user.rewardPerTokenPaid = uint128(rewardsPerToken);
    }

    function _leave(address who, uint256 amount) internal {
        if (amount == 0) return;

        UserInfo storage user = userInfo[who];

        require(
            user.stakeTime + LOCK_DURATION <= block.timestamp,
            "Can't withdraw until week"
        );
        RewardInfo storage info = rewardInfo;

        uint256 balance = balanceOf[who];
        uint64 lastTime = lastTimeApplicable();
        uint256 supply = totalSupply;
        uint256 rewardsPerToken = _rewardPerToken(
            supply,
            lastTime,
            info.rewardRate
        );

        rewardPerTokenStored = rewardsPerToken;
        info.lastUpdateTime = lastTime;

        user.rewards = uint128(
            _earned(who, balance, rewardsPerToken, user.rewards)
        );

        user.rewardPerTokenPaid = uint128(rewardsPerToken);
    }

    /// -----------------------------------------------------------------------
    /// User actions
    /// -----------------------------------------------------------------------

    function stake(uint256 assets) external returns (uint256 shares) {
        return deposit(assets, msg.sender);
    }

    function withdraw(uint256 shares) external returns (uint256 assets) {
        return withdraw(shares, msg.sender, msg.sender);
    }

    function exit() external returns (uint256 assets) {
        getReward();
        return withdraw(balanceOf[msg.sender], msg.sender, msg.sender);
    }

    function deposit(uint256 assets, address receiver)
        public
        virtual
        override
        returns (uint256 shares)
    {
        _enter(msg.sender, assets);
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver)
        public
        virtual
        override
        returns (uint256 assets)
    {
        _enter(msg.sender, assets);
        return super.mint(shares, receiver);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) public virtual override returns (uint256 shares) {
        _leave(msg.sender, assets);
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner_
    ) public virtual override returns (uint256 assets) {
        _leave(msg.sender, shares);
        return super.withdraw(shares, receiver, owner_);
    }

    /// @notice Withdraws all earned rewards for an address
    function getReward(address who) public {
        UserInfo storage user = userInfo[who];
        RewardInfo storage info = rewardInfo;

        uint256 balance = balanceOf[who];
        uint64 lastTime = lastTimeApplicable();
        uint256 supply = totalSupply;
        uint256 rewardsPerToken = _rewardPerToken(
            supply,
            lastTime,
            info.rewardRate
        );
        uint256 reward = _earned(who, balance, rewardsPerToken, user.rewards);

        // accrue rewards
        rewardPerTokenStored = rewardsPerToken;
        info.lastUpdateTime = lastTime;
        user.rewardPerTokenPaid = uint128(rewardsPerToken);

        // withdraw rewards
        if (reward > 0) {
            user.rewards = 0;
            ERC20(rewardToken).safeTransfer(who, reward);
            emit RewardPaid(who, reward);
        }
    }

    /// @notice Withdraws all earned rewards
    function getReward() public {
        getReward(msg.sender);
    }

    /// -----------------------------------------------------------------------
    /// Getters
    /// -----------------------------------------------------------------------

    /// @notice The latest time at which stakers are earning rewards.
    function lastTimeApplicable() public view returns (uint64) {
        uint64 _periodFinish = rewardInfo.periodFinish;
        return
            block.timestamp < _periodFinish
                ? uint64(block.timestamp)
                : _periodFinish;
    }

    /// @notice The amount of reward tokens each staked token has earned so far
    function rewardPerToken() external view returns (uint256) {
        return
            _rewardPerToken(
                totalSupply,
                lastTimeApplicable(),
                rewardInfo.rewardRate
            );
    }

    /// @notice The amount of reward tokens an account has accrued so far. Does not
    /// include already withdrawn rewards.
    function earned(address account) external view returns (uint256) {
        return
            _earned(
                account,
                balanceOf[account],
                _rewardPerToken(
                    totalSupply,
                    lastTimeApplicable(),
                    rewardInfo.rewardRate
                ),
                userInfo[account].rewards
            );
    }

    function totalAssets() public view virtual override returns (uint256) {
        return totalSupply;
    }

    function convertToShares(uint256 assets)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return assets;
    }

    function convertToAssets(uint256 shares)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return shares;
    }

    function previewDeposit(uint256 assets)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return assets;
    }

    function previewMint(uint256 shares)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return shares;
    }

    function previewWithdraw(uint256 assets)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return assets;
    }

    function previewRedeem(uint256 shares)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return shares;
    }

    /// -----------------------------------------------------------------------
    /// Owner actions
    /// -----------------------------------------------------------------------

    /// @notice Lets a reward distributor start a new reward period. The reward tokens must have already
    /// been transferred to this contract before calling this function. If it is called
    /// when a reward period is still active, a new reward period will begin from the time
    /// of calling this function, using the leftover rewards from the old reward period plus
    /// the newly sent rewards as the reward.
    /// @dev If the reward amount will cause an overflow when computing rewardPerToken, then
    /// this function will revert.
    /// @param reward The amount of reward tokens to use in the new reward period.
    function notifyRewardAmount(uint256 reward) external {
        /// -----------------------------------------------------------------------
        /// Validation
        /// -----------------------------------------------------------------------

        if (reward == 0) return;

        if (!isRewardDistributor[msg.sender])
            revert Error_NotRewardDistributor();

        /// -----------------------------------------------------------------------
        /// Storage loads
        /// -----------------------------------------------------------------------

        RewardInfo memory info = rewardInfo;

        uint256 supply = totalSupply;

        /// -----------------------------------------------------------------------
        /// State updates
        /// -----------------------------------------------------------------------

        // accrue rewards
        rewardPerTokenStored = _rewardPerToken(
            supply,
            block.timestamp < info.periodFinish
                ? uint64(block.timestamp)
                : info.periodFinish,
            info.rewardRate
        );

        // record new reward
        uint256 newRewardRate = block.timestamp >= info.periodFinish
            ? reward / DURATION
            : ((info.periodFinish - block.timestamp) *
                info.rewardRate +
                reward) / DURATION;

        // unchecked because division cannot reasonably underflow
        unchecked {
            // prevent overflow when computing rewardPerToken
            if (newRewardRate >= ((type(uint256).max / RAY) / DURATION)) {
                revert Error_AmountTooLarge();
            }
        }

        rewardInfo = RewardInfo(
            uint64(block.timestamp),
            uint64(block.timestamp + DURATION),
            uint128(newRewardRate)
        );

        emit RewardAdded(reward);
    }

    /// @notice Lets the owner add/remove accounts from the list of reward distributors.
    /// Reward distributors can call notifyRewardAmount()
    /// @param rewardDistributor The account to add/remove
    /// @param isRewardDistributor_ True to add the account, false to remove the account
    function setRewardDistributor(
        address rewardDistributor,
        bool isRewardDistributor_
    ) external onlyOwner {
        isRewardDistributor[rewardDistributor] = isRewardDistributor_;
    }

    /// -----------------------------------------------------------------------
    /// Internal functions
    /// -----------------------------------------------------------------------

    function _earned(
        address account,
        uint256 balance,
        uint256 rewardsPerToken,
        uint256 accountRewards
    ) internal view returns (uint256) {
        return
            FullMath.mulDiv(
                balance,
                rewardsPerToken - userInfo[account].rewardPerTokenPaid,
                RAY
            ) + accountRewards;
    }

    function _rewardPerToken(
        uint256 supply,
        uint256 lastTime,
        uint256 rewardRate_
    ) internal view returns (uint256) {
        if (supply == 0) return rewardPerTokenStored;

        return
            rewardPerTokenStored +
            FullMath.mulDiv(
                (lastTime - rewardInfo.lastUpdateTime) * RAY,
                rewardRate_,
                supply
            );
    }

    function harvest(address _controller, uint256 _amount) external onlyOwner {
        asset.safeTransfer(_controller, _amount);
    }
}
