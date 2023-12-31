// // SPDX-License-Identifier: Unlicense
// pragma solidity ^0.8.17;

// // import "./IRentShare.sol";
// // import "./IPropertyToken.sol";
// // import "./ERC3643/contracts/token/IToken.sol";
// // import "./ERC3643/contracts/factory/ITREXFactory.sol";
// import "@openzeppelin/contracts/utils/Context.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// // import "@onchain-id/solidity/contracts/interface/IIdentity.sol";
// import "@onchain-id/solidity/contracts/proxy/IdentityProxy.sol";
// //import "@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol";
// // import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

// // what if I issue the tokens to the propertyManger and when property token issue token it issues those token to Marketplace.

// error notEoughLiquidity();
// error invalidToken();
// error OnlyAdminRole();
// error PropertyAlreadyExist();
// error ZeroAddress();
// error MustBeGreaterThanZero();
// error totalMustBeGreaterThanToLock();
// error PropertyDoesNotExist();
// error ExceedTotalLegalShares();
// error MustBeWholeNumber();
// error MissMatch();
// error MustBeGreaterThenAmount();

// contract Marketplace is Context, AccessControl {
//     using SafeERC20 for IERC20;

//     event newERC3643(address legaltoken);
//     event newPropertyAdded(address legalToken, address WLegalToken);
//     event priceUpdated(address token, uint256 price);
//     event newIdentity(address Identity);
//     event newBid(
//         address token,
//         address bidder,
//         uint256 amount,
//         uint256 amountPerToken
//     );
//     event newAsk(
//         address token,
//         address offerer,
//         uint256 amount,
//         uint256 amountPerToken
//     );
//     struct property {
//         address WLegalShares;
//         uint256 totalLegalShares;
//         uint256 lockedLegalShares;
//         uint256 tokensPerLegalShares;
//     }
//     struct offer {
//         uint256 amount;
//         uint256 amountPerToken;
//     }

//     //bytes ERC3643Bytecode;
//     uint256 poolId;
//     address TREXFACTORY;
//     bytes propertyTokenBytecode;
//     address stableCoin;
//     address stakingContract;
//     mapping(address => property) public legalToProperty;
//     mapping(bytes => bool) salts;
//     mapping(address => uint256) public tokenPrice;
//     mapping(address => bool) public tokenExisits;
//     mapping(address => uint256) public WLegalToPoolId;
//     mapping(address => address) public legalToIdentity;
//     mapping(address => address[]) bidder;
//     mapping(address => mapping(address => offer)) public buyOffers;
//     mapping(address => address[]) offerors;
//     mapping(address => mapping(address => offer)) public sellOffers;
//     //address[] bidder;
//     //address[] offeror;

//     //---------------------------------------------------------------

//     modifier onlyAdmin() {
//         if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
//             revert OnlyAdminRole();
//         }
//         _;
//     }

//     constructor(
//         address _stableCoin,
//         address _stakingContract,
//         bytes memory _propertyTokenBytecode
//     ) {
//         stableCoin = _stableCoin;
//         stakingContract = _stakingContract;
//         propertyTokenBytecode = _propertyTokenBytecode;
//         _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
//     }

//     // function callIdentity(
//     //     address _identity,
//     //     bytes memory _data
//     // ) external onlyAdmin {
//     //     (bool success, ) = _identity.call(_data);
//     //     require(success, "tx failed!");
//     // }

//     // function createIdentity() external onlyAdmin {
//     //     Identity identity = new Identity(address(this), true);
//     //     ImplementationAuthority implementation = new ImplementationAuthority(
//     //         address(identity)
//     //     );
//     //     IdentityProxy proxy = new IdentityProxy(
//     //         address(implementation),
//     //         address(this)
//     //     );

//     //     emit newIdentity(address(proxy));
//     // }

//     // /// @notice Wrapped Legal token to Pool Id
//     // /// @param _WLegalToken Wrapped Legal Token Address
//     // function viewWLegalToPoolId(
//     //     address _WLegalToken
//     // ) external view returns (uint256) {
//     //     return WLegalToPoolId[_WLegalToken];
//     // }

