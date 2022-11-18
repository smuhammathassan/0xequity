// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

//CHange transferFrom to SafeTransferfrom

error PropertyAlreadyExist();
error PropertyDoesNotExist();
error ZeroAddress();
error MustBeGreaterThanZero();
error OnlyAdminRole();
error MissMatch();
error ExceedTotalLegalShares();
error MustBeWholeNumber();
error totalMustBeGreaterThanToLock();
error saltAlreadyUsed();
//import "./Interface/IERC3643.sol";
import "./Create3.sol";
import "./propertyToken.sol";
import "contracts/ERC3643/contracts/roles/IAgentRoleUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

//import "/contracts/token/ERC3643.sol";

contract FactoryMaker is Context, AccessControl {
    event newERC3643(address legaltoken);
    struct property {
        address WLegalShares;
        uint256 totalLegalShares;
        uint256 lockedLegalShares;
        uint256 tokensPerLegalShares;
    }
    bytes ERC3643Bytecode;
    bytes propertyTokenBytecode;
    mapping(address => property) public legalToProperty;
    mapping(bytes => bool) salts;

    constructor(
        bytes memory _ERC3643Bytecode,
        bytes memory _propertyTokenBytecode
    ) {
        ERC3643Bytecode = _ERC3643Bytecode;
        propertyTokenBytecode = _propertyTokenBytecode;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdminRole();
        }
        _;
    }

    function createLegalToken(
        address _implementationAuthority,
        address _identityRegistry,
        address _compliance,
        string memory _propertyName,
        string memory _symbol,
        uint8 _decimals,
        address _onchainID
    ) external returns (address legalPropertyAddr) {
        console.log("In Legal token", msg.sender);
        if (salts[abi.encode(_propertyName)]) {
            revert saltAlreadyUsed();
        }
        salts[abi.encode(_propertyName)] = true;
        bytes32 salt = keccak256(abi.encodePacked(_propertyName));

        bytes memory bytecode = abi.encodePacked(
            ERC3643Bytecode,
            abi.encode(
                _implementationAuthority,
                _identityRegistry,
                _compliance,
                _propertyName,
                _symbol,
                _decimals,
                _onchainID
            )
        );

        legalPropertyAddr = Create3.create3(salt, bytecode);

        // (bool success, ) = legalPropertyAddr.delegatecall(
        //     abi.encodeWithSignature(
        //         "init(address,address,string,string,uint8,address)",
        //         _identityRegistry,
        //         _compliance,
        //         _propertyName,
        //         _symbol,
        //         _decimals,
        //         _onchainID
        //     )
        // );
        //require(success, "Initialization failed.");
        emit newERC3643(legalPropertyAddr);
    }

    //@question: how to check if the contract is really erc3643 and admin is not millicious and using erc20 contract address
    /// @notice Deploys the Wrapped Legal contract.
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
    /// @param _tokensPerLegalShares - Ratio of LegalERC3643:WrappedERC20, e.g 1:100
    /// @return WLegalShares - Address of the Wrapped Legal Token, i.e ERC20
    function addProperty(
        address _legalToken,
        uint256 _legalSharesToLock,
        uint256 _tokensPerLegalShares,
        uint256 _totalLegalShares
    ) external onlyAdmin returns (address WLegalShares) {
        if (legalToProperty[_legalToken].WLegalShares != address(0x00)) {
            revert PropertyAlreadyExist();
        }
        if (_legalToken == address(0x00)) {
            revert ZeroAddress();
        }
        if (_legalSharesToLock < 0 || _tokensPerLegalShares < 0) {
            revert MustBeGreaterThanZero();
        }
        if (_totalLegalShares < _legalSharesToLock) {
            revert totalMustBeGreaterThanToLock();
        }

        bytes32 salt = keccak256(abi.encodePacked(_legalToken));
        //bytes memory creationCode = type(PropertyToken).creationCode;

        bytes memory bytecode = abi.encodePacked(
            propertyTokenBytecode,
            abi.encode(
                _legalToken,
                IERC3643(_legalToken).name(),
                IERC3643(_legalToken).symbol()
            )
        );

        WLegalShares = Create3.create3(salt, bytecode);
        _lockAndMint(
            _legalToken,
            WLegalShares,
            _legalSharesToLock,
            _tokensPerLegalShares
        );

        legalToProperty[_legalToken] = property(
            WLegalShares,
            _totalLegalShares,
            _legalSharesToLock,
            _tokensPerLegalShares
        );
    }

    // @notice To unlock all legal shares and burn all WlegalTokens
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    function removeProperty(address _legalToken) external onlyAdmin {
        property memory _Property = legalToProperty[_legalToken];
        if (_Property.WLegalShares == address(0x00)) {
            revert PropertyDoesNotExist();
        }
        _burnAndUnlock(
            _legalToken,
            _Property.WLegalShares,
            _Property.totalLegalShares * _Property.tokensPerLegalShares
        );
        delete legalToProperty[_legalToken];
    }

    // @notice To lock more Legal tokens and Mint WLegal tokens.
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _WlegalSharesToBurn - How many shares you want to burn and unlock LegalTokens.
    function unlockParialLegal(address _legalToken, uint256 _WlegalSharesToBurn)
        external
        onlyAdmin
    {
        address WLegalShares = legalToProperty[_legalToken].WLegalShares;
        if (WLegalShares == address(0x00)) {
            revert PropertyDoesNotExist();
        }
        _burnAndUnlock(_legalToken, WLegalShares, _WlegalSharesToBurn);
        legalToProperty[_legalToken].lockedLegalShares -=
            _WlegalSharesToBurn /
            legalToProperty[_legalToken].tokensPerLegalShares;
    }

    /// @notice To lock more Legal tokens and Mint WLegal tokens.
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
    function addMoreWLegalTokens(
        address _legalToken,
        uint256 _legalSharesToLock
    ) external onlyAdmin {
        if (legalToProperty[_legalToken].WLegalShares == address(0x00)) {
            revert PropertyDoesNotExist();
        }
        if (
            legalToProperty[_legalToken].totalLegalShares <
            legalToProperty[_legalToken].lockedLegalShares + _legalSharesToLock
        ) {
            revert ExceedTotalLegalShares();
        }
        if (_legalSharesToLock < 0) {
            revert MustBeGreaterThanZero();
        }
        _lockAndMint(
            _legalToken,
            legalToProperty[_legalToken].WLegalShares,
            _legalSharesToLock
        );

        legalToProperty[_legalToken].lockedLegalShares += _legalSharesToLock;
    }

    /// @notice Lock legal token and mint wrapped tokens, when want to add more tokens.
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _WLegalToken - wrapped Legal tokens i.e ERC20 token with locked ERC3643.
    /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
    function _lockAndMint(
        address _legalToken,
        address _WLegalToken,
        uint256 _legalSharesToLock
    ) internal {
        uint256 _tokensPerLegalShares = legalToProperty[_legalToken]
            .tokensPerLegalShares;
        _lockAndMint(
            _legalToken,
            _WLegalToken,
            _legalSharesToLock,
            _tokensPerLegalShares
        );
    }

    /// @notice Lock legal token and mint wrapped tokens.
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _WLegalToken - wrapped Legal tokens i.e ERC20 token with locked ERC3643.
    /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
    /// @param _tokensPerLegalShares - Ratio of LegalERC3643:WrappedERC20, e.g 1:100
    function _lockAndMint(
        address _legalToken,
        address _WLegalToken,
        uint256 _legalSharesToLock,
        uint256 _tokensPerLegalShares
    ) internal {
        uint256 balanceBefore = IERC3643(_legalToken).balanceOf(_WLegalToken);
        IERC3643(_legalToken).transferFrom(
            _msgSender(),
            _WLegalToken,
            _legalSharesToLock
        );

        uint256 balanceAfter = IERC3643(_legalToken).balanceOf(_WLegalToken);
        if (!((balanceAfter - balanceBefore) == _legalSharesToLock)) {
            revert MissMatch();
        }
        PropertyToken(_WLegalToken).mint(
            _msgSender(),
            _tokensPerLegalShares * _legalSharesToLock
        );
    }

    /// @notice burn WLegal(ERC20) and unlock legal tokens
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _WLegalToken - wrapped Legal tokens i.e ERC20 token with locked ERC3643.
    /// @param _WlegalSharesToBurn - ERC20 tokens you want to burn and unlock Legal tokens.
    function _burnAndUnlock(
        address _legalToken,
        address _WLegalToken,
        uint256 _WlegalSharesToBurn
    ) internal {
        // => sent erc20 to 0x00, issue legalTokens
        uint256 tokensPerShare = legalToProperty[_legalToken]
            .tokensPerLegalShares;
        if (_WlegalSharesToBurn % tokensPerShare != 0) {
            revert MustBeWholeNumber();
        }

        IERC20(_WLegalToken).transferFrom(
            _msgSender(),
            address(0x00),
            _WlegalSharesToBurn
        );
        uint256 legalTokensToUnlock = _WlegalSharesToBurn / tokensPerShare;
        IERC3643(_WLegalToken).transferFrom(
            _WLegalToken,
            _msgSender(),
            legalTokensToUnlock
        );

        legalToProperty[_legalToken].lockedLegalShares -= legalTokensToUnlock;
    }
}
