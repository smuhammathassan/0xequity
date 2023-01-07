// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;
import "hardhat/console.sol";
import "./Interface/IMarketplace.sol";
import "./Interface/IRentShare.sol";
import "./Interface/IPropertyToken.sol";
import "./Interface/IPriceFeed.sol";
import "./ERC3643/contracts/token/IToken.sol";
import "./ERC3643/contracts/factory/ITREXFactory.sol";
import "./Interface/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IFinder} from "./Interface/IFinder.sol";
import {ZeroXInterfaces} from "./constants.sol";

contract Marketplace is IMarketplace, Context, AccessControl {
    using SafeERC20 for IERC20;

    //bytes ERC3643Bytecode;
    uint256 identityCount;
    uint256 poolId;
    //address TREXFACTORY;
    // bytes propertyTokenBytecode;
    // bytes identityBytecode;
    // bytes IAbytecode;
    // bytes IPBytecode;
    //address stakingContract;
    address finder;
    //address priceFeedContract;
    address identity;
    address IAuthority;
    // bool onceInit;
    mapping(address => property) public legalToProperty;
    mapping(bytes => bool) salts;
    mapping(address => uint256) public tokenPrice;
    mapping(address => bool) public tokenExisits;
    mapping(address => uint256) public WLegalToPoolId;
    mapping(address => address) public legalToIdentity;
    // mapping(address => address[]) bidder;
    // mapping(address => mapping(address => offer)) public buyOffers;
    // mapping(address => address[]) offerors;
    // mapping(address => mapping(address => offer)) public sellOffers;
    mapping(address => mapping(address => uint256)) public wlegalToTokens;

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdminRole();
        }
        _;
    }

    constructor(address _finder) {
        if (_finder == address(0)) {
            revert ZeroAddress();
        }
        finder = _finder;
        bytes32 salt = keccak256(abi.encodePacked(msg.sender));
        bytes memory Identitybytecode = abi.encodePacked(
            IFinder(finder).getImplementationBytecode(ZeroXInterfaces.Identity),
            abi.encode(address(this), true)
        );
        identity = _createContract(salt, Identitybytecode);

        bytes memory impAuthbytecode = abi.encodePacked(
            IFinder(finder).getImplementationBytecode(
                ZeroXInterfaces.ImplementationAuthority
            ),
            abi.encode(identity)
        );
        IAuthority = _createContract(salt, impAuthbytecode);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // function createOnce(
    //     bytes memory _propertyTokenBytecode,
    //     bytes memory _identityBytecode,
    //     bytes memory _IAbytecode,
    //     bytes memory _IPBytecode
    // ) external onlyAdmin {
    //     require(!onceInit, "Already initialized");
    //     if (_propertyTokenBytecode.length == 0) {
    //         revert EmptyBytecode();
    //     }
    //     if (_identityBytecode.length == 0) {
    //         revert EmptyBytecode();
    //     }
    //     if (_IAbytecode.length == 0) {
    //         revert EmptyBytecode();
    //     }
    //     if (_IPBytecode.length == 0) {
    //         revert EmptyBytecode();
    //     }
    //     propertyTokenBytecode = _propertyTokenBytecode;
    //     identityBytecode = _identityBytecode;
    //     IAbytecode = _IAbytecode;
    //     IPBytecode = _IPBytecode;

    //     onceInit = true;
    // }

    function callIdentity(address _identity, bytes memory _data)
        external
        onlyAdmin
    {
        (bool success, ) = _identity.call(_data);
        require(success, "tx failed!");
    }

    function adminTransferToken(
        address _wlegalToken,
        address _to,
        uint256 _amount
    ) external onlyAdmin {
        if (tokenExisits[_wlegalToken]) {
            revert invalidToken();
        }
        IERC20(_wlegalToken).safeTransfer(_to, _amount);
    }

    function getTokenLiquidity(address _wlegalToken, address _token)
        external
        view
        returns (uint256)
    {
        return wlegalToTokens[_wlegalToken][_token];
    }

    function withdrawLiquidity(
        address _wlegalToken,
        address _token,
        address _to
    ) external onlyAdmin {
        if (wlegalToTokens[_wlegalToken][_token] == 0) {
            revert zeroBalance();
        }
        uint256 amountToSend = wlegalToTokens[_wlegalToken][_token];
        wlegalToTokens[_wlegalToken][_token] = 0;
        IERC20(_wlegalToken).safeTransfer(_to, amountToSend);
    }

    function createIdentity() external onlyAdmin {
        identityCount += 1;
        bytes32 salt = keccak256(abi.encodePacked(identityCount));

        //deploying new Identity Proxy.
        bytes memory IPbytecode = abi.encodePacked(
            IFinder(finder).getImplementationBytecode(
                ZeroXInterfaces.IdentityProxy
            ),
            abi.encode(IAuthority, address(this))
        );
        address IdentityProxy = _createContract(salt, IPbytecode);

        emit newIdentity(address(IdentityProxy));
    }

    /// @notice Wrapped Legal token to Pool Id
    /// @param _WLegalToken Wrapped Legal Token Address
    function viewWLegalToPoolId(address _WLegalToken)
        external
        view
        returns (uint256)
    {
        return WLegalToPoolId[_WLegalToken];
    }

    /// @notice return the wrapped ERC20 token address
    /// @param _legalToken ERC3643 address
    function LegalToWLegal(address _legalToken)
        external
        view
        returns (address)
    {
        return legalToProperty[_legalToken].WLegalShares;
    }

    //TODO: remove total legal shares as input fetch the total supply instead
    //@question: how to check if the contract is really erc3643 and admin is not millicious and using erc20 contract address
    /// @notice Deploys the Wrapped Legal contract.
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
    /// @param _tokensPerLegalShares - Ratio of LegalERC3643:WrappedERC20, e.g 1:100
    /// @param _RewardTokenPerBlock - number of tokens per block as a reward for rentShare.
    /// @return WLegalShares - Address of the Wrapped Legal Token, i.e ERC20
    function addProperty(
        address _legalToken,
        uint256 _legalSharesToLock,
        uint256 _tokensPerLegalShares,
        uint256 _totalLegalShares,
        IPriceFeed.Property calldata _propertyDetails,
        uint256 _RewardTokenPerBlock
    ) external onlyAdmin returns (address WLegalShares) {
        if (legalToProperty[_legalToken].WLegalShares != address(0x00)) {
            revert PropertyAlreadyExist();
        }
        if (_legalToken == address(0x00)) {
            revert ZeroAddress();
        }
        if (_legalSharesToLock <= 0 || _tokensPerLegalShares <= 0) {
            revert MustBeGreaterThanZero();
        }
        if (_totalLegalShares < _legalSharesToLock) {
            revert totalMustBeGreaterThanToLock();
        }
        if (_propertyDetails.price <= 0) {
            revert MustBeGreaterThanZero();
        }

        bytes32 salt = keccak256(abi.encodePacked(_legalToken));
        //bytes memory creationCode = type(PropertyToken).creationCode;
        address rentShare = IFinder(finder).getImplementationAddress(
            ZeroXInterfaces.RentShare
        );
        bytes memory bytecode = abi.encodePacked(
            IFinder(finder).getImplementationBytecode(
                ZeroXInterfaces.PropertyToken
            ),
            abi.encode(
                address(this),
                rentShare,
                poolId,
                string.concat("W", bytes(IToken(_legalToken).name())),
                string.concat("W", bytes(IToken(_legalToken).symbol())),
                0
            )
        );

        WLegalShares = _createContract(salt, bytecode);
        WLegalToPoolId[WLegalShares] = IStakingManager(rentShare).createPool(
            IERC20(WLegalShares),
            _RewardTokenPerBlock
        );

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
        //updatePrice(WLegalShares, _price);
        //tokenPrice[WLegalShares] = _price;
        IPriceFeed(
            IFinder(finder).getImplementationAddress(ZeroXInterfaces.PriceFeed)
        ).setPropertyDetails(WLegalShares, _propertyDetails);

        tokenExisits[WLegalShares] = true;

        assert(WLegalToPoolId[WLegalShares] == poolId);
        poolId += 1;
        emit newPropertyAdded(_legalToken, WLegalShares);
    }

    /// @notice To unlock all legal shares and burn all WlegalTokens
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    function removeProperty(address _legalToken) external onlyAdmin {
        property memory _Property = legalToProperty[_legalToken];
        if (_Property.WLegalShares == address(0x00)) {
            revert PropertyDoesNotExist();
        }
        _burnAndUnlock(
            _legalToken,
            _Property.WLegalShares,
            //_Property.totalLegalShares * _Property.tokensPerLegalShares
            IERC20(_Property.WLegalShares).totalSupply()
        );
        //do I have to loop and iter and delete
        //delete tokenToOwnership[_Property.WLegalShares];
    }

    /// @notice burn partial WLegalTokens and unlock legal tokens
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _LegalSharesToUnlock - How many shares you want to burn and unlock LegalTokens.
    function unlockParialLegal(
        address _legalToken,
        uint256 _LegalSharesToUnlock
    ) external onlyAdmin {
        address WLegalShares = legalToProperty[_legalToken].WLegalShares;
        if (WLegalShares == address(0x00)) {
            revert PropertyDoesNotExist();
        }

        _burnAndUnlock(
            _legalToken,
            WLegalShares,
            _LegalSharesToUnlock *
                legalToProperty[_legalToken].tokensPerLegalShares
        );
        legalToProperty[_legalToken].lockedLegalShares -= _LegalSharesToUnlock;
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
        IERC20(_legalToken).safeTransferFrom(
            _msgSender(),
            address(this),
            _legalSharesToLock * 1e18
        );

        uint256 _tokenToMint = _tokensPerLegalShares * _legalSharesToLock;
        IPropertyToken(_WLegalToken).addMinter(address(this));
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

        //IERC20(_WLegalToken).safeTransfer(address(0x00), _WlegalSharesToBurn);
        ERC20Burnable(_WLegalToken).burn(_WlegalSharesToBurn);
        uint256 legalTokensToUnlock = _WlegalSharesToBurn / tokensPerShare;

        IERC20(_legalToken).safeTransfer(
            _msgSender(),
            legalTokensToUnlock * 1e18
        );
        legalToProperty[_legalToken].lockedLegalShares -= legalTokensToUnlock;
        if (legalToProperty[_legalToken].lockedLegalShares == 0) {
            delete legalToProperty[_legalToken];
            delete tokenPrice[legalToProperty[_legalToken].WLegalShares];
            delete tokenExisits[legalToProperty[_legalToken].WLegalShares];
        }
    }

    /// @notice - create2 function, for deterministic address.
    /// @param _salt - unique identifier
    /// @param _contractCode - bytecode packed along with constructor params.
    function _createContract(bytes32 _salt, bytes memory _contractCode)
        internal
        returns (address payable _contract)
    {
        assembly {
            let p := add(_contractCode, 0x20)
            let n := mload(_contractCode)
            _contract := create2(0, p, n, _salt)
            if iszero(extcodesize(_contract)) {
                revert(0, 0)
            }
        }
    }

    //swap function
    //check if the amount of share is in whole number
    //check if the to is in the tokenExisist that means that the person is truying to buy
    //pass the valeus in the _swap function with _swap(_from, _to, _amountOfShares, true)

    function swap(swapArgs calldata args) external {
        if (args._amountOfShares % 1 != 0) {
            revert MustBeWholeNumber();
        }
        //buy
        if (tokenExisits[args._to]) {
            _swap(args._from, args._to, args._amountOfShares, true);

            //sell
        } else if (tokenExisits[args._from]) {
            if (
                !(IPriceFeed(
                    IFinder(finder).getImplementationAddress(
                        ZeroXInterfaces.PriceFeed
                    )
                ).getCurrencyToFeed(args._to) != address(0))
            ) {
                revert invalidCurrency();
            }
            _swap(args._to, args._from, args._amountOfShares, false);
        } else {
            revert invalidCase();
        }
    }

    //_swap(_from, _to, _amountOfShares, true)

    //in the swap function we would assume that the FROM is the Currency Where as _to is the propertyToken
    //we will fetch the priceFeed using the FROM
    //make sure that the currency address is not zero
    //fetch the propertyDetails and save it in _property

    function _swap(
        address _from,
        address _to,
        uint256 _amountOfShares,
        bool isBuying
    ) internal {
        address _priceFeed = IFinder(finder).getImplementationAddress(
            ZeroXInterfaces.PriceFeed
        );
        address _currencyToFeed = IPriceFeed(_priceFeed).getCurrencyToFeed(
            _from
        );

        if (!(_currencyToFeed != address(0))) {
            revert invalidCurrency();
        }

        IPriceFeed.Property memory _property = IPriceFeed(_priceFeed)
            .getPropertyDetail(_to);

        address propertyFeed = _property.priceFeed;

        if (propertyFeed == _currencyToFeed) {
            console.log("INSIDE SIMPLE BUY SELL");
            uint256 quotePrice = _amountOfShares * _property.price;
            if (isBuying) {
                wlegalToTokens[_to][_from] += quotePrice;
                IERC20(_from).safeTransferFrom(
                    msg.sender,
                    address(this),
                    quotePrice
                );
                IERC20(_to).safeTransfer(msg.sender, _amountOfShares);
                emit swaped(_from, _to, quotePrice, _amountOfShares);
            } else {
                IERC20(_to).safeTransferFrom(
                    msg.sender,
                    address(this),
                    _amountOfShares
                );
                wlegalToTokens[_to][_from] -= quotePrice;
                IERC20(_from).safeTransfer(msg.sender, quotePrice);
                emit swaped(_to, _from, _amountOfShares, quotePrice);
            }
        } else {
            //fetching Price in Decimals, Getting price for the quote Currency,
            // uint8 _fromDecimals = ;
            // uint8 _toDecimals = ;
            //going for the biggest decimal to make sure we don't lose precision.

            // uint256 price = uint256(
            //     IPriceFeed(priceFeedContract).getDerivedPrice(
            //         _property.priceFeed, //base
            //         _currencyToFeed, //Quote return => base/Quote
            //         AggregatorV3Interface(_from).decimals() >
            //             AggregatorV3Interface(_to).decimals()
            //             ? AggregatorV3Interface(_from).decimals()
            //             : AggregatorV3Interface(_to).decimals()
            //     )
            // );

            // uint256 AquotePrice = ((_amountOfShares * _property.price) /
            //     price) * 10**IERC20Metadata(isBuying ? _from : _to).decimals();
            // console.log("AquotePrice =>", AquotePrice);

            //Price I am getting is in TRY/EUR
            //if the exchange rate is 0.12 TRY/EUR, this means that you can exchange 1 Euro for 0.12 Turkish Lira.
            // price = TRY/EUR
            // EUR * PRICE = TRY, EUR = TRY/PRICE
            //jEruo/try
            //(price in EUR / EUR/USD) * (TRY/USD)
            uint256 PropertyFEEED = IPriceFeed(_priceFeed).peakyBlinder(
                propertyFeed
            );

            uint256 otherFeed = IPriceFeed(_priceFeed).peakyBlinder(
                _currencyToFeed
            );

            uint256 quotePrice = ((_property.price * _amountOfShares) /
                PropertyFEEED) * otherFeed;

            console.log("PropertyFeed => ", PropertyFEEED);
            console.log("OtherFeed => ", otherFeed);

            // uint256 quotePrice = ((_amountOfShares * _property.price) / price) *
            //     10 ** IERC20Metadata(isBuying ? _from : _to).decimals();

            // uint256 quotePrice = (((_amountOfShares) * 10 ** _toDecimals) /
            //     price) * 10 ** IERC20Metadata(_from).decimals();
            console.log("QuotePrice 2=> ", quotePrice);

            if (isBuying) {
                wlegalToTokens[_to][_from] += quotePrice;

                if (IERC20Metadata(_from).decimals() != 18) {
                    quotePrice =
                        quotePrice /
                        10**(18 - IERC20Metadata(_from).decimals());
                }

                IERC20(_from).safeTransferFrom(
                    msg.sender,
                    address(this),
                    quotePrice
                );
                IERC20(_to).safeTransfer(msg.sender, _amountOfShares);
                emit swaped(_from, _to, quotePrice, _amountOfShares);
            } else {
                wlegalToTokens[_to][_from] -= quotePrice;
                if (IERC20Metadata(_to).decimals() != 18) {
                    quotePrice =
                        quotePrice /
                        10**(18 - IERC20Metadata(_from).decimals());
                }
                IERC20(_to).safeTransferFrom(
                    msg.sender,
                    address(this),
                    _amountOfShares
                );
                IERC20(_from).safeTransfer(msg.sender, quotePrice);
                emit swaped(_to, _from, _amountOfShares, quotePrice);
            }
        }
    }

    // /// @notice - Buy the wrapped ERC20 token
    // /// @param _WLegalToken - Wrapped ERC20 token address
    // /// @param _amount - Amount in stablecoin you for which you want to buy.
    // function buy(
    //     address _WLegalToken,
    //     address _currency,
    //     uint256 _amount
    // ) external {
    //     if (!tokenExisits[_WLegalToken]) {
    //         revert invalidToken();
    //     }
    //     if (IERC20(_WLegalToken).balanceOf(address(this)) < _amount) {
    //         revert notEoughLiquidity();
    //     }
    //     if (_amount % 1 != 0) {
    //         revert MustBeWholeNumber();
    //     }

    //     uint256 totalPriceInUSD = tokenPrice[_WLegalToken] * _amount;

    //     uint256 priceInCurrency = IPriceFeed().fetchPrice(
    //         _WLegalToken,
    //         _currency,
    //         _amount
    //     );

    //     //=> amount in
    //     //=> priceFrom
    //     //=> priceTo

    //     //if I have once apple its price is 5 dollars
    //     //if I have to buy 10 apples its price is 5*10 = 50
    //     //Now I have to convert this price in pkr which is 100 pkr = 1 usd
    //     //that means 50 * 100 = 5000 pkr.

    //     //I have property share per property share price is 5 * 10 ** 8
    //     //I have to buy 10 shares of property i.e 10 * 5 * 10 ** 8 = 50 * 10 ** 8
    //     //50 * 10 ** 8

    //     //base price % to Price

    //     //save price in 8 decimal jo k usd main hogi
    //     //if I have to buy even in usdc convert karn ga main.
    //     //if other then usdc so will fetch the price feed in currency/usd

    //     //if priceFeed has equal decimals(usdc case will come in this)
    //     //just simple divide amount/usdc/usd => price to ask

    //     //if priceFeed has more decimals
    //     // amount * 10 ** (toPriceFeed - from)
    //     // 10 * 10 ** (12 - 8) => 10 * 10 ** 4
    //     // 10 *

    //     IERC20(_currency).safeTransferFrom(
    //         msg.sender,
    //         address(this),
    //         priceInCurrency
    //     );
    //     console.log("BUY :: ", msg.sender);
    //     console.log("Marketplace :: ", address(this));

    //     IERC20(_WLegalToken).safeTransfer(msg.sender, _amount);
    // }

    // /// @notice - Sell the wrapped ERC20 token
    // /// @param _WLegalToken - Wrapped ERC20 token address
    // /// @param _amount - Amount of Wrapped Token you want to sell
    // function sell(address _WLegalToken, uint256 _amount) external {
    //     if (!tokenExisits[_WLegalToken]) {
    //         revert invalidToken();
    //     }
    //     console.log(
    //         "IERC20(_WLegalToken).balanceOf(msg.sender)",
    //         IERC20(_WLegalToken).balanceOf(msg.sender)
    //     );
    //     console.log("_amount", _amount);
    //     if (IERC20(_WLegalToken).balanceOf(msg.sender) < _amount) {
    //         revert notEoughLiquidity();
    //     }
    //     if (_amount % 1 != 0) {
    //         revert MustBeWholeNumber();
    //     }
    //     IERC20(_WLegalToken).safeTransferFrom(
    //         msg.sender,
    //         address(this),
    //         _amount
    //     );
    //     IERC20(stableCoin).safeTransfer(
    //         msg.sender,
    //         _amount * tokenPrice[_WLegalToken]
    //     );
    // }

    /// @notice - update the price of token
    /// @param _token - address of the wrapped Erc20 Token
    /// @param _price - price you want to set. must be greater then zero.
    function updatePrice(address _token, uint256 _price) public onlyAdmin {
        if (!tokenExisits[_token]) {
            revert invalidToken();
        }
        if (_price < 0) {
            revert MustBeGreaterThanZero();
        }
        tokenPrice[_token] = _price;
        emit priceUpdated(_token, _price);
    }

    /// @notice - view the price of the token
    /// @param _token - address of the wrapped token (ERC20)
    /// @return price of the wrapped token.
    function viewPrice(address _token) public view returns (uint256) {
        if (!tokenExisits[_token]) {
            revert invalidToken();
        }
        return tokenPrice[_token];
    }

    // // Create a buy offer for a specified token
    // function createBuyOffer(
    //     address _token,
    //     uint256 _amount, //18
    //     uint256 _amountPerTokenToBid // 18
    // ) public {
    //     if (!tokenExisits[_token]) {
    //         revert invalidToken();
    //     }
    //     uint256 totalAmount = _amount * _amountPerTokenToBid;

    //     if (IERC20(stableCoin).balanceOf(msg.sender) < totalAmount) {
    //         revert MustBeGreaterThenAmount();
    //     }
    //     if (
    //         IERC20(stableCoin).allowance(msg.sender, address(this)) <
    //         totalAmount
    //     ) {
    //         revert MustBeGreaterThenAmount();
    //     }

    //     buyOffers[_token][msg.sender] = offer(_amount, _amountPerTokenToBid);
    //     bidder[_token].push(msg.sender);
    //     emit newBid(_token, msg.sender, _amount, _amountPerTokenToBid);
    // }

    // //Create a buy offer for a specified token
    // // 100 * 1e18 / 1e6
    // // TOken A = 18
    // // TOken B = 6
    // // 100 e 18 token A.
    // // 100 e 18 * 1e6 / 1e18
    // function createSellOffer(
    //     address _token,
    //     uint256 _amount, // 100 * 1e18
    //     uint256 _amountPerTokenToAsk // 7
    // ) public {
    //     if (!tokenExisits[_token]) {
    //         revert invalidToken();
    //     }
    //     if (IERC20(_token).balanceOf(msg.sender) < _amount) {
    //         revert MustBeGreaterThenAmount();
    //     }
    //     if (IERC20(_token).allowance(msg.sender, address(this)) < _amount) {
    //         revert MustBeGreaterThenAmount();
    //     }
    //     sellOffers[_token][msg.sender] = offer(_amount, _amountPerTokenToAsk);
    //     offerors[_token].push(msg.sender);
    //     emit newAsk(_token, msg.sender, _amount, _amountPerTokenToAsk);
    // }

    //View all buy offers for a specified token
    // function viewBuyOffers(address _token)
    //     external
    //     view
    //     returns (address[] memory BidderAddresses, offer[] memory offers)
    // {
    //     BidderAddresses = new address[](0);
    //     offers = new offer[](0);
    //     for (uint256 i; i < bidder[_token].length; i++) {
    //         BidderAddresses[i] = bidder[_token][i];
    //         offers[i] = (buyOffers[_token][bidder[_token][i]]);
    //     }
    // }

    // //View all sell offers for a specified token
    // function viewSellOffers(address _token)
    //     external
    //     view
    //     returns (address[] memory sellerAddresses, offer[] memory offers)
    // {
    //     uint256 len = offerors[_token].length;
    //     console.log(
    //         "-----------------------------------------------------> ",
    //         len
    //     );
    //     if (len > 0) {
    //         sellerAddresses = new address[](len);
    //         offers = new offer[](len);

    //         for (uint256 i; i < len; i++) {
    //             console.log(offerors[_token][i]);
    //             sellerAddresses[i] = offerors[_token][i];
    //             offers[i] = (sellOffers[_token][offerors[_token][i]]);
    //         }
    //     } else {
    //         sellerAddresses = new address[](0);
    //         offers = new offer[](0);
    //     }
    // }

    // //Buy an offer for a specified token
    // function buyOffer(
    //     address _token,
    //     address _seller,
    //     uint256 _amount
    // ) public {
    //     if (!tokenExisits[_token]) {
    //         revert invalidToken();
    //     }

    //     uint256 _amountPerToken = sellOffers[_token][_seller].amountPerToken;
    //     uint256 _amountToken = sellOffers[_token][_seller].amount;
    //     console.log("INSIDE BUYOFFER ");
    //     console.log(
    //         "sellOffers[_token][_seller].amount ",
    //         sellOffers[_token][_seller].amount / 1e18
    //     );
    //     console.log("_amount ", _amount / 1e18);
    //     console.log(
    //         "sellOffers[_token][_seller].amount == _amount",
    //         sellOffers[_token][_seller].amount == _amount
    //     );
    //     console.log(
    //         "sellOffers[_token][_seller].amount > _amount",
    //         sellOffers[_token][_seller].amount > _amount
    //     );
    //     console.log(
    //         "sellOffers[_token][_seller].amount < _amount",
    //         sellOffers[_token][_seller].amount < _amount
    //     );

    //     if (sellOffers[_token][_seller].amount == _amount) {
    //         _deleteOfferors(_token, _seller);
    //         IERC20(stableCoin).safeTransferFrom(
    //             msg.sender,
    //             _seller,
    //             ((_amount * _amountPerToken))
    //         );
    //         IERC20(_token).safeTransferFrom(_seller, msg.sender, _amount);
    //         //when sell offer is greater then buy offer(fill)
    //     } else if (sellOffers[_token][_seller].amount > _amount) {
    //         sellOffers[_token][_seller].amount -= _amount;

    //         IERC20(stableCoin).safeTransferFrom(
    //             msg.sender,
    //             _seller,
    //             _amount * sellOffers[_token][_seller].amountPerToken
    //         );
    //         IERC20(_token).safeTransferFrom(_seller, msg.sender, _amount);
    //     } else if (sellOffers[_token][_seller].amount < _amount) {
    //         _deleteOfferors(_token, _seller);
    //         //------------------------------------------------------------
    //         IERC20(stableCoin).safeTransferFrom(
    //             msg.sender,
    //             _seller,
    //             sellOffers[_token][_seller].amount * _amountPerToken
    //         );
    //         console.log(
    //             "_amount - _amountToken",
    //             (_amount - _amountToken) / 1e18
    //         );
    //         IERC20(_token).safeTransferFrom(
    //             _seller,
    //             msg.sender,
    //             _amount - _amountToken
    //         );
    //         console.log("just before stablecoinTransfer");
    //     }
    // }

    //fill an already existing buy offer.
    // function sellOffer(address _token, address _buyer, uint256 _amount) public {
    //     if (!tokenExisits[_token]) {
    //         revert invalidToken();
    //     }

    //     uint256 _amountPerToken = buyOffers[_token][_buyer].amountPerToken;
    //     uint256 _amountToken = buyOffers[_token][_buyer].amount;

    //     if (buyOffers[_token][_buyer].amount == _amount) {
    //         delete buyOffers[_token][_buyer];
    //         for (uint256 i; i < offerors[_token].length; i++) {
    //             if (offerors[_token][i] == _buyer) {
    //                 delete offerors[_token][i];
    //             }
    //         }
    //         IERC20(_token).safeTransferFrom(msg.sender, _buyer, _amount);
    //         IERC20(stableCoin).safeTransferFrom(
    //             _buyer,
    //             msg.sender,
    //             _amount * _amountPerToken
    //         );
    //     } else if (buyOffers[_token][_buyer].amount > _amount) {
    //         buyOffers[_token][_buyer].amount -= _amount;

    //         IERC20(_token).safeTransferFrom(msg.sender, _buyer, _amount);
    //         IERC20(stableCoin).safeTransferFrom(
    //             _buyer,
    //             msg.sender,
    //             _amount * buyOffers[_token][_buyer].amountPerToken
    //         );
    //     } else if (buyOffers[_token][_buyer].amount < _amount) {
    //         delete buyOffers[_token][_buyer];
    //         for (uint256 i; i < offerors[_token].length; i++) {
    //             if (offerors[_token][i] == _buyer) {
    //                 delete offerors[_token][i];
    //             }
    //         }
    //         IERC20(_token).safeTransferFrom(msg.sender, _buyer, _amount);
    //         IERC20(stableCoin).safeTransferFrom(
    //             _buyer,
    //             msg.sender,
    //             buyOffers[_token][_buyer].amount * _amountPerToken
    //         );
    //     }
    // }
}