//     // /// @notice return the wrapped ERC20 token address
//     // /// @param _legalToken ERC3643 address
//     // function LegalToWLegal(
//     //     address _legalToken
//     // ) external view returns (address) {
//     //     return legalToProperty[_legalToken].WLegalShares;
//     // }

//     // //@question: how to check if the contract is really erc3643 and admin is not millicious and using erc20 contract address
//     // /// @notice Deploys the Wrapped Legal contract.
//     // /// @param _legalToken - The address of the legal Token contract aka ERC3643.
//     // /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
//     // /// @param _tokensPerLegalShares - Ratio of LegalERC3643:WrappedERC20, e.g 1:100
//     // /// @param _price - Price per token of wrapped token.
//     // /// @param _RewardTokenPerBlock - number of tokens per block as a reward for rentShare.
//     // /// @return WLegalShares - Address of the Wrapped Legal Token, i.e ERC20
//     // function addProperty(
//     //     address _legalToken,
//     //     uint256 _legalSharesToLock,
//     //     uint256 _tokensPerLegalShares,
//     //     uint256 _totalLegalShares,
//     //     uint256 _price,
//     //     uint256 _RewardTokenPerBlock
//     // ) external onlyAdmin returns (address WLegalShares) {
//     //     if (legalToProperty[_legalToken].WLegalShares != address(0x00)) {
//     //         revert PropertyAlreadyExist();
//     //     }
//     //     if (_legalToken == address(0x00)) {
//     //         revert ZeroAddress();
//     //     }
//     //     if (_legalSharesToLock < 0 || _tokensPerLegalShares < 0) {
//     //         revert MustBeGreaterThanZero();
//     //     }
//     //     if (_totalLegalShares < _legalSharesToLock) {
//     //         revert totalMustBeGreaterThanToLock();
//     //     }
//     //     if (_price < 0) {
//     //         revert MustBeGreaterThanZero();
//     //     }

//     //     bytes32 salt = keccak256(abi.encodePacked(_legalToken));
//     //     //bytes memory creationCode = type(PropertyToken).creationCode;

//     //     bytes memory bytecode = abi.encodePacked(
//     //         propertyTokenBytecode,
//     //         //type(PropertyToken2).bytecode,
//     //         abi.encode(
//     //             address(this),
//     //             stakingContract,
//     //             poolId,
//     //             IToken(_legalToken).name(),
//     //             IToken(_legalToken).symbol()
//     //         )
//     //     );

//     //     WLegalShares = _createContract(salt, bytecode);

//     //     _lockAndMint(
//     //         _legalToken,
//     //         WLegalShares,
//     //         _legalSharesToLock,
//     //         _tokensPerLegalShares
//     //     );

//     //     legalToProperty[_legalToken] = property(
//     //         WLegalShares,
//     //         _totalLegalShares,
//     //         _legalSharesToLock,
//     //         _tokensPerLegalShares
//     //     );
//     //     updatePrice(WLegalShares, _price);
//     //     tokenExisits[WLegalShares] = true;
//     //     WLegalToPoolId[WLegalShares] = IStakingManager(stakingContract)
//     //         .createPool(IERC20(WLegalShares), _RewardTokenPerBlock);
//     //     assert(WLegalToPoolId[WLegalShares] == poolId);
//     //     poolId += 1;
//     //     emit newPropertyAdded(_legalToken, WLegalShares);
//     // }

//     // /// @notice To unlock all legal shares and burn all WlegalTokens
//     // /// @param _legalToken - The address of the legal Token contract aka ERC3643.
//     // function removeProperty(address _legalToken) external onlyAdmin {
//     //     property memory _Property = legalToProperty[_legalToken];
//     //     if (_Property.WLegalShares == address(0x00)) {
//     //         revert PropertyDoesNotExist();
//     //     }
//     //     _burnAndUnlock(
//     //         _legalToken,
//     //         _Property.WLegalShares,
//     //         //_Property.totalLegalShares * _Property.tokensPerLegalShares
//     //         IERC20(_Property.WLegalShares).totalSupply()
//     //     );
//     //     //do I have to loop and iter and delete
//     //     //delete tokenToOwnership[_Property.WLegalShares];
//     // }

