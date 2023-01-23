// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

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

contract SBT is ERC1155, AccessControl {
    event Attest(address indexed to, uint256[] indexed tokekId);
    event Revoke(address indexed to, uint256[] indexed tokenId);

    //is community approved
    mapping(string => bool) nameExist;
    mapping(string => uint256) communityToId;
    mapping(uint256 => bool) idExist;
    //approved communities against wrapped property token.
    mapping(string => mapping(string => bool)) approvedSBT;
    //approved communities list against wrapped property token.
    mapping(string => string[]) approvedSBTCommunities;

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice to get the tokenId of the community
     * @param community name.
     * @return token id of that community.
     */
    function getCommunityToId(
        string memory community
    ) external view returns (uint256) {
        if (communityToId[community] == 0) {
            revert CommunityDoesnotExist(community);
        }
        return communityToId[community];
    }

    /**
     * @notice to get the balanceOf specific community/Id.
     * @param user address to check the balance
     * @param community name/symbol
     */
    function getBalanceOf(
        address user,
        string memory community
    ) external view returns (uint256) {
        return balanceOf(user, communityToId[community]);
    }

    /**
     * @notice to check if the community exists
     * @param name of the community.
     */

    function DoesCommunityExist(
        string memory name
    ) external view onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        return nameExist[name];
    }

    /**
     * @notice get approved communities for wrapped Legal property
     * @param symbol of the wrapped Legal property.
     */

    function getApprovedSBTCommunities(
        string memory symbol
    ) external view returns (string[] memory) {
        return approvedSBTCommunities[symbol];
    }

    /**
     * @notice to add community
     * @param name of the community.
     * @param id of the community.
     */

    function addCommunity(
        string memory name,
        uint256 id
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (id == 0) {
            revert CantBeZero();
        }
        if (nameExist[name] || idExist[id]) {
            revert AlreadyApprovedCommunity(name);
        }
        nameExist[name] = true;
        idExist[id] = true;
        communityToId[name] = id;
    }

    /**
     * @notice to remove community from approved communities.
     * @param name of the community.
     */

    function removeCommunity(
        string memory name
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!nameExist[name]) {
            revert CommunityDoesnotExist(name);
        }
        delete idExist[communityToId[name]];
        delete nameExist[name];
        delete communityToId[name];
    }

    /**
     * @notice to approve community against wrapped legal token
     * @param wrappedProperty symbol
     * @param community to approve.
     */

    function addApprovedCommunity(
        string calldata wrappedProperty,
        string memory community
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!nameExist[community]) {
            revert WrongCommunityName();
        }
        if (approvedSBT[wrappedProperty][community]) {
            revert AlreadyApprovedCommunity(community);
        }
        approvedSBT[wrappedProperty][community] = true;
        approvedSBTCommunities[wrappedProperty].push(community);
    }

    /**
     * @notice to bulk approve communiteis against wrapped legal token
     * @param wrappedProperty symbol
     * @param communties to approve.
     */

    function bulkApproveCommunities(
        string calldata wrappedProperty,
        string[] memory communties
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i; i < communties.length; i++) {
            if (!nameExist[communties[i]]) {
                revert WrongCommunityName();
            }
            approvedSBT[wrappedProperty][communties[i]] = true;
            approvedSBTCommunities[wrappedProperty].push(communties[i]);
        }
    }

    /**
     * @notice to check if the community is approved against wrappedProperty
     * @param wrappedProperty symbol.
     * @param community symbol.
     */
    function getApprovedSBT(
        string calldata wrappedProperty,
        string memory community
    ) external view returns (bool) {
        return approvedSBT[wrappedProperty][community];
    }

    /**
     * @notice remove approved community against wrapped legal token
     * @param wrappedProperty symbol
     * @param community to remove.
     */
    function removeApprovedCommunity(
        string calldata wrappedProperty,
        string memory community
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!nameExist[community]) {
            revert WrongCommunityName();
        }
        delete approvedSBT[wrappedProperty][community];
        uint256 len = approvedSBTCommunities[wrappedProperty].length;

        string[] storage communities = approvedSBTCommunities[wrappedProperty];

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
        string calldata wrappedProperty,
        string[] memory communities
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        string[] storage _communities = approvedSBTCommunities[wrappedProperty];
        if (communities.length > _communities.length) {
            revert InputLenGreater();
        }
        for (uint256 i; i < communities.length; i++) {
            if (!nameExist[communities[i]]) {
                revert WrongCommunityName();
            }
            delete approvedSBT[wrappedProperty][communities[i]];
            for (uint256 j; j < _communities.length; j++) {
                bytes32 hash1 = keccak256(abi.encodePacked(_communities[j]));
                bytes32 hash2 = keccak256(abi.encodePacked(communities[j]));
                if (hash1 == hash2) {
                    _communities[j] = _communities[_communities.length - 1];
                    _communities.pop();
                }
            }
        }
    }

    /**
     * @notice to SET the URI.
     */
    function setURI(
        string memory newuri
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    /**
     * @notice to mint community SBT to user
     * @param to the SBT reciver
     * @param communityName name of SBT community
     */
    function mint(
        address to,
        string memory communityName
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 id = communityToId[communityName];
        if (id == 0) {
            revert WrongCommunityName();
        }
        if (balanceOf(to, id) == 1) {
            revert CantMintTwice();
        }
        _mint(to, id, 1, "");
    }

    /**
     * @notice to mint diffrent community SBT to user
     * @param to of the SBT reciver
     * @param communityNames names of SBT communities
     */

    function mintBatch(
        address to,
        string[] memory communityNames
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 len = communityNames.length;
        uint256[] memory ids = new uint256[](len);
        uint256[] memory amounts = new uint256[](len);
        for (uint256 i; i < len; i++) {
            uint256 id = communityToId[communityNames[i]];
            if (id == 0) {
                revert WrongCommunityName();
            }
            if (balanceOf(to, id) == 1) {
                revert CantMintTwice();
            }
            ids[i] = id;
            amounts[i] = 1;
        }
        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @notice revoke SBT from user
     * @param from to revoke access
     * @param communityName names of the community.
     */

    function revoke(
        address from,
        string memory communityName
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _burn(from, communityToId[communityName], 1);
    }

    /**
     * @notice bulk revoke SBT from user
     * @param from to revoke SBT
     * @param communityNames names of diffrent communities
     */

    function revokeBatch(
        address from,
        string[] memory communityNames
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 len = communityNames.length;
        uint256[] memory ids = new uint256[](len);
        uint256[] memory amounts = new uint256[](len);
        for (uint256 i; i < len; i++) {
            ids[i] = communityToId[communityNames[i]];
            amounts[i] = 1;
        }
        _burnBatch(from, ids, amounts);
    }

    /**
     @notice The following functions are overrides required by Solidity.
     *
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice checks on before token transfer
     */

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        if (!(from == address(0) || to == address(0))) {
            revert TransferNotAllowed(from, to, ids, amounts, data);
        }
        (operator);
    }

    /**
     * @notice checks on after token transfer
     */
    function _afterTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        if (from == address(0)) {
            emit Attest(to, ids);
        } else if (to == address(0)) {
            emit Revoke(to, ids);
        }
        (operator, amounts, data);
    }
}
