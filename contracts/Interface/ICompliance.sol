// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ICompliance {
    // events
    event TokenAgentAdded(address _agentAddress);
    event TokenAgentRemoved(address _agentAddress);
    event TokenBound(address _token);
    event TokenUnbound(address _token);

    // functions
    // initialization of the compliance contract
    function addTokenAgent(address _agentAddress) external;

    function removeTokenAgent(address _agentAddress) external;

    function bindToken(address _token) external;

    function unbindToken(address _token) external;

    // check the parameters of the compliance contract
    function isTokenAgent(address _agentAddress) external view returns (bool);

    function isTokenBound(address _token) external view returns (bool);

    // compliance check and state update
    function canTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external view returns (bool);

    function transferred(
        address _from,
        address _to,
        uint256 _amount
    ) external;

    function created(address _to, uint256 _amount) external;

    function destroyed(address _from, uint256 _amount) external;

    // setting owner role
    function transferOwnershipOnComplianceContract(address newOwner) external;
}
