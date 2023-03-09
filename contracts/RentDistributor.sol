//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "hardhat/console.sol";

import {ERC2771Context} from "./ERC2771Context.sol";
import {SelfPermit} from "./SelfPermit.sol";
import {IFinder} from "./Interface/IFinder.sol";
import {IPriceFeed} from "./Interface/IPriceFeed.sol";
import {IOCLRouter} from "./Interface/IOCLRouter.sol";
import {ZeroXInterfaces} from "./constants.sol";
import {WadRayMath} from "./libraries/WadRayMath.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControlEnumerable, Context} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import {ERC2771Context} from "./ERC2771Context.sol";
import {SelfPermit} from "./SelfPermit.sol";
error OnlyAdminRole();

contract RentDistributor is
    AccessControlEnumerable,
    ERC2771Context,
    SelfPermit,
    Multicall
{
    using SafeERC20 for IERC20;
    using WadRayMath for uint256;

    address public vTRY;
    address public USDC;
    address public finder;
    uint256 public feePercentage = 10; // 100 is 1%; 10 is 0.1%
    uint256 public PERCENTAGE_BASED_POINT = 10000;

    //----------------------------------------
    // Modifiers
    //----------------------------------------

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdminRole();
        }
        _;
    }

    constructor(address _vTRY, address _USDC, address _finder) {
        finder = _finder;
        vTRY = _vTRY;
        USDC = _USDC;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function redeem(
        uint256 amount,
        address tokenOut,
        address reciepient,
        address[] memory paths
    ) external {
        IERC20(vTRY).safeTransferFrom(_msgSender(), address(this), amount);
        ERC20Burnable(vTRY).burn(amount);
        if (tokenOut == USDC) {
            uint amountInUSDC = calcVtryToUSD(amount);
            uint256 toTransfer = amountInUSDC - _calcFees(amountInUSDC);
            IERC20(USDC).transfer(reciepient, toTransfer);
        } else {
            uint amountInUSDC = calcVtryToUSD(amount);
            uint256 toTransfer = amountInUSDC - _calcFees(amountInUSDC);
            address oclrAddress = getOclrAddress();
            uint outTokenAmount = IOCLRouter(oclrAddress).getOutputAmount(
                USDC,
                tokenOut,
                toTransfer
            );

            IERC20(USDC).safeIncreaseAllowance(oclrAddress, toTransfer);

            IOCLRouter(oclrAddress).swapTokensForExactOut(
                USDC,
                tokenOut,
                outTokenAmount,
                reciepient,
                paths
            );
        }
    }

    function withdrawLiquidity(address to, uint256 amount) external onlyAdmin {
        IERC20(USDC).safeTransfer(to, amount);
    }

    function updateVTRY(address _vTRY) external onlyAdmin {
        vTRY = _vTRY;
    }

    function updateUSDC(address _USDC) external onlyAdmin {
        USDC = _USDC;
    }

    function _msgSender()
        internal
        view
        virtual
        override(ERC2771Context, Context)
        returns (address sender)
    {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return super._msgSender();
        }
    }

    function _msgData()
        internal
        view
        virtual
        override(ERC2771Context, Context)
        returns (bytes calldata)
    {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[0:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }

    /**
     * @notice Check if an address is the trusted forwarder
     * @param  _forwarder Address to check
     * @return True is the input address is the trusted forwarder, otherwise false
     */

    function isTrustedForwarder(
        address _forwarder
    ) public view override returns (bool) {
        try
            IFinder(finder).getImplementationAddress(
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

    function _calcFees(uint256 _amount) internal view returns (uint256) {
        return ((_amount * feePercentage) / PERCENTAGE_BASED_POINT);
    }

    function calcVtryToUSD(uint _vTryAmount) internal returns (uint) {
        uint vTRYRateChainLink = getTokenFromChainlink(vTRY);
        return _vTryAmount.wadMul(vTRYRateChainLink) / (10 ** 12);
    }

    // TODO: can be commoned inside OCLRRouter
    function getTokenFromChainlink(address _token) public returns (uint256) {
        // get price feed address
        address priceFeed = IFinder(finder).getImplementationAddress(
            ZeroXInterfaces.PRICE_FEED
        );

        address currencyFeedAddress = IPriceFeed(priceFeed).getCurrencyToFeed(
            _token
        );

        uint256 price = IPriceFeed(priceFeed).feedPriceChainlink(
            currencyFeedAddress
        );

        return price;
    }

    function getOclrAddress() public view returns (address) {
        return
            IFinder(finder).getImplementationAddress(ZeroXInterfaces.OCLROUTER);
    }
}
