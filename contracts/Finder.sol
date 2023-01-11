// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.9;

import {IFinder} from "./Interface/IFinder.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

error EmptyBytecode();
error OnlyMaintainerRole();

/**
 * @title Provides addresses of contracts implementing certain interfaces.
 */
contract Finder is IFinder, AccessControlEnumerable {
    bytes32 public constant MAINTAINER_ROLE = keccak256("Maintainer");

    //Describe role structure
    struct Roles {
        address admin;
        address maintainer;
    }

    //----------------------------------------
    // Storage
    //----------------------------------------

    mapping(bytes32 => address) public interfacesImplemented;
    mapping(bytes32 => bytes) public interfacesBytecode;

    //----------------------------------------
    // Events
    //----------------------------------------

    event InterfaceImplementationChanged(
        bytes32 indexed interfaceName,
        address indexed newImplementationAddress
    );
    event InterfaceBytecodeChanged(
        bytes32 indexed interfaceName,
        bytes indexed implementationBytecode
    );

    //----------------------------------------
    // Modifiers
    //----------------------------------------

    modifier onlyMaintainer() {
        if (!hasRole(MAINTAINER_ROLE, msg.sender)) {
            revert OnlyMaintainerRole();
        }
        _;
    }

    //----------------------------------------
    // Constructors
    //----------------------------------------

    constructor(Roles memory roles) {
        _grantRole(DEFAULT_ADMIN_ROLE, roles.admin);
        _grantRole(MAINTAINER_ROLE, roles.maintainer);
    }

    //----------------------------------------
    // External view
    //----------------------------------------

    /**
     * @notice Updates the address of the contract that implements `interfaceName`.
     * @param interfaceName bytes32 of the interface name that is either changed or registered.
     * @param implementationAddress address of the implementation contract.
     */
    function changeImplementationAddress(
        bytes32 interfaceName,
        address implementationAddress
    ) external override onlyMaintainer {
        interfacesImplemented[interfaceName] = implementationAddress;

        emit InterfaceImplementationChanged(
            interfaceName,
            implementationAddress
        );
    }

    /**
     * @notice Updates the address of the contract that implements `interfaceName`.
     * @param interfaceName bytes32 of the interface name that is either changed or registered.
     * @param implementationBytecode bytecode of the implementation contract.
     */
    function changeImplementationBytecode(
        bytes32 interfaceName,
        bytes calldata implementationBytecode
    ) external override onlyMaintainer {
        interfacesBytecode[interfaceName] = implementationBytecode;

        emit InterfaceBytecodeChanged(interfaceName, implementationBytecode);
    }

    /**
     * @notice Gets the address of the contract that implements the given `interfaceName`.
     * @param interfaceName queried interface.
     * @return implementationAddress Address of the defined interface.
     */
    function getImplementationAddress(bytes32 interfaceName)
        external
        view
        override
        returns (address)
    {
        address implementationAddress = interfacesImplemented[interfaceName];
        require(
            implementationAddress != address(0x0),
            "Implementation not found"
        );
        return implementationAddress;
    }

    /**
     * @notice Gets the address of the contract that implements the given `interfaceName`.
     * @param interfaceName queried interface.
     * @return implementationAddress Address of the defined interface.
     */
    function getImplementationBytecode(bytes32 interfaceName)
        external
        view
        override
        returns (bytes memory)
    {
        bytes memory implementationBytecode = interfacesBytecode[interfaceName];
        if (implementationBytecode.length == 0) {
            revert EmptyBytecode();
        }
        return implementationBytecode;
    }
}
