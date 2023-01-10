//SPDX-License-Identifier: MIT
import "hardhat/console.sol";
import "./Interface/IAdminRegistry.sol";

pragma solidity ^0.8.7;

contract AdminRegistry is IAdminRegistry {
    event NewAdminAdded(address newAdmin);
    event NewSuperAdmin(address newSuperAdmin);
    event NewAdminRole(AdminRoles adminRoles);
    event PendingApprove(address pendingApproveAdmin);
    event PendingRemove(address pendingRemoveAdmin);
    event AdminRemoved(address removedAdmin);

    address superAdmin;
    bytes32 public constant APPROVE = keccak256("APPROVE");
    bytes32 public constant REJECT = keccak256("REJECT");

    address[] public approvedAdmin;
    address[] public pendingAdmin;
    mapping(address => bool) approvedAdmins;
    mapping(address => bool) pendingApprove;
    mapping(address => bool) pendingRemove;
    mapping(address => AdminRoles) approvedAdminRoles;
    mapping(address => AdminRoles) pendingAdminRoles;
    mapping(address => mapping(address => bytes32)) pendingApproveVote;
    mapping(address => mapping(address => bytes32)) pendingRemoveVote;

    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "Must be Super Admin");
        _;
    }

    constructor(
        address _superAdmin,
        address admin1,
        address admin2,
        address admin3
    ) {
        superAdmin = _superAdmin;
        approvedAdminRoles[_superAdmin] = AdminRoles(true, true, true);
        approvedAdminRoles[admin1] = AdminRoles(true, true, false);
        approvedAdminRoles[admin2] = AdminRoles(true, true, false);
        approvedAdminRoles[admin3] = AdminRoles(true, true, false);
    }

    function addAdmin(address _pendingAdmin, AdminRoles memory _adminRoles)
        external
        override
    {
        require(
            !pendingApprove[_pendingAdmin],
            "Already in the pending approve"
        );
        require(_pendingAdmin != address(0x00), "Null Address can't be admin");
        pendingApprove[_pendingAdmin] = true;
        pendingAdminRoles[_pendingAdmin] = _adminRoles;
        pendingApproveVote[_pendingAdmin][msg.sender] = APPROVE;
        emit PendingApprove(_pendingAdmin);
    }

    function adminApprovalVote(address _pendingAdmin, bytes32 _choice)
        external
        override
    {
        require(
            pendingApproveVote[_pendingAdmin][msg.sender] == bytes32(0x00),
            "You've already voted!"
        );
        require(pendingApprove[_pendingAdmin], "Not a Pending Admin");
        require(_choice == APPROVE || _choice == REJECT, "Not a valid choice");
        pendingApproveVote[_pendingAdmin][msg.sender] = _choice;
        uint256 length = approvedAdmin.length;
        uint256 voting;
        for (uint256 i; i < length; i++) {
            if (
                pendingApproveVote[_pendingAdmin][approvedAdmin[i]] == APPROVE
            ) {
                voting = voting + 1;
            }
        }
        if ((length / 2) < voting) {
            approvedAdmin.push(_pendingAdmin);
            approvedAdminRoles[_pendingAdmin] = pendingAdminRoles[
                _pendingAdmin
            ];
            approvedAdmins[_pendingAdmin] = true;
            delete pendingAdminRoles[_pendingAdmin];
            for (uint256 i; i < length; i++) {
                if (pendingAdmin[i] == _pendingAdmin) {
                    delete pendingAdmin[i]; // todo
                }
                delete pendingApproveVote[_pendingAdmin][approvedAdmin[i]];
            }
            emit NewAdminAdded(_pendingAdmin);
        }
    }

    function removeAdmin(address _pendingAdmin) external override {
        require(!pendingRemove[_pendingAdmin], "Already in the pending remove");
        require(approvedAdmins[_pendingAdmin] == true, "Not an approved Admin");
        pendingRemove[_pendingAdmin] = true;
        pendingRemoveVote[_pendingAdmin][msg.sender] = APPROVE;
        emit PendingRemove(_pendingAdmin);
    }

    function adminRemovalVote(address _pendingAdmin, bytes32 _choice)
        external
        override
    {
        require(approvedAdmins[_pendingAdmin], "Not an approved Admin");
        require(
            pendingRemoveVote[_pendingAdmin][msg.sender] == bytes32(0x00),
            "You've already voted!"
        );
        require(_choice == APPROVE || _choice == REJECT, "Not a valid choice");
        pendingRemoveVote[_pendingAdmin][msg.sender] = _choice;
        pendingRemove[_pendingAdmin] = true;
        uint256 length = approvedAdmin.length;
        uint256 voting;
        for (uint256 i; i < length; i++) {
            if (pendingRemoveVote[_pendingAdmin][approvedAdmin[i]] == APPROVE) {
                voting = voting + 1;
            }
        }
        if ((length / 2) < voting) {
            for (uint256 i; i < length; i++) {
                if (approvedAdmin[i] == _pendingAdmin) {
                    delete approvedAdmin[i];
                }
            }
            delete approvedAdmins[_pendingAdmin];
            delete approvedAdminRoles[_pendingAdmin];
            emit AdminRemoved(_pendingAdmin);
        }
    }

    function transferSuperAdmin(address _newSuperAdmin)
        external
        override
        onlySuperAdmin
    {
        require(approvedAdmins[_newSuperAdmin], "Must be an approved admin");
        require(_newSuperAdmin == address(0x00), "Can't be Null Address");
        approvedAdminRoles[msg.sender] = AdminRoles(true, true, false);
        approvedAdminRoles[_newSuperAdmin] = AdminRoles(true, true, true);
        superAdmin = _newSuperAdmin;
        emit NewSuperAdmin(_newSuperAdmin);
    }

    function editAdminRole(address _admin, AdminRoles memory _adminRoles)
        external
        override
        onlySuperAdmin
    {
        require(approvedAdmins[_admin], "Must be an approved admin");
        require(_adminRoles.superAdmin == false, "can't give Super Admin Role");
        approvedAdminRoles[_admin] = _adminRoles;
        emit NewAdminRole(_adminRoles);
    }

    function isApprovedAdmin(address _admin)
        external
        view
        override
        returns (bool)
    {
        return approvedAdmins[_admin];
    }

    function isPendingApprove(address _admin)
        external
        view
        override
        returns (bool)
    {
        return pendingApprove[_admin];
    }

    function isPendingRemove(address _admin)
        external
        view
        override
        returns (bool)
    {
        return pendingRemove[_admin];
    }
}