//     // /// @notice burn partial WLegalTokens and unlock legal tokens
//     // /// @param _legalToken - The address of the legal Token contract aka ERC3643.
//     // /// @param _LegalSharesToUnlock - How many shares you want to burn and unlock LegalTokens.
//     // function unlockParialLegal(
//     //     address _legalToken,
//     //     uint256 _LegalSharesToUnlock
//     // ) external onlyAdmin {
//     //     address WLegalShares = legalToProperty[_legalToken].WLegalShares;
//     //     if (WLegalShares == address(0x00)) {
//     //         revert PropertyDoesNotExist();
//     //     }

//     //     _burnAndUnlock(
//     //         _legalToken,
//     //         WLegalShares,
//     //         _LegalSharesToUnlock *
//     //             legalToProperty[_legalToken].tokensPerLegalShares
//     //     );
//     //     legalToProperty[_legalToken].lockedLegalShares -= _LegalSharesToUnlock;
//     // }

//     // /// @notice To lock more Legal tokens and Mint WLegal tokens.
//     // /// @param _legalToken - The address of the legal Token contract aka ERC3643.
//     // /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
//     // function addMoreWLegalTokens(
//     //     address _legalToken,
//     //     uint256 _legalSharesToLock
//     // ) external onlyAdmin {
//     //     if (legalToProperty[_legalToken].WLegalShares == address(0x00)) {
//     //         revert PropertyDoesNotExist();
//     //     }
//     //     if (
//     //         legalToProperty[_legalToken].totalLegalShares <
//     //         legalToProperty[_legalToken].lockedLegalShares + _legalSharesToLock
//     //     ) {
//     //         revert ExceedTotalLegalShares();
//     //     }
//     //     if (_legalSharesToLock < 0) {
//     //         revert MustBeGreaterThanZero();
//     //     }
//     //     _lockAndMint(
//     //         _legalToken,
//     //         legalToProperty[_legalToken].WLegalShares,
//     //         _legalSharesToLock
//     //     );

//     //     legalToProperty[_legalToken].lockedLegalShares += _legalSharesToLock;
//     // }

//     // /// @notice Lock legal token and mint wrapped tokens, when want to add more tokens.
//     // /// @param _legalToken - The address of the legal Token contract aka ERC3643.
//     // /// @param _WLegalToken - wrapped Legal tokens i.e ERC20 token with locked ERC3643.
//     // /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
//     // function _lockAndMint(
//     //     address _legalToken,
//     //     address _WLegalToken,
//     //     uint256 _legalSharesToLock
//     // ) internal {
//     //     _lockAndMint(
//     //         _legalToken,
//     //         _WLegalToken,
//     //         _legalSharesToLock,
//     //         legalToProperty[_legalToken].tokensPerLegalShares
//     //     );
//     // }

//     // /// @notice Lock legal token and mint wrapped tokens.
//     // /// @param _legalToken - The address of the legal Token contract aka ERC3643.
//     // /// @param _WLegalToken - wrapped Legal tokens i.e ERC20 token with locked ERC3643.
//     // /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
//     // /// @param _tokensPerLegalShares - Ratio of LegalERC3643:WrappedERC20, e.g 1:100
//     // function _lockAndMint(
//     //     address _legalToken,
//     //     address _WLegalToken,
//     //     uint256 _legalSharesToLock,
//     //     uint256 _tokensPerLegalShares
//     // ) internal {
//     //     IERC20(_legalToken).safeTransferFrom(
//     //         _msgSender(),
//     //         address(this),
//     //         _legalSharesToLock
//     //     );

