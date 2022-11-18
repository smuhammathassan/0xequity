// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface IFactory {
    function addNewProperty() external returns (bool);

    function removeProperty() external returns (bool);
}
