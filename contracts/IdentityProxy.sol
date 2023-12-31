// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IImplementationAuthority {
    function getImplementation() external view returns (address);
}

contract IdentityProxy1 {
    address public implementationAuthority;

    constructor(
        address _implementationAuthority,
        address initialManagementKey
    ) {
        implementationAuthority = _implementationAuthority;

        address logic = IImplementationAuthority(implementationAuthority)
            .getImplementation();

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = logic.delegatecall(
            abi.encodeWithSignature("initialize(address)", initialManagementKey)
        );
        require(success, "Initialization failed.");
    }

    fallback() external payable {
        address logic = IImplementationAuthority(implementationAuthority)
            .getImplementation();

        assembly {
            // solium-disable-line
            calldatacopy(0x0, 0x0, calldatasize())
            let success := delegatecall(
                sub(gas(), 10000),
                logic,
                0x0,
                calldatasize(),
                0,
                0
            )
            let retSz := returndatasize()
            returndatacopy(0, 0, retSz)
            switch success
            case 0 {
                revert(0, retSz)
            }
            default {
                return(0, retSz)
            }
        }
    }
}
