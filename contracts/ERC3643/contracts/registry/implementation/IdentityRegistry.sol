// SPDX-License-Identifier: GPL-3.0
//
//                                             :+#####%%%%%%%%%%%%%%+
//                                         .-*@@@%+.:+%@@@@@%%#***%@@%=
//                                     :=*%@@@#=.      :#@@%       *@@@%=
//                       .-+*%@%*-.:+%@@@@@@+.     -*+:  .=#.       :%@@@%-
//                   :=*@@@@%%@@@@@@@@@%@@@-   .=#@@@%@%=             =@@@@#.
//             -=+#%@@%#*=:.  :%@@@@%.   -*@@#*@@@@@@@#=:-              *@@@@+
//            =@@%=:.     :=:   *@@@@@%#-   =%*%@@@@#+-.        =+       :%@@@%-
//           -@@%.     .+@@@     =+=-.         @@#-           +@@@%-       =@@@@%:
//          :@@@.    .+@@#%:                   :    .=*=-::.-%@@@+*@@=       +@@@@#.
//          %@@:    +@%%*                         =%@@@@@@@@@@@#.  .*@%-       +@@@@*.
//         #@@=                                .+@@@@%:=*@@@@@-      :%@%:      .*@@@@+
//        *@@*                                +@@@#-@@%-:%@@*          +@@#.      :%@@@@-
//       -@@%           .:-=++*##%%%@@@@@@@@@@@@*. :@+.@@@%:            .#@@+       =@@@@#:
//      .@@@*-+*#%%%@@@@@@@@@@@@@@@@%%#**@@%@@@.   *@=*@@#                :#@%=      .#@@@@#-
//      -%@@@@@@@@@@@@@@@*+==-:-@@@=    *@# .#@*-=*@@@@%=                 -%@@@*       =@@@@@%-
//         -+%@@@#.   %@%%=   -@@:+@: -@@*    *@@*-::                   -%@@%=.         .*@@@@@#
//            *@@@*  +@* *@@##@@-  #@*@@+    -@@=          .         :+@@@#:           .-+@@@%+-
//             +@@@%*@@:..=@@@@*   .@@@*   .#@#.       .=+-       .=%@@@*.         :+#@@@@*=:
//              =@@@@%@@@@@@@@@@@@@@@@@@@@@@%-      :+#*.       :*@@@%=.       .=#@@@@%+:
//               .%@@=                 .....    .=#@@+.       .#@@@*:       -*%@@@@%+.
//                 +@@#+===---:::...         .=%@@*-         +@@@+.      -*@@@@@%+.
//                  -@@@@@@@@@@@@@@@@@@@@@@%@@@@=          -@@@+      -#@@@@@#=.
//                    ..:::---===+++***###%%%@@@#-       .#@@+     -*@@@@@#=.
//                                           @@@@@@+.   +@@*.   .+@@@@@%=.
//                                          -@@@@@=   =@@%:   -#@@@@%+.
//                                          +@@@@@. =@@@=  .+@@@@@*:
//                                          #@@@@#:%@@#. :*@@@@#-
//                                          @@@@@%@@@= :#@@@@+.
//                                         :@@@@@@@#.:#@@@%-
//                                         +@@@@@@-.*@@@*:
//                                         #@@@@#.=@@@+.
//                                         @@@@+-%@%=
//                                        :@@@#%@%=
//                                        +@@@@%-
//                                        :#%%=
//
/**
 *     NOTICE
 *
 *     The T-REX software is licensed under a proprietary license or the GPL v.3.
 *     If you choose to receive it under the GPL v.3 license, the following applies:
 *     T-REX is a suite of smart contracts developed by Tokeny to manage and transfer financial assets on the ethereum blockchain
 *
 *     Copyright (C) 2022, Tokeny sàrl.
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

pragma solidity ^0.8.0;

import "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";
import "@onchain-id/solidity/contracts/interface/IIdentity.sol";

import "../interface/IClaimTopicsRegistry.sol";
import "../interface/ITrustedIssuersRegistry.sol";
import "../interface/IIdentityRegistry.sol";
import "../../roles/AgentRoleUpgradeable.sol";
import "../interface/IIdentityRegistryStorage.sol";
import "../storage/IRStorage.sol";
import "hardhat/console.sol";

contract IdentityRegistry is
    IIdentityRegistry,
    AgentRoleUpgradeable,
    IRStorage
{
    /**
     *  @dev the constructor initiates the Identity Registry smart contract
     *  @param _trustedIssuersRegistry the trusted issuers registry linked to the Identity Registry
     *  @param _claimTopicsRegistry the claim topics registry linked to the Identity Registry
     *  @param _identityStorage the identity registry storage linked to the Identity Registry
     *  emits a `ClaimTopicsRegistrySet` event
     *  emits a `TrustedIssuersRegistrySet` event
     *  emits an `IdentityStorageSet` event
     */
    function init(
        address _trustedIssuersRegistry,
        address _claimTopicsRegistry,
        address _identityStorage
    ) public initializer {
        tokenTopicsRegistry = IClaimTopicsRegistry(_claimTopicsRegistry);
        tokenIssuersRegistry = ITrustedIssuersRegistry(_trustedIssuersRegistry);
        tokenIdentityStorage = IIdentityRegistryStorage(_identityStorage);
        emit ClaimTopicsRegistrySet(_claimTopicsRegistry);
        emit TrustedIssuersRegistrySet(_trustedIssuersRegistry);
        emit IdentityStorageSet(_identityStorage);
        __Ownable_init();
    }

    /**
     *  @dev See {IIdentityRegistry-identity}.
     */
    function identity(
        address _userAddress
    ) public view override returns (IIdentity) {
        return tokenIdentityStorage.storedIdentity(_userAddress);
    }

    /**
     *  @dev See {IIdentityRegistry-investorCountry}.
     */
    function investorCountry(
        address _userAddress
    ) external view override returns (uint16) {
        return tokenIdentityStorage.storedInvestorCountry(_userAddress);
    }

    /**
     *  @dev See {IIdentityRegistry-issuersRegistry}.
     */
    function issuersRegistry()
        external
        view
        override
        returns (ITrustedIssuersRegistry)
    {
        return tokenIssuersRegistry;
    }

    /**
     *  @dev See {IIdentityRegistry-topicsRegistry}.
     */
    function topicsRegistry()
        external
        view
        override
        returns (IClaimTopicsRegistry)
    {
        return tokenTopicsRegistry;
    }

    /**
     *  @dev See {IIdentityRegistry-identityStorage}.
     */
    function identityStorage()
        external
        view
        override
        returns (IIdentityRegistryStorage)
    {
        return tokenIdentityStorage;
    }

    /**
     *  @dev See {IIdentityRegistry-registerIdentity}.
     */
    function registerIdentity(
        address _userAddress,
        IIdentity _identity,
        uint16 _country
    ) public override onlyAgent {
        console.log("registering identity");
        tokenIdentityStorage.addIdentityToStorage(
            _userAddress,
            _identity,
            _country
        );
        emit IdentityRegistered(_userAddress, _identity);
    }

    /**
     *  @dev See {IIdentityRegistry-batchRegisterIdentity}.
     */
    function batchRegisterIdentity(
        address[] calldata _userAddresses,
        IIdentity[] calldata _identities,
        uint16[] calldata _countries
    ) external override {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            registerIdentity(_userAddresses[i], _identities[i], _countries[i]);
        }
    }

    /**
     *  @dev See {IIdentityRegistry-updateIdentity}.
     */
    function updateIdentity(
        address _userAddress,
        IIdentity _identity
    ) external override onlyAgent {
        IIdentity oldIdentity = identity(_userAddress);
        tokenIdentityStorage.modifyStoredIdentity(_userAddress, _identity);
        emit IdentityUpdated(oldIdentity, _identity);
    }

    /**
     *  @dev See {IIdentityRegistry-updateCountry}.
     */
    function updateCountry(
        address _userAddress,
        uint16 _country
    ) external override onlyAgent {
        tokenIdentityStorage.modifyStoredInvestorCountry(
            _userAddress,
            _country
        );
        emit CountryUpdated(_userAddress, _country);
    }

    /**
     *  @dev See {IIdentityRegistry-deleteIdentity}.
     */
    function deleteIdentity(address _userAddress) external override onlyAgent {
        IIdentity oldIdentity = identity(_userAddress);
        tokenIdentityStorage.removeIdentityFromStorage(_userAddress);
        emit IdentityRemoved(_userAddress, oldIdentity);
    }

    /**
     *  @dev See {IIdentityRegistry-isVerified}.
     */
    function isVerified(
        address _userAddress
    ) external view override returns (bool) {
        console.log("inside is verfied!");
        console.log("Address is :", _userAddress);
        if (address(identity(_userAddress)) == address(0)) {
            console.log("inside ==== 0");
            return false;
        }
        console.log("passed 0 check");
        uint256[] memory requiredClaimTopics = tokenTopicsRegistry
            .getClaimTopics();
        if (requiredClaimTopics.length == 0) {
            return true;
        }
        console.log("passed requiredClaimTopics 0 len");
        uint256 foundClaimTopic;
        uint256 scheme;
        address issuer;
        bytes memory sig;
        bytes memory data;
        uint256 claimTopic;
        for (
            claimTopic = 0;
            claimTopic < requiredClaimTopics.length;
            claimTopic++
        ) {
            bytes32[] memory claimIds = identity(_userAddress)
                .getClaimIdsByTopic(requiredClaimTopics[claimTopic]);
            if (claimIds.length == 0) {
                console.log("inside claimId");
                return false;
            }
            for (uint256 j = 0; j < claimIds.length; j++) {
                (foundClaimTopic, scheme, issuer, sig, data, ) = identity(
                    _userAddress
                ).getClaim(claimIds[j]);
                console.log("foundClaimTopic :", foundClaimTopic);
                console.log("scheme : ", scheme);
                console.log("issuer : ", issuer);
                console.log("Sig : ");
                console.logBytes(sig);
                console.log("data :");
                console.logBytes(data);

                try
                    IClaimIssuer(issuer).isClaimValid(
                        identity(_userAddress),
                        requiredClaimTopics[claimTopic],
                        sig,
                        data
                    )
                returns (bool _validity) {
                    console.log("is claim valid ", _validity);
                    if (
                        _validity &&
                        tokenIssuersRegistry.hasClaimTopic(
                            issuer,
                            requiredClaimTopics[claimTopic]
                        ) &&
                        tokenIssuersRegistry.isTrustedIssuer(issuer)
                    ) {
                        j = claimIds.length;
                    }
                    if (
                        !tokenIssuersRegistry.isTrustedIssuer(issuer) &&
                        j == (claimIds.length - 1)
                    ) {
                        console.log("another inside if");
                        console.log(
                            tokenIssuersRegistry.isTrustedIssuer(issuer)
                        );
                        console.log(j == (claimIds.length - 1));
                        return false;
                    }
                    console.log("just afer that ");
                    if (
                        !tokenIssuersRegistry.hasClaimTopic(
                            issuer,
                            requiredClaimTopics[claimTopic]
                        ) && j == (claimIds.length - 1)
                    ) {
                        console.log("after that if ----------------");
                        return false;
                    }
                    console.log("_validity :", _validity);
                    console.log(
                        "j == (claimIds.length - 1)",
                        j == (claimIds.length - 1)
                    );

                    if (!_validity && j == (claimIds.length - 1)) {
                        console.log("after that if ------Q---------");

                        return false;
                    }
                } catch {
                    if (j == (claimIds.length - 1)) {
                        return false;
                    }
                }
            }
        }
        console.log("is true ? true");
        return true;
    }

    /**
     *  @dev See {IIdentityRegistry-setIdentityRegistryStorage}.
     */
    function setIdentityRegistryStorage(
        address _identityRegistryStorage
    ) external override onlyOwner {
        tokenIdentityStorage = IIdentityRegistryStorage(
            _identityRegistryStorage
        );
        emit IdentityStorageSet(_identityRegistryStorage);
    }

    /**
     *  @dev See {IIdentityRegistry-setClaimTopicsRegistry}.
     */
    function setClaimTopicsRegistry(
        address _claimTopicsRegistry
    ) external override onlyOwner {
        tokenTopicsRegistry = IClaimTopicsRegistry(_claimTopicsRegistry);
        emit ClaimTopicsRegistrySet(_claimTopicsRegistry);
    }

    /**
     *  @dev See {IIdentityRegistry-setTrustedIssuersRegistry}.
     */
    function setTrustedIssuersRegistry(
        address _trustedIssuersRegistry
    ) external override onlyOwner {
        tokenIssuersRegistry = ITrustedIssuersRegistry(_trustedIssuersRegistry);
        emit TrustedIssuersRegistrySet(_trustedIssuersRegistry);
    }

    /**
     *  @dev See {IIdentityRegistry-contains}.
     */
    function contains(
        address _userAddress
    ) external view override returns (bool) {
        if (address(identity(_userAddress)) == address(0)) {
            return false;
        }
        return true;
    }
}
