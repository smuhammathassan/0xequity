//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

contract IAdminRegistry {
    struct AdminRoles {
        bool CollectionApprover;
        bool isLiquidator;
        bool superAdmin;
    }

    function addAdmin(address _pendingAdmin, AdminRoles memory _adminRoles)
        external
        override;

    function adminApprovalVote(address _pendingAdmin, bytes32 _choice) external;

    function removeAdmin(address _pendingAdmin) external;

    function adminRemovalVote(address _pendingAdmin, bytes32 _choice) external;

    function transferSuperAdmin(address _newSuperAdmin) external;

    function editAdminRole(address _admin, AdminRoles memory _adminRoles)
        external;

    function isApprovedAdmin(address _admin) external view returns (bool);

    function isPendingApprove(address _admin) external view returns (bool);

    function isPendingRemove(address _admin) external view returns (bool);
}
