// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

//CHange transferFrom to SafeTransferfrom

//import "./Interface/IERC3643.sol";
import "./IToken.sol";
import "./Create3.sol";
//import "./propertyToken.sol";
import "./IPropertyToken.sol";
//import "contracts/ERC3643/contracts/roles/IAgentRoleUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";
import "./ERC3643/contracts/factory/ITREXFactory.sol";
import "./IRentShare.sol";

//import "/contracts/token/ERC3643.sol";

error notEoughLiquidity();
error invalidToken();
error OnlyAdminRole();
error PropertyAlreadyExist();
error ZeroAddress();
error MustBeGreaterThanZero();
error totalMustBeGreaterThanToLock();
error PropertyDoesNotExist();
error ExceedTotalLegalShares();
error MustBeWholeNumber();
error MissMatch();

contract Marketplace is Context, AccessControl {
    event newERC3643(address legaltoken);
    event priceUpdated(address token, uint256 price);
    struct property {
        address WLegalShares;
        uint256 totalLegalShares;
        uint256 lockedLegalShares;
        uint256 tokensPerLegalShares;
    }

    //bytes ERC3643Bytecode;
    address TREXFACTORY;
    bytes propertyTokenBytecode;
    address stableCoin;
    mapping(address => property) public legalToProperty;
    mapping(bytes => bool) salts;
    mapping(address => uint256) public tokenPrice;
    mapping(address => bool) public tokenExisits;
    mapping(address => uint256) public WLegalToPoolId;

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdminRole();
        }
        _;
    }

    constructor(address _stableCoin) {
        stableCoin = _stableCoin;
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
        uint256 _totalLegalShares,
        uint256 _price
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
                IToken(_legalToken).name(),
                IToken(_legalToken).symbol()
            )
        );

        WLegalShares = _createContract(salt, bytecode);

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
        updatePrice(WLegalShares, _price);
        tokenExisits[WLegalShares] = true;
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
        //do I have to loop and iter and delete
        //delete tokenToOwnership[_Property.WLegalShares];
    }

    // @notice burn partial WLegalTokens and unlock legal tokens
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _WlegalSharesToBurn - How many shares you want to burn and unlock LegalTokens.
    function unlockParialLegal(
        address _legalToken,
        uint256 _WlegalSharesToBurn
    ) external onlyAdmin {
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
        _lockAndMint(
            _legalToken,
            _WLegalToken,
            _legalSharesToLock,
            legalToProperty[_legalToken].tokensPerLegalShares
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
        uint256 balanceBefore = IToken(_legalToken).balanceOf(_WLegalToken);
        IToken(_legalToken).transferFrom(
            _msgSender(),
            _WLegalToken,
            _legalSharesToLock
        );

        uint256 balanceAfter = IToken(_legalToken).balanceOf(_WLegalToken);
        if (!((balanceAfter - balanceBefore) == _legalSharesToLock)) {
            revert MissMatch();
        }

        uint256 _tokenToMint = _tokensPerLegalShares * _legalSharesToLock;

        IPropertyToken(_WLegalToken).mint(address(this), _tokenToMint);

        legalToProperty[_legalToken].lockedLegalShares += _legalSharesToLock;
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
        IToken(_WLegalToken).transferFrom(
            _WLegalToken,
            _msgSender(),
            legalTokensToUnlock
        );
        legalToProperty[_legalToken].lockedLegalShares -= legalTokensToUnlock;
        if (legalToProperty[_legalToken].lockedLegalShares == 0) {
            delete legalToProperty[_legalToken];
            delete tokenPrice[legalToProperty[_legalToken].WLegalShares];
            delete tokenExisits[legalToProperty[_legalToken].WLegalShares];
        }
    }

    function _createContract(
        bytes32 _salt,
        bytes memory _contractCode
    ) internal returns (address payable _contract) {
        assembly {
            let p := add(_contractCode, 0x20)
            let n := mload(_contractCode)
            _contract := create2(0, p, n, _salt)
            if iszero(extcodesize(_contract)) {
                revert(0, 0)
            }
        }
    }

    //Also have to add the WLegalTokenToPoolId mapping
    //We have to make sure that the supply is minted to the marketplace contract for that to actually work.
    //Remove this function as it is just for testing
    function addTesting(
        address _RentShareContacts,
        address _WLegalToken,
        uint256 _tokenPrice,
        uint256 _RewardTokenPerBlock
    ) external {
        tokenPrice[_WLegalToken] = _tokenPrice;
        tokenExisits[_WLegalToken] = true;
        WLegalToPoolId[_WLegalToken] = IStakingManager(_RentShareContacts)
            .createPool(IERC20(_WLegalToken), _RewardTokenPerBlock);
    }

    function viewWLegalToPoolId(
        address _WLegalToken
    ) public view returns (uint256) {
        return WLegalToPoolId[_WLegalToken];
    }

    function buy(address _WLegalToken, uint256 _amount) external {
        if (!tokenExisits[_WLegalToken]) {
            revert invalidToken();
        }
        if (IERC20(_WLegalToken).balanceOf(address(this)) < _amount) {
            revert notEoughLiquidity();
        }
        if (_amount % 1 != 0) {
            revert MustBeWholeNumber();
        }
        uint256 priceInStablecoin = _amount * tokenPrice[_WLegalToken];
        IERC20(stableCoin).transferFrom(
            msg.sender,
            address(this),
            priceInStablecoin
        );
        IERC20(_WLegalToken).transfer(msg.sender, _amount);
    }

    function sell(address _WLegalToken, uint256 _amount) external {
        if (!tokenExisits[_WLegalToken]) {
            revert invalidToken();
        }
        if (IERC20(_WLegalToken).balanceOf(msg.sender) < _amount) {
            revert notEoughLiquidity();
        }
        if (_amount % 1 != 0) {
            revert MustBeWholeNumber();
        }
        IERC20(_WLegalToken).transferFrom(msg.sender, address(this), _amount);
        IERC20(stableCoin).transfer(
            msg.sender,
            _amount * tokenPrice[_WLegalToken]
        );
    }

    function updatePrice(address _token, uint256 _price) public onlyAdmin {
        if (_price < 0) {
            revert MustBeGreaterThanZero();
        }
        tokenPrice[_token] = _price;
        emit priceUpdated(_token, _price);
    }
}
