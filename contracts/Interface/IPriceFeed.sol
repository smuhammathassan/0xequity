// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPriceFeed {
    struct Property {
        uint256 price;
        address curreny;
        address priceFeed;
    }

    // function fetchBuyPrice(
    //     address _property,
    //     address _currencyPriceFeed,
    //     uint256 _amount
    // ) external view returns (uint256);

    function getDerivedPrice(
        address _base,
        address _quote,
        uint8 _decimals
    ) external view returns (int256);

    function getSharePriceInBaseCurrency(
        address _property,
        address currency
    ) external view returns (uint256);

    //---------------------------------------------------------------------
    function setPropertyDetails(
        address _property,
        Property calldata _propertyDetails
    ) external;

    function getPropertyDetail(
        address _property
    ) external view returns (Property memory property);

    //---------------------------------------------------------------------

    function setCurrencyToFeed(address _currency, address _feed) external;

    function getCurrencyToFeed(
        address _currency
    ) external view returns (address);
    //---------------------------------------------------------------------
}