//     //     uint256 _tokenToMint = _tokensPerLegalShares * _legalSharesToLock;
//     //     console.log("minted ========> ", _tokenToMint / 1e18);

//     //     IPropertyToken(_WLegalToken).mint(address(this), _tokenToMint);

//     //     legalToProperty[_legalToken].lockedLegalShares += _legalSharesToLock;
//     // }

//     // /// @notice burn WLegal(ERC20) and unlock legal tokens
//     // /// @param _legalToken - The address of the legal Token contract aka ERC3643.
//     // /// @param _WLegalToken - wrapped Legal tokens i.e ERC20 token with locked ERC3643.
//     // /// @param _WlegalSharesToBurn - ERC20 tokens you want to burn and unlock Legal tokens.
//     // function _burnAndUnlock(
//     //     address _legalToken,
//     //     address _WLegalToken,
//     //     uint256 _WlegalSharesToBurn
//     // ) internal {
//     //     // => sent erc20 to 0x00, issue legalTokens
//     //     uint256 tokensPerShare = legalToProperty[_legalToken]
//     //         .tokensPerLegalShares;
//     //     if (_WlegalSharesToBurn % tokensPerShare != 0) {
//     //         revert MustBeWholeNumber();
//     //     }

//     //     //IERC20(_WLegalToken).safeTransfer(address(0x00), _WlegalSharesToBurn);
//     //     ERC20Burnable(_WLegalToken).burn(_WlegalSharesToBurn);
//     //     uint256 legalTokensToUnlock = _WlegalSharesToBurn / tokensPerShare;

//     //     IERC20(_legalToken).safeTransfer(_msgSender(), legalTokensToUnlock);
//     //     legalToProperty[_legalToken].lockedLegalShares -= legalTokensToUnlock;
//     //     if (legalToProperty[_legalToken].lockedLegalShares == 0) {
//     //         delete legalToProperty[_legalToken];
//     //         delete tokenPrice[legalToProperty[_legalToken].WLegalShares];
//     //         delete tokenExisits[legalToProperty[_legalToken].WLegalShares];
//     //     }
//     // }

//     // /// @notice - create2 function, for deterministic address.
//     // /// @param _salt - unique identifier
//     // /// @param _contractCode - bytecode packed along with constructor params.
//     // function _createContract(
//     //     bytes32 _salt,
//     //     bytes memory _contractCode
//     // ) internal returns (address payable _contract) {
//     //     assembly {
//     //         let p := add(_contractCode, 0x20)
//     //         let n := mload(_contractCode)
//     //         _contract := create2(0, p, n, _salt)
//     //         if iszero(extcodesize(_contract)) {
//     //             revert(0, 0)
//     //         }
//     //     }
//     // }

//     /// @notice - Buy the wrapped ERC20 token
//     /// @param _WLegalToken - Wrapped ERC20 token address
//     /// @param _amount - Amount in stablecoin you for which you want to buy.
//     function buy(address _WLegalToken, uint256 _amount) external {
//         if (!tokenExisits[_WLegalToken]) {
//             revert invalidToken();
//         }
//         if (IERC20(_WLegalToken).balanceOf(address(this)) < _amount) {
//             revert notEoughLiquidity();
//         }
//         if (_amount % 1 != 0) {
//             revert MustBeWholeNumber();
//         }
//         uint256 priceInStablecoin = _amount * tokenPrice[_WLegalToken];
//         IERC20(stableCoin).safeTransferFrom(
//             msg.sender,
//             address(this),
//             priceInStablecoin
//         );

//         IERC20(_WLegalToken).safeTransfer(msg.sender, _amount);
//     }

//     /// @notice - Sell the wrapped ERC20 token
//     /// @param _WLegalToken - Wrapped ERC20 token address
//     /// @param _amount - Amount of Wrapped Token you want to sell
//     function sell(address _WLegalToken, uint256 _amount) external {
//         if (!tokenExisits[_WLegalToken]) {
//             revert invalidToken();
//         }
//         if (IERC20(_WLegalToken).balanceOf(msg.sender) < _amount) {
//             revert notEoughLiquidity();
//         }
//         if (_amount % 1 != 0) {
//             revert MustBeWholeNumber();
//         }
//         IERC20(_WLegalToken).safeTransferFrom(
//             msg.sender,
//             address(this),
//             _amount
//         );
//         IERC20(stableCoin).safeTransfer(
//             msg.sender,
//             _amount * tokenPrice[_WLegalToken]
//         );
//     }

