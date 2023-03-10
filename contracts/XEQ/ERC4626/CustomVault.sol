// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import {Owned} from "solmate/src/auth/Owned.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {ERC4626} from "solmate/src/mixins/ERC4626.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";

import {FullMath} from "./../lib/FullMath.sol";
import {Multicall} from "./../lib/Multicall.sol";
import {SelfPermit} from "./../lib/SelfPermit.sol";

import {IGauge} from "./../interfaces/IGauge.sol";
import {IDepositManager} from "./../interfaces/IDepositManager.sol";
import {IVaultRouter} from "./../interfaces/IVaultRouter.sol";

import {IMarketplaceMeta} from "./../../Interface/IMarketplaceMeta.sol";
import {IMintableBurnableERC20} from "./../../Interface/IMintableBurnableERC20.sol";
import "hardhat/console.sol";

/// @title CustomVault
/// @author 0xClandestine
///     modified from https://github.com/ZeframLou/playpen/blob/main/src/ERC20StakingPool.sol
/// @notice A modern, gas optimized staking pool contract for rewarding ERC20 stakers
/// with ERC20 tokens periodically and continuously, deposits are wrapped as an ERC4626.
contract CustomVault is Owned, Multicall, SelfPermit, ERC4626 {
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
    error InvalidMarketplaceBorrower();
    error InvalidFees();
    error InvalidController();

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    /// @notice Tracks time when user staked tokens()
    mapping(address => uint256) public userStakeTime;
    /// -----------------------------------------------------------------------
    /// Immutable parameters
    /// -----------------------------------------------------------------------

    address public immutable stakeToken;

    uint256 public LOCK_DURATION = 0; //86400 * 30; // 30 days

    uint256 public assetTotalSupply; // deposit asset total supply
    address public xToken;

    uint256 public fees = 375; // 3.75%
    address public depositManager;

    address public vaultRouter; // USDC vault router

    /// -----------------------------------------------------------------------
    /// Initialization
    /// -----------------------------------------------------------------------

    constructor(
        string memory _name,
        address initialOwner,
        address _stakeToken,
        address _xToken
    ) Owned(initialOwner) ERC4626(ERC20(_stakeToken), _name, _name) {
        // TODO : add zero address validation
        stakeToken = _stakeToken;
        xToken = _xToken;
    }

    /// -----------------------------------------------------------------------
    /// Internal Enter/Exit Logic
    /// -----------------------------------------------------------------------

    // TODO : remove all staking stuff, keep withdraw and dposit
    function _enter(address who, uint256 amount) internal {
        if (amount == 0) return;

        userStakeTime[who] = block.timestamp;
    }

    function _leave(address who, uint256 amount) internal view {
        if (amount == 0) return;
        require(
            userStakeTime[who] + LOCK_DURATION <= block.timestamp,
            "Can't withdraw until week"
        );
    }

    /// -----------------------------------------------------------------------
    /// User actions
    /// -----------------------------------------------------------------------

    function stake(uint256 assets) external returns (uint256 shares) {
        return deposit(assets, msg.sender);
    }

    function withdraw1(uint256 shares) external returns (uint256 assets) {
        return withdraw(shares, msg.sender, msg.sender);
    }

    // function exit() external returns (uint256 assets) {
    //     return withdraw(balanceOf[msg.sender], msg.sender, msg.sender);
    // }

    function deposit(
        uint256 assets,
        address receiver
    ) public virtual override returns (uint256 shares) {
        _enter(msg.sender, assets);
        shares = super.deposit(assets, receiver);
        console.log("before the custom vault registeration");
        // // TODO: to check if this should be done or not
        // IDepositManager(depositManager).registerCustomVaultDeposit(
        //     address(this),
        //     shares
        // );
        console.log("After supeer's deposit");
        assetTotalSupply += assets;
    }

    function mint(
        uint256 shares,
        address receiver
    ) public virtual override returns (uint256 assets) {
        _enter(msg.sender, assets);
        assets = super.mint(shares, receiver);
        assetTotalSupply += assets;
    }

    function _mint(address _to, uint256 _amount) internal virtual override {
        console.log("Hi from mint");
        console.log("amount", _amount);
        console.log(xToken, "this is xToken");
        IMintableBurnableERC20(xToken).mint(_to, _amount);
        console.log(xToken, "this is after mint");
    }

    function _burn(address _from, uint256 _amount) internal virtual override {
        console.log("Hello from the burn");
        (_from);
        ERC20(xToken).safeTransferFrom(msg.sender, address(this), _amount);
        ERC20(xToken).safeApprove(xToken, _amount);
        IMintableBurnableERC20(xToken).burn(_amount);
        console.log("Burn end");
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) public virtual override returns (uint256 shares) {
        console.log("withdraw me 1");
        _leave(msg.sender, assets);
        console.log("withdraw me 2");
        shares = super.withdraw(assets, receiver, owner_);
        // // TODO: to check if this should be done or not
        // IDepositManager(depositManager).withdrawCustomVaultDeposit(
        //     address(this),
        //     shares
        // );
        console.log("withdraw me end");
        assetTotalSupply -= assets;
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner_
    ) public virtual override returns (uint256 assets) {
        _leave(msg.sender, shares);
        assets = super.redeem(shares, receiver, owner_);
        assetTotalSupply -= assets;
    }

    /// -----------------------------------------------------------------------
    /// Getters
    /// -----------------------------------------------------------------------

    function totalAssets() public view virtual override returns (uint256) {
        return assetTotalSupply;
    }

    /// -----------------------------------------------------------------------
    /// Owner actions
    /// -----------------------------------------------------------------------

    /// -----------------------------------------------------------------------
    /// Internal functions
    /// -----------------------------------------------------------------------

    function updateFees(uint256 _newFees) external onlyOwner {
        // fees can't be more than 10%
        if (_newFees > 1000) {
            revert InvalidFees();
        }
        fees = _newFees;
    }

    function updateLockDuration(uint256 _durationInSeconds) external onlyOwner {
        LOCK_DURATION = _durationInSeconds;
    }

    function rescueToken(
        address _tokenAddress,
        uint256 _amount
    ) external onlyOwner {
        ERC20(_tokenAddress).safeTransfer(msg.sender, _amount);
    }

    function setDepositManager(address _depositManager) external onlyOwner {
        depositManager = _depositManager;
    }

    // this receives USDC and sends JTRY
    function withdrawAssetForSwapController(
        address recepient,
        uint256 _amountIn // address _swapToken, // usdc // uint256 _amountOfSwapToken
    ) external {
        console.log("Amount in in custom", _amountIn);
        console.log("depositManager in in custom", depositManager);
        console.log("msg.sender in in custom", msg.sender);

        IDepositManager(depositManager).borrowFund(msg.sender, _amountIn);
        ERC20(stakeToken).safeTransfer(recepient, _amountIn);
        console.log("aftr borrrow");
        // ERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        // ERC20(_swapToken).safeTransferFrom(
        //     msg.sender,
        //     address(this),
        //     _amountOfSwapToken
        // );
        // ERC20(_tokenIn).safeApprove(vaultRouter, _amountOfSwapToken);

        // IVaultRouter(vaultRouter).stake(
        //     _amountOfSwapToken,
        //     address(0x00),
        //     true
        // );
        // asset.safeTransfer(msg.sender, _amountIn);
    }

    // TODO: add acces control
    function borrow(uint amount) external {
        ERC20(xToken).safeTransferFrom(msg.sender, address(this), amount);
        ERC20(stakeToken).safeTransfer(msg.sender, amount);
    }

    // TODO: add acces control
    function repay(address recepient, uint amount) external {
        ERC20(stakeToken).safeTransferFrom(msg.sender, address(this), amount);
        ERC20(xToken).safeTransfer(recepient, amount);
    }
}
