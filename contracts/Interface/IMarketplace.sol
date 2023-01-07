// SPDX-License-Identifier: Unlicense

error notEoughLiquidity();
error invalidToken();
error OnlyAdminRole();
error PropertyAlreadyExist();
error ZeroAddress();
error MustBeGreaterThanZero();
error totalMustBeGreaterThanToLock();
error PropertyDoesNotExist();
error ExceedTotalLegalShares();
error MustBeWholeNumber();
error MissMatch();
error MustBeGreaterThenAmount();
error EmptyBytecode();
error invalidCurrency();
error invalidCase();
error zeroBalance();

pragma solidity ^0.8.9;

/// @dev interface
interface IMarketplace {
    event newERC3643(address legaltoken);
    event newPropertyAdded(address legalToken, address WLegalToken);
    event priceUpdated(address token, uint256 price);
    event newIdentity(address Identity);
    event swaped(address from, address to, uint256 amountIn, uint256 amountOut);
    event newBid(
        address token,
        address bidder,
        uint256 amount,
        uint256 amountPerToken
    );
    event newAsk(
        address token,
        address offerer,
        uint256 amount,
        uint256 amountPerToken
    );
    struct property {
        address WLegalShares;
        uint256 totalLegalShares;
        uint256 lockedLegalShares;
        uint256 tokensPerLegalShares;
    }
    struct offer {
        uint256 amount;
        uint256 amountPerToken;
    }
    struct swapArgs {
        address _from;
        address _to;
        uint256 _amountOfShares;
    }
}