//     /// @notice - update the price of token
//     /// @param _token - address of the wrapped Erc20 Token
//     /// @param _price - price you want to set. must be greater then zero.
//     function updatePrice(address _token, uint256 _price) public onlyAdmin {
//         if (_price < 0) {
//             revert MustBeGreaterThanZero();
//         }
//         tokenPrice[_token] = _price;
//         emit priceUpdated(_token, _price);
//     }

//     // // Create a buy offer for a specified token
//     // function createBuyOffer(
//     //     address _token,
//     //     uint256 _amount,
//     //     uint256 _amountPerTokenToBid
//     // ) public {
//     //     if (!tokenExisits[_token]) {
//     //         revert invalidToken();
//     //     }
//     //     uint256 totalAmount = _amount * _amountPerTokenToBid;

//     //     if (IERC20(stableCoin).balanceOf(msg.sender) < totalAmount) {
//     //         revert MustBeGreaterThenAmount();
//     //     }
//     //     if (
//     //         IERC20(stableCoin).allowance(msg.sender, address(this)) <
//     //         totalAmount
//     //     ) {
//     //         revert MustBeGreaterThenAmount();
//     //     }

//     //     buyOffers[_token][msg.sender] = offer(_amount, _amountPerTokenToBid);
//     //     bidder[_token].push(msg.sender);
//     //     emit newBid(_token, msg.sender, _amount, _amountPerTokenToBid);
//     // }

//     // Create a buy offer for a specified token
//     // function createSellOffer(
//     //     address _token,
//     //     uint256 _amount,
//     //     uint256 _amountPerTokenToAsk
//     // ) public {
//     //     if (!tokenExisits[_token]) {
//     //         revert invalidToken();
//     //     }
//     //     if (IERC20(_token).balanceOf(msg.sender) < _amount) {
//     //         revert MustBeGreaterThenAmount();
//     //     }
//     //     if (IERC20(_token).allowance(msg.sender, address(this)) < _amount) {
//     //         revert MustBeGreaterThenAmount();
//     //     }
//     //     sellOffers[_token][msg.sender] = offer(_amount, _amountPerTokenToAsk);
//     //     offerors[_token].push(msg.sender);
//     //     emit newAsk(_token, msg.sender, _amount, _amountPerTokenToAsk);
//     // }

//     // View all buy offers for a specified token
//     // function viewBuyOffers(
//     //     address _token
//     // )
//     //     public
//     //     view
//     //     returns (address[] memory BidderAddresses, offer[] memory offers)
//     // {
//     //     BidderAddresses = new address[](0);
//     //     offers = new offer[](0);
//     //     for (uint256 i; i < bidder[_token].length; i++) {
//     //         BidderAddresses[i] = bidder[_token][i];
//     //         offers[i] = (buyOffers[_token][bidder[_token][i]]);
//     //     }
//     // }

//     // View all sell offers for a specified token
//     // function viewSellOffers(
//     //     address _token
//     // )
//     //     public
//     //     view
//     //     returns (address[] memory sellerAddresses, offer[] memory offers)
//     // {
//     //     sellerAddresses = new address[](0);
//     //     offers = new offer[](0);
//     //     for (uint256 i; i < offerors[_token].length; i++) {
//     //         sellerAddresses[i] = offerors[_token][i];
//     //         offers[i] = (sellOffers[_token][offerors[_token][i]]);
//     //     }
//     // }

//     // Buy an offer for a specified token
//     // function buyOffer(address _token, address _seller, uint256 _amount) public {
//     //     if (!tokenExisits[_token]) {
//     //         revert invalidToken();
//     //     }

