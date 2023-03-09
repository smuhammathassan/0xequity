// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.9;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./../Interface/IMarketplace.sol";
import "./../Interface/IPriceFeed.sol";
import "./../Interface/ISwapController.sol";
import "./../Interface/IFinder.sol";
import {ZeroXInterfaces} from "../constants.sol";
import {WadRayMath} from "./../libraries/WadRayMath.sol";

import "hardhat/console.sol";

interface IMPL {
    function getPropertyPrice(
        address from,
        address to
    ) external returns (IPriceFeed.Property memory);
}

interface IERC20Metadata {
    function decimals() external view returns (uint8);
}

contract OCLRouter {
    using SafeERC20 for IERC20;
    using WadRayMath for uint256;

    address public finder;
    address public swapController;
    address public owner;

    constructor(address _finder, address _swapController) {
        finder = _finder;
        owner = msg.sender;
        swapController = _swapController;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller not owner");
        _;
    }

    function swapTokensForExactOut(
        address tokenIn, // usdc
        address tokenOut, // jtry
        uint256 amountOut, // itny jtry chye
        address reciepient,
        address[] memory paths // 0 index is CTRY , 1 index is customVault of TRY, 2 Vault Router of USDC
    ) external returns (uint256) {
        require(tokenIn != tokenOut, "Same tokens");
        require(amountOut > 0, "Invalid amount");
        console.log("Before chainlinkPriceFeed");
        uint8 tokenInDecimal = IERC20Metadata(tokenIn).decimals();
        uint8 tokenOutDecimals = IERC20Metadata(tokenOut).decimals();
        uint256 priceFromChainLink;
        if (tokenOutDecimals == 18) {
            priceFromChainLink = getTokenOutPriceFromChainlink(tokenOut);
        } else {
            priceFromChainLink = getTokenOutPriceFromChainlink(tokenIn);
        }
        // }
        console.log(priceFromChainLink, "priceFromChainLink");
        uint256 amountInUSD;
        if (tokenOutDecimals == 18) {
            // TODO: make it dymanic according to tokens with decimals other than 18
            amountInUSD = (amountOut.wadToRay())
                .rayMul(priceFromChainLink.wadToRay())
                .rayDiv(WadRayMath.RAY);
            console.log(
                amountInUSD,
                "###########################################################"
            );
        } else {
            console.log(amountOut * ((10 ** (18 - 6))), "amountttt");
            console.log(
                (amountOut * (1e12)).wadToRay(),
                "amountOut * (1e12)).wadToRay()"
            );
            console.log(
                priceFromChainLink.wadToRay(),
                "priceFromChainLink.wadToRay()"
            );
            amountInUSD = (amountOut * (10 ** (18 - tokenOutDecimals))).wadDiv(
                priceFromChainLink
            );
            // (((amountOut * (1e21))) / ((priceFromChainLink * (1e9)))) *
            // (1e18);
            // .rayMul(WadRayMath.RAY);

            // .rayMul(WadRayMath.RAY);
            // (amountOut.wadToRay()).rayMul(priceFromChainLink.wadToRay()).rayDiv(
            //         WadRayMath.RAY
            //     );
            console.log(
                amountInUSD,
                "#####else wali######################################################"
            );
        }

        uint256 amountToTransferFromUser;
        if (tokenOutDecimals == 18) {
            amountToTransferFromUser =
                ((amountInUSD.rayToWad().wadDiv(WadRayMath.WAD))) /
                (10 ** (18 - tokenInDecimal));
        } else {
            amountToTransferFromUser = amountInUSD;
            //     amountInUSD.rayToWad() *
            //     (10**(18 - tokenOutDecimals));
            // // ((amountInUSD.rayToWad().wadDiv(WadRayMath.WAD))) /
            // // (10**(18 - tokenOutDecimals));
            // console.log(
            //     amountToTransferFromUser,
            //     "amountToTransferFromUser inside else"
            // );
        }

        console.log(
            amountToTransferFromUser,
            "amountToTransferFromUser IN USD*************************************"
        );

        if (msg.sender != address(this)) {
            console.log("i should not come here");
            IERC20(tokenIn).safeTransferFrom(
                msg.sender,
                address(this),
                amountToTransferFromUser
            );
        }

        console.log("After safetransfer from");

        IERC20(tokenIn).approve(swapController, amountToTransferFromUser);
        console.log("After apprive from");

        console.log("reciepient", reciepient);

        ISwapController(swapController).swapTokens(
            reciepient,
            amountToTransferFromUser, // amount in
            tokenIn,
            tokenOut,
            amountOut,
            paths
        );
        // IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        return amountOut;
        // console.log("This is after transfer", amountOut);
    }

    // function buyProperty(
    //     address tokenIn, // usdc
    //     address tokenOut, // jTry
    //     address propertyToken, // property
    //     address marketplaceAddress,
    //     uint256 numberOfProperties
    // ) external {
    //     console.log("Indside the swap tokens");
    //     require(tokenIn != tokenOut, "Same tokens");
    //     require(numberOfProperties > 0, "Invalid amount");

    //     IPriceFeed.Property memory _property = IMPL(marketplaceAddress)
    //         .getPropertyPrice(tokenOut, propertyToken);
    //     uint256 amountInBaseCurrecy = _property.price * numberOfProperties;
    //     address[] memory empty;
    //     // TODO : this should be uncommented/updated because it broke the swap
    //     swapTokensForExactOut(
    //         tokenIn,
    //         tokenOut,
    //         amountInBaseCurrecy,
    //         address(this),
    //         empty
    //     );

    //     // uint256 tokensToTransferFromUser = getOutputAmount(
    //     //     tokenOut,
    //     //     tokenIn,
    //     //     amountInBaseCurrecy
    //     // );
    //     // IERC20(tokenIn).safeTransferFrom(
    //     //     msg.sender,
    //     //     address(this),
    //     //     tokensToTransferFromUser
    //     // );
    //     IERC20(tokenOut).safeIncreaseAllowance(
    //         marketplaceAddress,
    //         amountInBaseCurrecy * 10
    //     );
    //     console.log("Test after apprive");
    //     IMarketplace.swapArgs memory swapArgs;
    //     swapArgs.from = tokenOut;
    //     swapArgs.to = propertyToken;
    //     swapArgs.amountOfShares = numberOfProperties;
    //     swapArgs.recipient = msg.sender;
    //     IMarketplace(marketplaceAddress).swap(swapArgs, false);
    //     // IERC20(propertyToken).transfer(msg.sender, numberOfProperties);
    // }

    function sellProperty(
        address jTry,
        address tokenOut, // usdc
        address propertyToken, // property
        address marketplaceAddress,
        uint256 numberOfProperties,
        address reciepient,
        address[] memory paths
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
        uint outputAmount = getOutputAmount(jTry, tokenOut, tokenGotFromMp);

        this.swapTokensForExactOut(
            jTry,
            tokenOut,
            outputAmount,
            reciepient,
            paths
        );
        // IERC20(tokenOut).transfer(msg.sender, outputAmount);
    }

    function getOutputAmount(
        address tokenIn, // jtry
        address tokenOut, // usdc
        uint256 amountIn // 500
    ) public returns (uint256 amountOut) {
        uint8 tokenInDecimal = IERC20Metadata(tokenIn).decimals();
        uint8 tokenOutDecimals = IERC20Metadata(tokenOut).decimals();
        if (tokenInDecimal == 18) {
            uint tokenInPrice = getTokenOutPriceFromChainlink(tokenIn);
            console.log(
                (amountIn.wadMul(tokenInPrice)) /
                    (10 ** (18 - tokenOutDecimals)),
                "IN IF"
            );
            return
                (amountIn.wadMul(tokenInPrice)) /
                (10 ** (18 - tokenOutDecimals));
        } else {
            uint tokenOutPrice = getTokenOutPriceFromChainlink(tokenOut);
            console.log(tokenOutPrice, "Token out price");
            console.log(amountIn, "amountIn");
            console.log(
                (
                    (amountIn * (10 ** (18 - tokenInDecimal))).wadDiv(
                        tokenOutPrice
                    )
                ),
                "In else"
            );
            return (
                (amountIn * (10 ** (18 - tokenInDecimal))).wadDiv(tokenOutPrice)
            ); //(tokenBPrice.wadToRay().rayDiv(tokenAPrice.wadToRay()))).rayToWad();
        }
        // tokenInPriceFromChainLink = 0.5
        // tokenOtuPriceFromChainLink = 2
    }

    function updateFinder(address _newFinder) external onlyOwner {
        finder = _newFinder;
    }

    function updateSwapController(address _newController) external onlyOwner {
        swapController = _newController;
    }

    function updateOwner(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }

    function getTokenOutPriceFromChainlink(
        address _token
    ) internal returns (uint256) {
        console.log("inside getTokenOutPriceFromChainlink");

        // get price feed address
        address priceFeed = IFinder(finder).getImplementationAddress(
            ZeroXInterfaces.PRICE_FEED
        );
        console.log("inside getTokenOutPriceFromChainlink 2", priceFeed);

        address currencyFeedAddress = IPriceFeed(priceFeed).getCurrencyToFeed(
            _token
        );
        console.log(
            "inside getTokenOutPriceFromChainlink 3",
            currencyFeedAddress
        );

        uint256 price = IPriceFeed(priceFeed).feedPriceChainlink(
            currencyFeedAddress
        );
        console.log("inside getTokenOutPriceFromChainlink 4");

        return price;
    }
}
