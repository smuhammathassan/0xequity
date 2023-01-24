// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Interface/IToken.sol";
//import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
//import "@openzeppelin/contracts/access/AccessControl.sol";
import {IRentShare} from "./Interface/IRentShare.sol";
import "hardhat/console.sol";
import {MintableBurnableSyntheticTokenPermit} from "./SyntheticToken/MintableBurnableSyntheticTokenPermit.sol";
import {AccessControlEnumerable, Context} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {IFinder} from "./Interface/IFinder.sol";
import {IRentShare} from "./Interface/IRentShare.sol";
import {ISBT} from "./Interface/ISBT.sol";
import {ZeroXInterfaces} from "./constants.sol";

error CallerNotFactory();
error OnlyAdminRole();
error onlyRole();
error NonKYC();

contract PropertyToken is MintableBurnableSyntheticTokenPermit {
    //----------------------------------------
    // Storage
    //----------------------------------------

    uint256 poolId;
    address finder;
    bool communityBound;

    //----------------------------------------
    // Constructor
    //----------------------------------------

    constructor(
        address _finder,
        address _sender,
        uint256 _poolId,
        string memory _name,
        string memory _symbol,
        uint8 _tokenDecimals
    ) MintableBurnableSyntheticTokenPermit(_name, _symbol, _tokenDecimals) {
        poolId = _poolId;
        finder = _finder;
        grantRole(ZeroXInterfaces.MAINTAINER_ROLE, _msgSender());
        grantRole(DEFAULT_ADMIN_ROLE, _sender);
    }

    //----------------------------------------
    // External
    //----------------------------------------

    /**
     * @notice to withdraw harvested rewards
     * @param to addresss where admin want to redeem
     * @param amount of rewards to withdraw.
     */

    function withdrawRewards(
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(
            IFinder(finder).getImplementationAddress(
                ZeroXInterfaces.REWARD_TOKEN
            )
        ).transfer(to, amount);
    }

    /**
     * @notice to call the harvest rewards function on rentShare contract.
     */
    function harvestRewards() external onlyRole(DEFAULT_ADMIN_ROLE) {
        IRentShare(
            IFinder(finder).getImplementationAddress(ZeroXInterfaces.RENT_SHARE)
        ).harvestRewards(symbol());
    }

    /**
     * @notice get the status of communityBound.
     */
    function getCommunityBound() external view returns (bool) {
        return communityBound;
    }

    function setCommunityBound(
        bool status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        communityBound = status;
    }

    //buy sell from contract is Marketplace Contract
    //address(this) will be replaced by the address of Marketplace contract
    //everytime someOne by or sell propertyToken via marketplace so transferFrom will be called
    //that means _afterTokenTransfer function is called.
    //we have to make a onlyMinterRole, who can access the functions in the rentShare contract
    //rentShare contract is taking reward per block which I have to make in a way that it can be used for
    //multiple propertyToken contracts which so everyone can set rewardPerblock
    //Change the rewardPerBlock thing to reward per second.
    //we can also move the rewardToken which we expilcitly in the contructor to the struct which can be accessed laterOn.
    //this way we can make sure if the rewards are in TLira or USDC both are accomodated.

    //I have to think about what if the user want to withdraw the rewards without selling then how to cater that.
    //buy sell

    //-----------------How this will work-----------
    //1. factory contract will create this contract
    //2. this contract require to have two addresses,
    //      1. staking contract address
    //      2. MarketPlace Contract Address
    //----------------------------------------------

    //-------------------But for testing ------------
    // 1. Add it to the marketplace.
    // 2. buySell tokens on marketplace and see if the _afterTokenTransfer is working

    //----------------------------------------
    // Internal
    //----------------------------------------

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        // 1. property approved
        // 2. to, from balances.
        // 3. compare.
        address SBT = IFinder(finder).getImplementationAddress(
            ZeroXInterfaces.SBT
        );
        if (communityBound) {
            string[] memory approvedCommunities = ISBT(SBT)
                .getApprovedSBTCommunities(symbol());
            bool KYCd;
            for (uint256 i; i < approvedCommunities.length; i++) {
                bool balanceFrom = ISBT(SBT).getBalanceOf(
                    from,
                    approvedCommunities[i]
                ) > 0
                    ? true
                    : false;
                bool balanceTo = ISBT(SBT).getBalanceOf(
                    to,
                    approvedCommunities[i]
                ) > 0
                    ? true
                    : false;
                if (balanceFrom && balanceTo) {
                    KYCd = true;
                    break;
                }
            }
            if (!KYCd) {
                revert NonKYC();
            }
            (amount);
        }
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        address MP = IFinder(finder).getImplementationAddress(
            ZeroXInterfaces.MARKETPLACE
        );
        address stakingContract = IFinder(finder).getImplementationAddress(
            ZeroXInterfaces.RENT_SHARE
        );

        console.log("------------------------------------------------");
        console.log("Marketplace => ", MP);
        console.log("From => ", from);
        console.log("to => ", to);
        console.log("amount => ", amount);
        console.log("------------------------------------------------");
        //buy sell or transfer
        if (from == address(0x00)) {
            console.log("Minting I guess");
            if (to == MP) {
                IRentShare(stakingContract).deposit(
                    poolId,
                    address(this),
                    amount
                );
                return;
            } else {
                IRentShare(stakingContract).deposit(poolId, from, amount);
                return;
            }
        }
        if (from == MP) {
            if (to == address(0x00)) {
                IRentShare(stakingContract).withdraw(
                    poolId,
                    address(this),
                    amount
                );
                console.log(
                    "INSIDE 0000000000000000000XXXXXXXXXXXX0000000000000000000000000"
                );
            } else {
                IRentShare(stakingContract).withdraw(
                    poolId,
                    address(this),
                    amount
                );
                IRentShare(stakingContract).deposit(poolId, to, amount);
            }
        } else if (to == MP) {
            console.log("selling I guess");
            IRentShare(stakingContract).withdraw(poolId, from, amount);
            IRentShare(stakingContract).deposit(poolId, address(this), amount);
        } else {
            console.log("::inside Elsex::");
            IRentShare(stakingContract).withdraw(poolId, from, amount);
            if (to == address(0x00)) {
                return;
            } else {
                IRentShare(stakingContract).deposit(poolId, to, amount);
            }
        }
    }
}
