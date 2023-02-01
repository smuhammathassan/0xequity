//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

import {ERC2771Context} from "./ERC2771Context.sol";
import {SelfPermit} from "./SelfPermit.sol";
import {TrustedForwarder} from "./TrustedForwarder.sol";
import {IFinder} from "./Interface/IFinder.sol";
import {ZeroXInterfaces} from "./constants.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControlEnumerable, Context} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";

error OnlyAdminRole();

contract RentDistributor is
    AccessControlEnumerable,
    ERC2771Context,
    SelfPermit,
    Multicall,
    TrustedForwarder
{
    using SafeERC20 for IERC20;

    address vTRY;
    address jTRY;
    address finder;

    //----------------------------------------
    // Modifiers
    //----------------------------------------

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdminRole();
        }
        _;
    }

    constructor(address _vTRY, address _jTRY, address _finder) {
        finder = _finder;
        vTRY = _vTRY;
        jTRY = _jTRY;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function redeem(uint256 amount) external {
        IERC20(vTRY).safeTransferFrom(_msgSender(), address(this), amount);
        ERC20Burnable(vTRY).burn(amount);
        IERC20(jTRY).transfer(_msgSender(), amount);
    }

    function withdrawLiquidity(address to, uint256 amount) external onlyAdmin {
        IERC20(jTRY).safeTransfer(to, amount);
    }

    function updateVTRY(address _vTRY) external onlyAdmin {
        vTRY = _vTRY;
    }

    function updateJTRY(address _jTRY) external onlyAdmin {
        jTRY = _jTRY;
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
}
