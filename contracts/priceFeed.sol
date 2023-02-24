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
contract PriceFeed is IPriceFeed {
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
        console.log("Before latestround data");
        (, int price, , , ) = AggregatorV3Interface(_of).latestRoundData();
        console.log("After latest round data");
        uint8 _decimals = AggregatorV3Interface(_of).decimals();
        console.log("After decimals");
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

// TODO : add access control
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
        string[] memory _properties
    ) external view returns (IPriceFeed.Property[] memory property) {
        property = new IPriceFeed.Property[](_properties.length);
        for (uint256 i; i < _properties.length; i++) {
            property[i] = storageParams.propertyDetails[_properties[i]];
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
