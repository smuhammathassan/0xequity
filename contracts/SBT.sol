// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import {SBTLib} from "./libraries/SBTLib.sol";
import {ISBT} from "./Interface/ISBT.sol";
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

contract SBT is ISBT, ERC1155, AccessControl {
    using SBTLib for Storage;

    //----------------------------------------
    // Storage
    //----------------------------------------

    Storage internal storageParams;

    //----------------------------------------
    // Constructor
    //----------------------------------------

    constructor() ERC1155("0xEQUITYKYC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    //----------------------------------------
    // External View
    //----------------------------------------

    /**
     * @notice to get the tokenId of the community
     * @param community name.
     * @return token id of that community.
     */
    function getCommunityToId(
        string memory community
    ) external view returns (uint256) {
        return storageParams.getCommunityToId(community);
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
        return balanceOf(user, storageParams.communityToId[community]);
    }

    /**
     * @notice to check if the community exists
     * @param name of the community.
     */

    function DoesCommunityExist(
        string memory name
    ) external view returns (bool) {
        return storageParams.nameExist[name];
    }

    /**
     * @notice get approved communities for wrapped Legal property
     * @param symbol of the wrapped Legal property.
     */

    function getApprovedSBTCommunities(
        string memory symbol
    ) external view returns (string[] memory) {
        return storageParams.approvedSBTCommunities[symbol];
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
        storageParams.addCommunity(name, id);
    }

    /**
     * @notice bulk add communities
     * @param names of the community.
     * @param ids of the community.
     */

    function bulkAddCommunities(
        string[] memory names,
        uint256[] memory ids
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i; i < ids.length; i++) {
            storageParams.addCommunity(names[i], ids[i]);
        }
    }

    /**
     * @notice to remove community from approved communities.
     * @param name of the community.
     */
    function removeCommunity(
        string memory name
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        storageParams.removeCommunity(name);
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
        storageParams.addApprovedCommunity(wrappedProperty, community);
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
        storageParams.bulkApproveCommunities(wrappedProperty, communties);
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
        return storageParams.approvedSBT[wrappedProperty][community];
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
        storageParams.removeApprovedCommunity(wrappedProperty, community);
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
        storageParams.bulkRemoveCommunities(wrappedProperty, communities);
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
        uint256 id = storageParams.mint(communityName);
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

    /**
     * @notice to mint diffrent community SBT to user
     * @param to of the SBT reciver
     * @param communityNames names of SBT communities
     */

    function mintBatch(
        address to,
        string[] memory communityNames
    ) external returns (uint256[] memory ids, uint256[] memory amounts) {
        uint256 len = communityNames.length;
        ids = new uint256[](len);
        amounts = new uint256[](len);
        for (uint256 i; i < len; i++) {
            uint256 id = storageParams.communityToId[communityNames[i]];
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
        _burn(from, storageParams.communityToId[communityName], 1);
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
        (uint256[] memory ids, uint256[] memory amounts) = storageParams
            .revokeBatch(communityNames);
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
            emit SBTLib.Attest(to, ids);
        } else if (to == address(0)) {
            emit SBTLib.Revoke(to, ids);
        }
        (operator, amounts, data);
    }
}