//     //     uint256 _amountPerToken = sellOffers[_token][_seller].amountPerToken;
//     //     uint256 _amountToken = sellOffers[_token][_seller].amount;

//     //     if (sellOffers[_token][_seller].amount == _amount) {
//     //         delete sellOffers[_token][_seller];
//     //         for (uint256 i; i < offerors[_token].length; i++) {
//     //             if (offerors[_token][i] == _seller) {
//     //                 delete offerors[_token][i];
//     //             }
//     //         }
//     //         IERC20(stableCoin).safeTransferFrom(
//     //             msg.sender,
//     //             _seller,
//     //             _amount * _amountPerToken
//     //         );
//     //         IERC20(_token).safeTransferFrom(_seller, msg.sender, _amount);
//     //     } else if (sellOffers[_token][_seller].amount > _amount) {
//     //         sellOffers[_token][_seller].amount -= _amount;

//     //         IERC20(stableCoin).safeTransferFrom(
//     //             msg.sender,
//     //             _seller,
//     //             _amount * sellOffers[_token][_seller].amountPerToken
//     //         );
//     //         IERC20(_token).safeTransferFrom(_seller, msg.sender, _amount);
//     //     } else if (sellOffers[_token][_seller].amount < _amount) {
//     //         delete sellOffers[_token][_seller];
//     //         for (uint256 i; i < offerors[_token].length; i++) {
//     //             if (offerors[_token][i] == _seller) {
//     //                 delete offerors[_token][i];
//     //             }
//     //         }
//     //         IERC20(stableCoin).safeTransferFrom(
//     //             msg.sender,
//     //             _seller,
//     //             sellOffers[_token][_seller].amount * _amountPerToken
//     //         );
//     //         IERC20(_token).safeTransferFrom(
//     //             _seller,
//     //             msg.sender,
//     //             _amount - _amountToken
//     //         );
//     //     }
//     // }

//     // function sellOffer(address _token, address _buyer, uint256 _amount) public {
//     //     if (!tokenExisits[_token]) {
//     //         revert invalidToken();
//     //     }

//     //     uint256 _amountPerToken = buyOffers[_token][_buyer].amountPerToken;
//     //     uint256 _amountToken = buyOffers[_token][_buyer].amount;

//     //     if (buyOffers[_token][_buyer].amount == _amount) {
//     //         delete buyOffers[_token][_buyer];
//     //         for (uint256 i; i < offerors[_token].length; i++) {
//     //             if (offerors[_token][i] == _buyer) {
//     //                 delete offerors[_token][i];
//     //             }
//     //         }
//     //         IERC20(_token).safeTransferFrom(msg.sender, _buyer, _amount);
//     //         IERC20(stableCoin).safeTransferFrom(
//     //             _buyer,
//     //             msg.sender,
//     //             _amount * _amountPerToken
//     //         );
//     //     } else if (buyOffers[_token][_buyer].amount > _amount) {
//     //         buyOffers[_token][_buyer].amount -= _amount;

//     //         IERC20(_token).safeTransferFrom(msg.sender, _buyer, _amount);
//     //         IERC20(stableCoin).safeTransferFrom(
//     //             _buyer,
//     //             msg.sender,
//     //             _amount * buyOffers[_token][_buyer].amountPerToken
//     //         );
//     //     } else if (buyOffers[_token][_buyer].amount < _amount) {
//     //         delete buyOffers[_token][_buyer];
//     //         for (uint256 i; i < offerors[_token].length; i++) {
//     //             if (offerors[_token][i] == _buyer) {
//     //                 delete offerors[_token][i];
//     //             }
//     //         }
//     //         IERC20(_token).safeTransferFrom(msg.sender, _buyer, _amount);
//     //         IERC20(stableCoin).safeTransferFrom(
//     //             _buyer,
//     //             msg.sender,
//     //             buyOffers[_token][_buyer].amount * _amountPerToken
//     //         );
//     //     }
//     // }
// }

