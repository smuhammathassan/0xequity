// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
error unSupportedCurrency();
error invalidBase();
error invalidCurrency();
error MustBeWholeNumber();
error invalidCase();

import "../Interface/AggregatorV3Interface.sol";
import "../Interface/IPriceFeed.sol";
import "hardhat/console.sol";

// This contract uses the library to set and retrieve state variables
library PriceFeedLib {
    function getDerivedPrice(
        IPriceFeed.DerivedPriceParams memory _params
    ) external view returns (int256) {
        require(
            _params.decimals > uint8(0) && _params.decimals <= uint8(18),
            "Invalid _decimals"
        );
        int256 decimals = int256(10 ** uint256(_params.decimals));
        (, int256 basePrice, , , ) = AggregatorV3Interface(_params.base)
            .latestRoundData();
        uint8 baseDecimals = AggregatorV3Interface(_params.base).decimals();
        basePrice = scalePrice(
            IPriceFeed.ScalePriceParams(
                basePrice,
                baseDecimals,
                _params.decimals
            )
        );

        (, int256 quotePrice, , , ) = AggregatorV3Interface(_params.quote)
            .latestRoundData();
        console.log("QuotePrice => ", uint256(quotePrice));
        uint8 quoteDecimals = AggregatorV3Interface(_params.quote).decimals();
        quotePrice = scalePrice(
            IPriceFeed.ScalePriceParams(
                quotePrice,
                quoteDecimals,
                _params.decimals
            )
        );
        console.log("Just before division");
        console.log("BasePrice => ", uint256(basePrice));
        console.log("Deciamls => ", uint256(decimals));
        console.log("QuotePrice => ", uint256(quotePrice));
        return (basePrice * decimals) / quotePrice;
    }

    function scalePrice(
        IPriceFeed.ScalePriceParams memory _params
    ) public pure returns (int256) {
        if (_params.priceDecimals < _params.decimals) {
            return
                _params.price *
                int256(10 ** uint256(_params.decimals - _params.priceDecimals));
        } else if (_params.priceDecimals > _params.decimals) {
            return
                _params.price /
                int256(10 ** uint256(_params.priceDecimals - _params.decimals));
        }
        return _params.price;
    }
}
