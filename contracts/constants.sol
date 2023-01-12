// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.9;

// import {PropertyToken2} from "./propertyToken.sol";
// import {Identity} from "@onchain-id/solidity/contracts/Identity.sol";
// import {ImplementationAuthority} from "@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol";
// import {IdentityProxy} from "@onchain-id/solidity/contracts/proxy/IdentityProxy.sol";

/**
 * @title Stores common interface names used throughout 0xequity.
 */
library ZeroXInterfaces {
    bytes32 public constant RentShare = "rentShare";
    bytes32 public constant PriceFeed = "priceFeed";
    bytes32 public constant PropertyToken = "propertyToken";
    bytes32 public constant Identity = "identity";
    bytes32 public constant ImplementationAuthority = "implementationAuthority";
    bytes32 public constant IdentityProxy = "identityProxy";
    bytes32 public constant Maintainer = "Maintainer";
    bytes32 public constant Marketplace = "Marketplace";
}

// library ZeroXBtyeCodes {
//     bytes public constant PropertyToken = type(PropertyToken2).creationCode;
//     bytes public constant identity = type(Identity).creationCode;
//     bytes public constant implementationAuthority =
//         type(ImplementationAuthority).creationCode;
//     bytes public constant identityProxy = type(IdentityProxy).creationCode;
// }
