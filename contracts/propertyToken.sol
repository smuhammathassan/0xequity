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
import {ZeroXInterfaces} from "./constants.sol";

error CallerNotFactory();
error OnlyAdminRole();

contract PropertyToken is MintableBurnableSyntheticTokenPermit {
    //----------------------------------------
    // Constant
    //----------------------------------------

    bytes32 public constant MAINTAINER_ROLE = keccak256("Maintainer");
    bytes32 public constant MARKETPLACE = "Marketplace";
    bytes32 public constant RENTSHARE = "RentShare";

    //----------------------------------------
    // Modifiers
    //----------------------------------------

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdminRole();
        }
        _;
    }

    //----------------------------------------
    // Storage
    //----------------------------------------

    uint256 poolId;
    address finder;

    //address stakingContract;

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
        grantRole(MAINTAINER_ROLE, _msgSender());
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

    function withdrawRewards(address to, uint256 amount) external onlyAdmin {
        IERC20(
            IFinder(finder).getImplementationAddress(
                ZeroXInterfaces.REWARD_TOKEN
            )
        ).transfer(to, amount);
    }

    /**
     * @notice to call the harvest rewards function on rentShare contract.
     */
    function harvestRewards() external onlyAdmin {
        IRentShare(
            IFinder(finder).getImplementationAddress(ZeroXInterfaces.RENT_SHARE)
        ).harvestRewards(symbol());
    }

    // function setPoolId(uint256 _poolId) external {
    //     poolId = _poolId;
    // }

    // constructor(
    //     IToken _property,
    //     string memory _name,
    //     string memory _symbol,
    //     address _factory,
    //     address _marketplace,
    //     address _stakingContract
    // ) ERC20(_name, _symbol) {
    //     property = _property;
    //     factory = _factory;
    //     marketPlace = _marketplace;
    //     stakingContract = _stakingContract;
    //     grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    //     grantRole(MINTER_ROLE, msg.sender);
    // }

    // function mint(address _to, uint256 _amount) external {
    //     _mint(_to, _amount);
    // }

    // function unlock(uint256 _amount) external onlyMinter {
    //     IToken(property).approve(factory, _amount);
    // }

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

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        address MP = IFinder(finder).getImplementationAddress(MARKETPLACE);
        address stakingContract = IFinder(finder).getImplementationAddress(
            RENTSHARE
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

    // function transfer(
    //     address to,
    //     uint256 amount
    // ) public virtual override returns (bool) {
    //     address owner = _msgSender();
    //     _transfer(owner, to, amount);
    //     return true;
    // }
}
