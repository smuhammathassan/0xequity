//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControlEnumerable, Context} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract RentDistributor is AccessControlEnumerable {
    using SafeERC20 for IERC20;

    address vTRY;
    address jTRY;

    constructor(address _vTRY, address _jTRY) {
        vTRY = _vTRY;
        jTRY = _jTRY;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function redeem(uint256 amount) external {
        IERC20(vTRY).safeTransferFrom(_msgSender(), address(this), amount);
        ERC20Burnable(vTRY).burn(amount);
        IERC20(jTRY).transfer(_msgSender(), amount);
    }
}
