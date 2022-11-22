// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

error CallerNotFactory();

contract PropertyToken is ERC20, AccessControl {
    IToken public immutable property;
    address public immutable factory;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    modifier onlyMinter() {
        hasRole(MINTER_ROLE, msg.sender);
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) {
            revert CallerNotFactory();
        }
        _;
    }

    constructor(
        IToken _property,
        string memory _name,
        string memory _symbol,
        address _factory
    ) ERC20(_name, _symbol) {
        property = _property;
        factory = _factory;
        grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address _to, uint256 _amount) external onlyMinter {
        _mint(_to, _amount * 1e18);
    }

    function unlock(uint256 _amount) external onlyMinter {
        IToken(property).approve(factory, _amount);
    }
}
