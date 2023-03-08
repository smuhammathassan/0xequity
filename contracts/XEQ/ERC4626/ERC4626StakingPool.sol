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
import {IMarketplaceMeta} from "./../../Interface/IMarketplaceMeta.sol";
import {ICToken} from "./../../Interface/ICToken.sol";
import {IMintableBurnableERC20} from "./../../Interface/IMintableBurnableERC20.sol";
import {ReservesPool} from "./ReservesPool.sol";
import {CTokenManager} from "./CTokenManager.sol";
import "hardhat/console.sol";

/// @title ERC4626StakingPool
/// @author 0xClandestine
///     modified from https://github.com/ZeframLou/playpen/blob/main/src/ERC20StakingPool.sol
/// @notice A modern, gas optimized staking pool contract for rewarding ERC20 stakers
/// with ERC20 tokens periodically and continuously, deposits are wrapped as an ERC4626.
contract ERC4626StakingPool is
    CTokenManager,
    Owned,
    Multicall,
    SelfPermit,
    ERC4626
{
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

    mapping(address => bool) public allowedMarketPlaceBorrowers; // MarketPlaceBorower allowed to borrow tokens from this pool
    address public gaugeAddress; // Gauge from where the rewards should be claimed after depositing "this" token in Gauge
    uint256 public assetTotalSupply; // deposit asset total supply

    uint256 public fees = 375; // 3.75%

    /// -----------------------------------------------------------------------
    /// Initialization
    /// -----------------------------------------------------------------------

    constructor(
        string memory _name,
        address initialOwner,
        address _stakeToken,
        address _cTokenAddress
    )
        Owned(initialOwner)
        ERC4626(ERC20(_stakeToken), _name, _name)
        CTokenManager(_cTokenAddress)
    {
        // TODO : add zero address validation
        stakeToken = _stakeToken;
        _init(address(new ReservesPool(_cTokenAddress)));
    }

    // modifier
    modifier onlyAllowedMarketplaceBorrower() {
        if (!allowedMarketPlaceBorrowers[msg.sender]) {
            revert InvalidMarketplaceBorrower();
        }
        _;
    }

    modifier onlyAllowedController() {
        if (addressToCTokenPercentage[msg.sender] == 0) {
            revert InvalidController();
        }
        _;
    }

    /// -----------------------------------------------------------------------
    /// Transfer Logic
    /// -----------------------------------------------------------------------

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

    /// @param assets _no of underlying token to deposit
    /// @param cTokensReceiver can only be registered address in this pool
    function stake(
        uint256 assets,
        address cTokensReceiver,
        address buyBackPool,
        address sender
    ) external returns (uint256 shares) {
        shares = deposit(assets, sender);
        _handleDeposit(
            assets,
            cTokensReceiver,
            buyBackPool,
            sender,
            stakeToken
        );
    }

    /// @param assets _no of underlying token to deposit
    /// @param sender can only be registered address in this pool
    function normalStake(uint256 assets, address sender)
        external
        returns (uint256 shares)
    {
        shares = deposit(assets, sender);
    }

    function withdraw(uint256 shares) external returns (uint256 assets) {
        return withdraw(shares, msg.sender, msg.sender);
    }

    function exit() external returns (uint256 assets) {
        return withdraw(balanceOf[msg.sender], msg.sender, msg.sender);
    }

    function deposit(uint256 assets, address receiver)
        public
        virtual
        override
        returns (uint256 shares)
    {
        _enter(receiver, assets);
        shares = super.deposit(assets, msg.sender); // TODO: to review this
        assetTotalSupply += assets;
    }

    function mint(uint256 shares, address receiver)
        public
        virtual
        override
        returns (uint256 assets)
    {
        _enter(msg.sender, assets);
        assets = super.mint(shares, receiver);
        mintCTokenToAllocatedAddresses(assets, receiver);
        assetTotalSupply += assets;
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) public virtual override returns (uint256 shares) {
        _leave(msg.sender, assets);
        // _withdrawCTokensIfNeeded(assets);
        shares = super.withdraw(assets, receiver, owner_);
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

    /// @notice Transfers token after deducting fees to marketplace
    /// @param _amount amount asked wihtout fees
    function borrow(address marketplace, uint256 _amount)
        external
        onlyAllowedMarketplaceBorrower
        returns (uint256 actualBorrowAmount)
    {
        console.log("yahan borrow tak");
        // deducting fees
        uint256 _fee = (_amount * fees) / PERCENTAGE_BASED_POINT;
        actualBorrowAmount = _amount - _fee;
        console.log("after fee");
        // console.log(ERC20(asset).balanceOf(address(this)), "asset balance inside");

        asset.safeTransfer(msg.sender, actualBorrowAmount);
        console.log("after transfer");
    }

    function buyPropertyTokens(
        address _propertyToken,
        uint256 _amountOfTokens,
        address _marketPlace
    ) external onlyAllowedMarketplaceBorrower {
        ERC20(_propertyToken).safeTransfer(_marketPlace, _amountOfTokens);
    }

    function setAllowedMarketPlaceBorrower(address _addr) external onlyOwner {
        require(_addr != address(0x00), "zero address");
        allowedMarketPlaceBorrowers[_addr] = true;
    }

    function removeMarketplaceBorrower(address _addr) external onlyOwner {
        require(
            allowedMarketPlaceBorrowers[_addr],
            "Not a marketplace borrower"
        );
        allowedMarketPlaceBorrowers[_addr] = false;
    }

    function updateFees(uint256 _newFees) external onlyOwner {
        // fees can't be more than 10%
        if (_newFees > 1000) {
            revert InvalidFees();
        }
        fees = _newFees;
    }

    /// @notice notifies the reward to the Gauge

    function notiftyRewardToGauge(uint256 _rewardAmount)
        external
        onlyAllowedMarketplaceBorrower
    {
        console.log("Gauage address", gaugeAddress);
        uint256 _rewardToTransfer = _settleLossIfAny(_rewardAmount);
        console.log("after _settleLossIfAny");
        if (_rewardToTransfer > 0) {
            console.log(
                "_rewardToTransfer***********************************************************************************************",
                _rewardToTransfer
            );
            asset.safeApprove(gaugeAddress, _rewardToTransfer);
            IGauge(gaugeAddress).notifyRewardAmount(
                address(asset),
                _rewardToTransfer
            );
        }
        console.log("after the if");

        // TODO : increase / derease supply logic to be done
    }

    function _settleLossIfAny(uint256 _rewardAmount)
        internal
        returns (uint256)
    {
        console.log("_settleLossIfAny 1");
        uint256 assetSupply = assetTotalSupply;
        // if Deposit token > lp token, then means profit : else loss
        if (assetSupply >= totalSupply) {
            console.log("_settleLossIfAny 2");
            return _rewardAmount;
        } else {
            console.log("_settleLossIfAny 3");
            uint256 difference = totalSupply - assetSupply;
            increaseAssetTotalSupply(difference);
            console.log("_settleLossIfAny 5");
            return _rewardAmount >= difference ? _rewardAmount - difference : 0;
        }
    }

    function setGauge(address _gaugeAddr) external onlyOwner {
        gaugeAddress = _gaugeAddr;
    }

    function increaseAssetTotalSupply(uint256 _amount) internal {
        console.log("_settleLossIfAny 4");
        assetTotalSupply += _amount;
    }

    function decreaseAssetTotalSupply(uint256 _amount)
        external
        onlyAllowedMarketplaceBorrower
    {
        // asset.safeTransfer(msg.sender, _amount);
        assetTotalSupply -= _amount;
    }

    function afterRepay(uint256 amount, address marketplace)
        external
        onlyAllowedMarketplaceBorrower
    {
        console.log("amount in afterRepay Staking amanager", amount);
        if (amount > 0) {
            asset.safeTransfer(
                IMarketplaceMeta(marketplace).getFeeReceiverAddress(),
                amount
            );
        }
    }

    function updateLockDuration(uint256 _durationInSeconds) external onlyOwner {
        LOCK_DURATION = _durationInSeconds;
    }

    ///@param _addr address of pool or address to give allocation of cTokens to
    ///@param _percentage percentage of cTokens, e.g 100 is 1%
    /// @notice  allowing 0 allocation is case of revoking the allocation of address
    function setAddressToCTokenPercentage(address _addr, uint256 _percentage)
        external
        onlyOwner
    {
        // TODO : to put check that total allocated % is <= 80 %
        // TODO: 20% c-Tokens is reserved for pool
        require(_addr != address(0x00), "Zero address");
        require(_percentage <= 10000, "Invalid percentage");
        if (addressToCTokenPercentage[_addr] == 0) {
            allowedAddressesForCToken.push(_addr);
        }
        if (_percentage == 0) {
            removeAddrFromArray(_addr);
        }
        addressToCTokenPercentage[_addr] = _percentage;
    }

    ///@param _addr address of pool or address to give allocation of cTokens to
    ///@param _percentage percentage
    /// @notice  allowing 0 allocation is case of revoking the allocation of address
    function setBuyBackPoolPercentage(address _addr, uint256 _percentage)
        external
        onlyOwner
    {
        // TODO : to put check that total allocated % is <= 80 %
        // TODO: 20% c-Tokens is reserved for pool
        require(_addr != address(0x00), "Zero address");
        require(_percentage <= 10000, "Invalid percentage");
        if (buybackPoolToPercentage[_addr] == 0) {
            allowedAddressesForBuyBackPool.push(_addr);
        }
        if (_percentage == 0) {
            removeAddrFromBuyBackArray(_addr);
        }
        buybackPoolToPercentage[_addr] = _percentage;
    }

    function removeAddrFromBuyBackArray(address _addr) internal {
        uint256 index;
        uint256 counter;
        while (index == 0) {
            if (allowedAddressesForBuyBackPool[counter] == _addr) {
                index = counter;
                break;
            }
            counter++;
        }
        if (allowedAddressesForBuyBackPool.length - 1 != index) {
            allowedAddressesForBuyBackPool[
                index
            ] = allowedAddressesForBuyBackPool[
                allowedAddressesForBuyBackPool.length - 1
            ];
            allowedAddressesForBuyBackPool.pop();
        } else {
            allowedAddressesForBuyBackPool.pop();
        }
    }

    function swapStakeTokenWithCToken(
        address recipient,
        uint256 amountIn,
        address cToken
    ) external onlyAllowedController {
        ERC20(cToken).safeTransferFrom(msg.sender, address(this), amountIn);
        IMintableBurnableERC20(cToken).burn(amountIn);
        console.log("inside the swapStakeTokenWithCToken");
        console.log("inside the swapStakeTokenWithCToken", amountIn);
        console.log(address(asset), "address of asset toekn");
        asset.safeTransfer(recipient, amountIn);
    }

    function removeAddrFromArray(address _addr) internal {
        uint256 index;
        uint256 counter;
        while (index == 0) {
            if (allowedAddressesForCToken[counter] == _addr) {
                index = counter;
                break;
            }
            counter++;
        }
        if (allowedAddressesForCToken.length - 1 != index) {
            allowedAddressesForCToken[index] = allowedAddressesForCToken[
                allowedAddressesForCToken.length - 1
            ];
            allowedAddressesForCToken.pop();
        } else {
            allowedAddressesForCToken.pop();
        }
    }

    function _withdrawCTokensIfNeeded(uint256 assets) internal {
        uint256 xTokenSupply = assetTotalSupply;
        // uint256 cTokenSupply = ERC20(cTokenAddress).totalSupply();
        // uint256 percentOfX = (xTokenSupply *
        //     addressToCTokenPercentage[address(this)]) / PERCENTAGE_BASED_POINT;
        // if (ERC20(cTokenAddress).balanceOf(address(this)) < percentOfX) {
        // uint256 remaining = assets;

        // if(ERC20(cTokenAddress).balanceOf(address(this)) < percentOfX){

        // }
        // uint toBurn = ERC20(cTokenAddress).balanceOf(address(this));
        // remaining -= toBurn;
        // IMintableBurnableERC20(cTokenAddress).burn(toBurn);
        // address currentAddr;
        // for (uint256 i = 1; i < allowedAddressesForCToken.length; i++) {
        //     // TODO : what if we
        //     currentAddr = allowedAddressesForCToken[i];
        //     if (ERC20(cTokenAddress).balanceOf(currentAddr) >= remaining) {
        //         ICToken(currentAddr).burnCTokens(remaining);
        //         break;
        //     } else {
        //         uint256 available = ERC20(cTokenAddress).balanceOf(currentAddr);
        //         // TODO : now add this burnCTokens to every controller
        //         // TODO : do this using JARVIS manager for scalablity
        //         ICToken(currentAddr).burnCTokens(available);
        //         remaining -= available;
        //     }
        // }
        // if (remaining != 0) {
        //     revert("Insufficient cTokens liquidity");
        // }
        // }
    }

    function withdrawFromVaultRouter(
        uint256 _totalAmount,
        uint256 _reservePoolAmount,
        address _receiver,
        address _owner
    ) external {
        console.log("ye wala in vault chala");
        // TODO : add access control
        withdraw(_totalAmount - _reservePoolAmount, _receiver, _owner);
        asset.safeTransfer(_receiver, _reservePoolAmount);
        console.log(_reservePoolAmount, "_reservePoolAmount");

        ERC20(address(this)).safeTransferFrom(
            msg.sender,
            allowedAddressesForCToken[0],
            _reservePoolAmount
        );
    }

    function rescueToken(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        ERC20(_tokenAddress).safeTransfer(msg.sender, _amount);
    }
}
