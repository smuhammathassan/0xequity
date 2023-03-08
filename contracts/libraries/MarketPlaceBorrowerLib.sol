// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "../Interface/IMarketPlaceBorrower.sol";
import "./../XEQ/interfaces/IERC4626StakingPool.sol";
error ZeroAddress();
error InvalidAmount();
error InvalidMarketplaceCaller();

interface IERC20Interface {
    function approve(address spender, uint256 amount) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);
}

// This contract uses the library to set and retrieve state variables
library MarketPlaceBorrowerLib {
    function initialize(
        IMarketPlaceBorrower.Storage storage _storageParams,
        address _poolToBorrowFrom
    ) internal {
        zeroAddrCheck(_poolToBorrowFrom);
        _storageParams.poolToBorrowFrom = _poolToBorrowFrom;
    }

    function _setMarketPlace(
        IMarketPlaceBorrower.Storage storage _storageParams,
        address _marketPlace
    ) internal {
        zeroAddrCheck(_marketPlace);
        _storageParams.allowedMarketPlace = _marketPlace;
    }

    function _setCustomVault(
        IMarketPlaceBorrower.Storage storage _storageParams,
        address _vault
    ) internal {
        zeroAddrCheck(_vault);
        _storageParams.customVault = _vault;
    }

    function _borrowTokensFromPool(
        IMarketPlaceBorrower.Storage storage _storageParams,
        uint256 _amount
    ) internal returns (uint256 actualBorrowAmount) {
        if (_amount == 0) {
            revert InvalidAmount();
        }

        if (msg.sender != _storageParams.allowedMarketPlace) {
            revert InvalidMarketplaceCaller();
        }

        actualBorrowAmount = IERC4626StakingPool(
            _storageParams.poolToBorrowFrom
        ).borrow(_storageParams.allowedMarketPlace, _amount);

        // TODO: to take x Tokens and then send to cusstom vault and then convert
        address stakeToken = IERC4626StakingPool(_storageParams.customVault)
            .stakeToken();
        address xToken = IERC4626StakingPool(_storageParams.customVault)
            .xToken();
        IERC20Interface(xToken).approve(
            _storageParams.customVault,
            actualBorrowAmount
        );
        uint256 noOfToken = IERC4626StakingPool(_storageParams.customVault)
            .withdraw(actualBorrowAmount, address(this), address(this));

        IERC20Interface(stakeToken).transfer(msg.sender, noOfToken);
    }

    function _buyPropertyTokensForMP(
        IMarketPlaceBorrower.Storage storage _storageParams,
        address _propertyToken,
        uint256 _amountOfTokens
    ) internal {
        // TODO: can be made single internal function of above and this one for these checks
        if (_amountOfTokens == 0) {
            revert InvalidAmount();
        }

        if (msg.sender != _storageParams.allowedMarketPlace) {
            revert InvalidMarketplaceCaller();
        }

        IERC4626StakingPool(_storageParams.poolToBorrowFrom).buyPropertyTokens(
            _propertyToken,
            _amountOfTokens,
            _storageParams.allowedMarketPlace
        );
    }

    function _afterRepay(
        IMarketPlaceBorrower.Storage storage _storageParams,
        uint256 _remaining
    ) internal {
        IERC4626StakingPool(_storageParams.poolToBorrowFrom).afterRepay(
            _remaining,
            _storageParams.allowedMarketPlace
        );
    }

    function _updatePoolToBorrowFromAddress(
        IMarketPlaceBorrower.Storage storage _storageParams,
        address _addr
    ) internal {
        zeroAddrCheck(_addr);
        _storageParams.poolToBorrowFrom = _addr;
    }

    function zeroAddrCheck(address _addr) internal pure {
        if (_addr == address(0x00)) {
            revert ZeroAddress();
        }
    }
}
