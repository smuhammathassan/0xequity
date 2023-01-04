// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
error unSupportedCurrency();
error invalidBase();
error invalidCurrency();
error MustBeWholeNumber();
error invalidCase();

import "./Interface/AggregatorV3Interface.sol";
import "./Interface/IPriceFeed.sol";
import "hardhat/console.sol";

// This contract uses the library to set and retrieve state variables
contract priceFeed {
    //Wrapped Property => currency topropertyToPriceken address => price
    mapping(address => IPriceFeed.Property) propertyDetails;
    mapping(address => address) currencyToFeed;
    mapping(string => address) nameToFeed;

    function getLatestPrice(
        string calldata _pairName
    ) external view returns (uint256) {
        require(nameToFeed[_pairName] != address(0), "invalid Pair Name!");
        return uint256(_getLatestPrice(_pairName));
    }

    function getLatestPrices(
        string[] calldata _pairName
    ) external view returns (uint256[] memory prices) {
        prices = new uint256[](_pairName.length);
        for (uint256 i; i < _pairName.length; i++) {
            require(
                nameToFeed[_pairName[i]] != address(0),
                "invalid Pair Name!"
            );
            prices[i] = uint256(_getLatestPrice(_pairName[i]));
        }
    }

    function _getLatestPrice(
        string calldata _pairName
    ) internal view returns (int price) {
        (, price, , , ) = AggregatorV3Interface(nameToFeed[_pairName])
            .latestRoundData();
    }

    function getSharePriceInBaseCurrency(
        address _property,
        address currency
    ) external view returns (uint256) {
        if (!(propertyDetails[_property].curreny == currency)) {
            revert invalidBase();
        }
        return propertyDetails[_property].price;
    }

    function setPropertyDetails(
        address _property,
        IPriceFeed.Property calldata _propertyDetails
    ) external {
        propertyDetails[_property] = _propertyDetails;
    }

    function getPropertyDetails(
        address _property
    ) external view returns (IPriceFeed.Property memory property) {
        return propertyDetails[_property];
    }

    function setCurrencyToFeed(
        string calldata _pairName,
        address _currency,
        address _feed
    ) external {
        currencyToFeed[_currency] = _feed;
        nameToFeed[_pairName] = _feed;
    }

    function getCurrencyToFeed(
        address _currency
    ) external view returns (address) {
        return currencyToFeed[_currency];
    }

    //if he just want the amount out in base currency
    //if he want amount out in another currency.

    // function fetchPrice(
    //     address _property,
    //     address _currencyPriceFeed,
    //     uint256 _amount
    // ) external view returns (uint256) {
    //     address _from = propertyDetails[_property].curreny;
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
        address _base,
        address _quote,
        uint8 _decimals
    ) public view returns (int256) {
        require(
            _decimals > uint8(0) && _decimals <= uint8(18),
            "Invalid _decimals"
        );
        int256 decimals = int256(10 ** uint256(_decimals));
        (, int256 basePrice, , , ) = AggregatorV3Interface(_base)
            .latestRoundData();
        uint8 baseDecimals = AggregatorV3Interface(_base).decimals();
        basePrice = scalePrice(basePrice, baseDecimals, _decimals);

        (, int256 quotePrice, , , ) = AggregatorV3Interface(_quote)
            .latestRoundData();
        console.log("QuotePrice => ", uint256(quotePrice));
        uint8 quoteDecimals = AggregatorV3Interface(_quote).decimals();
        quotePrice = scalePrice(quotePrice, quoteDecimals, _decimals);
        console.log("Just before division");
        console.log("BasePrice => ", uint256(basePrice));
        console.log("Deciamls => ", uint256(decimals));
        console.log("QuotePrice => ", uint256(quotePrice));
        return (basePrice * decimals) / quotePrice;
    }

    function scalePrice(
        int256 _price,
        uint8 _priceDecimals,
        uint8 _decimals
    ) internal pure returns (int256) {
        if (_priceDecimals < _decimals) {
            return _price * int256(10 ** uint256(_decimals - _priceDecimals));
        } else if (_priceDecimals > _decimals) {
            return _price / int256(10 ** uint256(_priceDecimals - _decimals));
        }
        return _price;
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
