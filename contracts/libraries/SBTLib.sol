// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import {ISBT} from "../Interface/ISBT.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "hardhat/console.sol";

error TransferNotAllowed(
    address from,
    address to,
    uint256[] ids,
    uint256[] amounts,
    bytes data
);
error AlreadyApprovedCommunity(string name);
error CommunityDoesnotExist(string name);
error CantBeZero();
error CantMintTwice();
error WrongCommunityName();
error InputLenGreater();

// This contract uses the library to set and retrieve state variables
library SBTLib {
    event Attest(address indexed to, uint256[] indexed tokekId);
    event Revoke(address indexed to, uint256[] indexed tokenId);

    /**
     * @notice to get the tokenId of the community
     * @param community name.
     * @return token id of that community.
     */
    function getCommunityToId(
        ISBT.Storage storage _storageParams,
        string memory community
    ) external view returns (uint256) {
        if (_storageParams.communityToId[community] == 0) {
            revert CommunityDoesnotExist(community);
        }
        return _storageParams.communityToId[community];
    }

    /**
     * @notice to add community
     * @param name of the community.
     * @param id of the community.
     */

    function addCommunity(
        ISBT.Storage storage _storageParams,
        string memory name,
        uint256 id
    ) external {
        if (id == 0) {
            revert CantBeZero();
        }
        if (_storageParams.nameExist[name] || _storageParams.idExist[id]) {
            revert AlreadyApprovedCommunity(name);
        }
        _storageParams.nameExist[name] = true;
        _storageParams.idExist[id] = true;
        _storageParams.communityToId[name] = id;
    }

    /**
     * @notice to remove community from approved communities.
     * @param name of the community.
     */

    function removeCommunity(
        ISBT.Storage storage _storageParams,
        string memory name
    ) external {
        if (!_storageParams.nameExist[name]) {
            revert CommunityDoesnotExist(name);
        }
        delete _storageParams.idExist[_storageParams.communityToId[name]];
        delete _storageParams.nameExist[name];
        delete _storageParams.communityToId[name];
    }

    /**
     * @notice to approve community against wrapped legal token
     * @param wrappedProperty symbol
     * @param community to approve.
     */

    function addApprovedCommunity(
        ISBT.Storage storage _storageParams,
        string calldata wrappedProperty,
        string memory community
    ) external {
        if (!_storageParams.nameExist[community]) {
            revert WrongCommunityName();
        }
        if (_storageParams.approvedSBT[wrappedProperty][community]) {
            revert AlreadyApprovedCommunity(community);
        }
        _storageParams.approvedSBT[wrappedProperty][community] = true;
        _storageParams.approvedSBTCommunities[wrappedProperty].push(community);
    }

    /**
     * @notice to bulk approve communiteis against wrapped legal token
     * @param wrappedProperty symbol
     * @param communties to approve.
     */

    function bulkApproveCommunities(
        ISBT.Storage storage _storageParams,
        string calldata wrappedProperty,
        string[] memory communties
    ) external {
        for (uint256 i; i < communties.length; i++) {
            if (!_storageParams.nameExist[communties[i]]) {
                revert WrongCommunityName();
            }
            _storageParams.approvedSBT[wrappedProperty][communties[i]] = true;
            _storageParams.approvedSBTCommunities[wrappedProperty].push(
                communties[i]
            );
        }
    }

    /**
     * @notice remove approved community against wrapped legal token
     * @param wrappedProperty symbol
     * @param community to remove.
     */
    function removeApprovedCommunity(
        ISBT.Storage storage _storageParams,
        string calldata wrappedProperty,
        string memory community
    ) external {
        if (!_storageParams.nameExist[community]) {
            revert WrongCommunityName();
        }
        delete _storageParams.approvedSBT[wrappedProperty][community];
        uint256 len = _storageParams
            .approvedSBTCommunities[wrappedProperty]
            .length;

        string[] storage communities = _storageParams.approvedSBTCommunities[
            wrappedProperty
        ];

        for (uint256 i; i < len; i++) {
            bytes32 hash1 = keccak256(abi.encodePacked(community));
            bytes32 hash2 = keccak256(abi.encodePacked(communities[i]));
            if (hash1 == hash2) {
                communities[i] = communities[len - 1];
                communities.pop();
                return;
            }
        }
    }

    /**
     * @notice remove approved communiteis against wrapped legal token
     * @param wrappedProperty symbol
     * @param communities to remove.
     */
    function bulkRemoveCommunities(
        ISBT.Storage storage _storageParams,
        string calldata wrappedProperty,
        string[] memory communities
    ) external {
        string[] storage _communities = _storageParams.approvedSBTCommunities[
            wrappedProperty
        ];
        console.log("_communities.length", _communities.length);
        if (communities.length > _communities.length) {
            revert InputLenGreater();
        }
        //
        for (uint256 i; i < communities.length; i++) {
            console.log("I = > ", i);
            if (!_storageParams.nameExist[communities[i]]) {
                revert WrongCommunityName();
            }
            delete _storageParams.idExist[
                _storageParams.communityToId[communities[i]]
            ];
            delete _storageParams.nameExist[communities[i]];
            delete _storageParams.approvedSBT[wrappedProperty][communities[i]];
            console.log("communities.length => ", communities.length);
            for (uint256 j; j < _communities.length; j++) {
                console.log("communities.length => ", communities.length);
                console.log("j = > ", j);

                bytes32 hash1 = keccak256(abi.encodePacked(_communities[j]));
                bytes32 hash2 = keccak256(abi.encodePacked(communities[i]));
                if (hash1 == hash2) {
                    console.log("inside IF");
                    _communities[j] = _communities[_communities.length - 1];
                    _communities.pop();
                    break;
                }
            }
        }
    }

    /**
     * @notice to mint community SBT to user
     * @param communityName name of SBT community
     */
    function mint(
        ISBT.Storage storage _storageParams,
        string memory communityName
    ) external returns (uint256 id) {
        id = _storageParams.communityToId[communityName];
        if (id == 0) {
            revert WrongCommunityName();
        }
    }

    /**
     * @notice bulk revoke SBT from user
     * @param communityNames names of diffrent communities
     */
    function revokeBatch(
        ISBT.Storage storage _storageParams,
        string[] memory communityNames
    ) external returns (uint256[] memory ids, uint256[] memory amounts) {
        uint256 len = communityNames.length;
        ids = new uint256[](len);
        amounts = new uint256[](len);
        for (uint256 i; i < len; i++) {
            ids[i] = _storageParams.communityToId[communityNames[i]];
            amounts[i] = 1;
        }
    }
}
