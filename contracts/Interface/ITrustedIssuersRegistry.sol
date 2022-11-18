// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./IClaimIssuer.sol";

interface ITrustedIssuersRegistry {
    // events
    event TrustedIssuerAdded(
        IClaimIssuer indexed trustedIssuer,
        uint[] claimTopics
    );
    event TrustedIssuerRemoved(IClaimIssuer indexed trustedIssuer);
    event ClaimTopicsUpdated(
        IClaimIssuer indexed trustedIssuer,
        uint[] claimTopics
    );

    // functions
    // setters
    function addTrustedIssuer(
        IClaimIssuer _trustedIssuer,
        uint[] calldata _claimTopics
    ) external;

    function removeTrustedIssuer(IClaimIssuer _trustedIssuer) external;

    function updateIssuerClaimTopics(
        IClaimIssuer _trustedIssuer,
        uint[] calldata _claimTopics
    ) external;

    // getters
    function getTrustedIssuers() external view returns (IClaimIssuer[] memory);

    function isTrustedIssuer(address _issuer) external view returns (bool);

    function getTrustedIssuerClaimTopics(IClaimIssuer _trustedIssuer)
        external
        view
        returns (uint[] memory);

    function hasClaimTopic(address _issuer, uint _claimTopic)
        external
        view
        returns (bool);

    // role setter
    function transferOwnershipOnIssuersRegistryContract(address _newOwner)
        external;
}
