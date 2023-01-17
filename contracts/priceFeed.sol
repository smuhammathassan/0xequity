// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
error unSupportedCurrency();
error invalidBase();
error invalidCurrency();
error MustBeWholeNumber();
error invalidCase();
import {PriceFeedLib} from "./libraries/PricefeedLib.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./Interface/AggregatorV3Interface.sol";
import "./Interface/IPriceFeed.sol";
import "hardhat/console.sol";

// This contract uses the library to set and retrieve state variables
contract priceFeed is IPriceFeed {
    using PriceFeedLib for Storage;

    Storage internal storageParams;

    //Wrapped Property => currency topropertyToPriceken address => price
    // mapping(address => IPriceFeed.Property) propertyDetails;
    // mapping(address => address) currencyToFeed;
    // mapping(string => address) nameToFeed;

    function getLatestPrice(
        string calldata _pairName
    ) external view returns (uint256) {
        require(
            storageParams.nameToFeed[_pairName] != address(0),
            "invalid Pair Name!"
        );
        return uint256(_getLatestPrice(_pairName));
    }

    function getLatestPrices(
        string[] calldata _pairName
    ) external view returns (uint256[] memory prices) {
        prices = new uint256[](_pairName.length);
        for (uint256 i; i < _pairName.length; i++) {
            require(
                storageParams.nameToFeed[_pairName[i]] != address(0),
                "invalid Pair Name!"
            );
            prices[i] = _getLatestPrice(_pairName[i]);
        }
    }

    function _getLatestPrice(
        string calldata _pairName
    ) internal view returns (uint256 latestPrice) {
        (, int price, , , ) = AggregatorV3Interface(
            storageParams.nameToFeed[_pairName]
        ).latestRoundData();
        uint8 _decimals = AggregatorV3Interface(
            storageParams.nameToFeed[_pairName]
        ).decimals();
        latestPrice = _getScaledValue(price, _decimals);
    }

    function feedPriceChainlink(
        address _of
    ) external view returns (uint256 latestPrice) {
        (, int price, , , ) = AggregatorV3Interface(_of).latestRoundData();
        uint8 _decimals = AggregatorV3Interface(_of).decimals();
        console.log("** price feed = %d ", uint(price));
        console.log("** decimals feed = %d ", _decimals);
        latestPrice = _getScaledValue(price, _decimals);
    }

    function _getScaledValue(
        int256 _unscaledPrice,
        uint8 _decimals
    ) internal pure returns (uint256 price) {
        price = uint256(_unscaledPrice) * (10 ** (18 - _decimals));
    }

    function getSharePriceInBaseCurrency(
        string memory _propertySymbol,
        address currency
    ) external view returns (uint256) {
        if (
            !(storageParams.propertyDetails[_propertySymbol].currency ==
                currency)
        ) {
            revert invalidBase();
        }
        return storageParams.propertyDetails[_propertySymbol].price;
    }

    function setPropertyDetails(
        string memory _propertySymbol,
        IPriceFeed.Property calldata _propertyDetails
    ) external {
        storageParams.propertyDetails[_propertySymbol] = _propertyDetails;
    }

    function getPropertyDetail(
        string memory _propertySymbol
    ) external view returns (IPriceFeed.Property memory property) {
        return storageParams.propertyDetails[_propertySymbol];
    }

    function getPropertyDetails(
        address[] calldata _properties
    ) external view returns (IPriceFeed.Property[] memory property) {
        property = new IPriceFeed.Property[](_properties.length);
        for (uint256 i; i < _properties.length; i++) {
            property[i] = storageParams.propertyDetails[
                IERC20Metadata(_properties[i]).symbol()
            ];
        }
    }

    function setCurrencyToFeed(
        string calldata _pairName,
        address _currency,
        address _feed
    ) external {
        storageParams.currencyToFeed[_currency] = _feed;
        storageParams.nameToFeed[_pairName] = _feed;
    }

    function getCurrencyToFeed(
        address _currency
    ) external view returns (address) {
        return storageParams.currencyToFeed[_currency];
    }

    //if he just want the amount out in base currency
    //if he want amount out in another currency.

    // function fetchPrice(
    //     address _property,
    //     address _currencyPriceFeed,
    //     uint256 _amount
    // ) external view returns (uint256) {
    //     address _from = propertyDetails[_property].currency;
    //     uint256 _totalPriceInUSD = _amount * propertyDetails[_property].price;

    //     uint256 fromDecimals = AggregatorV3Interface(_from).decimals();
    //     uint256 toDecimals = AggregatorV3Interface(_currencyPriceFeed)
    //         .decimals();
    //     (, int feedPrice, , , ) = AggregatorV3Interface(_currencyPriceFeed)
    //         .latestRoundData();

    //     if (fromDecimals > toDecimals) {
    //         return _totalPriceInUSD / uint256(feedPrice);
    //     } else {
    //         return (_totalPriceInUSD * (10 ** toDecimals)) / uint256(feedPrice);
    //     }
    // }
    //2 * 10 ** 8 / 2
    //mapping(address => bool) propertyExist;
    //try/usd, euro/usd
    //euro/try

    function getDerivedPrice(
        IPriceFeed.DerivedPriceParams memory _params
    ) public view returns (int256) {
        return PriceFeedLib.getDerivedPrice(_params);
    }

    function scalePrice(
        ScalePriceParams memory _params
    ) internal pure returns (int256) {
        return PriceFeedLib.scalePrice(_params);
    }
}

// if (fromDecimals == toDecimals) {} else if (fromDecimals > toDecimals) {
//     // uint256 adjustedPrice = _totalPriceInUSD /
//     //     (10 ** (fromDecimals - toDecimals));
//     return _totalPriceInUSD / uint256(amount);
// } else if (fromDecimals < toDecimals) {
//     uint256 adjustedPrice = _totalPriceInUSD *
//         (10 ** (toDecimals - fromDecimals));
//     return (adjustedPrice / uint256(amount));
// }

// function swap(address _from, address _to, uint256 _amountIn) external {
//     if (_amountIn % 1 != 0) {
//         revert MustBeWholeNumber();
//     }
//     //buy
//     if (propertyExist[_to]) {
//         _swap(_from, _to, _amountIn);
//     } else if (propertyExist[_from]) {
//         if (!(currencyToFeed[_to] == address(0))) {
//             revert invalidCurrency();
//         }
//         _swap(_to, _from, _amountIn);
//     } else {
//         revert invalidCase();
//     }
// }

// function _swap(address _from, address _to, uint256 _amountIn) internal {
//     if (!(currencyToFeed[_from] == address(0))) {
//         revert invalidCurrency();
//     }
//     if (propertyDetails[_to].priceFeed == currencyToFeed[_from]) {
//         uint256 quotePrice = _amountIn * propertyDetails[_to].price;
//         IERC20(_to).safeTransferFrom(msg.sender, address(this), quotePrice);
//         IERC20(_from).safeTransfer(msg.sender, _amountIn);
//     } else {
//         uint8 _fromDecimals = AggregatorV3Interface(_from).decimals();
//         uint256 price = uint256(
//             getDerivedPrice(
//                 propertyDetails[_to].priceFeed,
//                 currencyToFeed[_from],
//                 _fromDecimals
//             )
//         );
//         uint256 quotePrice = ((_amountIn * _fromDecimals) / price) /
//             _fromDecimals;
//         IERC20(_to).safeTransferFrom(msg.sender, address(this), quotePrice);
//         IERC20(_from).safeTransfer(msg.sender, _amountIn);
//     }
// }
