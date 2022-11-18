// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IClaimTopicsRegistry {
    // events
    event ClaimTopicAdded(uint256 indexed claimTopic);
    event ClaimTopicRemoved(uint256 indexed claimTopic);

    // functions
    // setters
    function addClaimTopic(uint256 _claimTopic) external;

    function removeClaimTopic(uint256 _claimTopic) external;

    // getter
    function getClaimTopics() external view returns (uint256[] memory);

    // role setter
    function transferOwnershipOnClaimTopicsRegistryContract(address _newOwner)
        external;
}
