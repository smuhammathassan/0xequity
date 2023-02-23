// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.9;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./../Interface/IMarketplace.sol";
import "hardhat/console.sol";

interface IMPL {
    function getPropertyPrice(address from, address to)
        external
        returns (IPriceFeed.Property memory);
}

contract OCLRouter {
    using SafeERC20 for IERC20;

    function swapTokensForExactOut(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external returns (uint256) {
        require(tokenIn != tokenOut, "Same tokens");
        require(amountOut > 0, "Invalid amount");
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountOut);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        return amountOut;
        // console.log("This is after transfer", amountOut);
    }

    function buyProperty(
        address tokenIn, // usdc
        address tokenOut, // jTry
        address propertyToken, // property
        address marketplaceAddress,
        uint256 numberOfProperties
    ) external {
        console.log("Indside the swap tokens");
        require(tokenIn != tokenOut, "Same tokens");
        require(numberOfProperties > 0, "Invalid amount");

        IPriceFeed.Property memory _property = IMPL(marketplaceAddress)
            .getPropertyPrice(tokenOut, propertyToken);
        uint256 amountInBaseCurrecy = _property.price * numberOfProperties;

        uint256 tokensToTransferFromUser = getOutputAmount(
            tokenOut,
            tokenIn,
            amountInBaseCurrecy
        );
        IERC20(tokenIn).safeTransferFrom(
            msg.sender,
            address(this),
            tokensToTransferFromUser
        );
        IERC20(tokenOut).safeIncreaseAllowance(
            marketplaceAddress,
            amountInBaseCurrecy * 10
        );
        console.log("Test after apprive");
        IMarketplace.swapArgs memory swapArgs;
        swapArgs.from = tokenOut;
        swapArgs.to = propertyToken;
        swapArgs.amountOfShares = numberOfProperties;
        swapArgs.recipient = msg.sender;
        IMarketplace(marketplaceAddress).swap(swapArgs, false);
        // IERC20(propertyToken).transfer(msg.sender, numberOfProperties);
    }

    function sellProperty(
        address jTry,
        address tokenOut, // usdc
        address propertyToken, // property
        address marketplaceAddress,
        uint256 numberOfProperties
    ) external {
        console.log("Indside the swap tokens");
        console.log(numberOfProperties, "numberOfProperties");
        IERC20(propertyToken).safeTransferFrom(
            msg.sender,
            address(this),
            numberOfProperties
        );
        console.log("After the safe transferfrom");
        IERC20(propertyToken).safeIncreaseAllowance(
            marketplaceAddress,
            numberOfProperties
        );
        IMarketplace.swapArgs memory swapArgs;
        swapArgs.from = propertyToken;
        swapArgs.to = jTry;
        swapArgs.amountOfShares = numberOfProperties;
        uint256 tokenGotFromMp = IMarketplace(marketplaceAddress).swap(
            swapArgs,
            false
        ); // proeprty . jtry => usdc
        console.log(tokenGotFromMp, "tokenGotFromMp");
        IERC20(tokenOut).transfer(msg.sender, tokenGotFromMp / 2);
    }

    function getOutputAmount(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (uint256 amountOut) {
        console.log("Here in OCL Router");
        require(tokenIn != tokenOut, "Same token");
        return amountIn / 2;
    }
}
