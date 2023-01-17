// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;
import "hardhat/console.sol";
import "./Interface/IMarketplace.sol";
//import "./Interface/IRentShare.sol";
import "./Interface/IPropertyToken.sol";
import "./Interface/IPriceFeed.sol";
import "./ERC3643/contracts/token/IToken.sol";
import "./ERC3643/contracts/factory/ITREXFactory.sol";
import "./Interface/AggregatorV3Interface.sol";

import {IFinder} from "./Interface/IFinder.sol";
import {ZeroXInterfaces} from "./constants.sol";
import {WadRayMath} from "./libraries/WadRayMath.sol";
import {AccessControlEnumerable, Context} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {MarketplaceLib} from "./libraries/MarketplaceLib.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract Marketplace is IMarketplace, Context, AccessControl {
    using SafeERC20 for IERC20;
    using WadRayMath for uint256;
    using MarketplaceLib for Storage;

    //----------------------------------------
    // Storage
    //----------------------------------------

    Storage internal storageParams;

    // uint256 public constant PERCENTAGE_BASED_POINT = 10000;
    // State public buyState = State.Active;
    // State public sellState = State.Paused;
    // uint256 identityCount;
    // uint256 internal poolId;
    // address finder;
    // address identity;
    // address IAuthority;
    // uint256 buyFeePercentage;
    // address buyFeeReceiverAddress;
    // mapping(address => property) public legalToProperty;
    // mapping(bytes => bool) salts;
    // mapping(address => uint256) public tokenPrice;
    // mapping(address => bool) public tokenExisits;
    // mapping(address => uint256) public wLegalToPoolId;
    // //mapping(address => address) public legalToIdentity;
    // address[] internal legalProperties;
    // // mapping(address => address[]) bidder;
    // // mapping(address => mapping(address => offer)) public buyOffers;
    // // mapping(address => address[]) offerors;
    // // mapping(address => mapping(address => offer)) public sellOffers;
    // // wLegalToken => Buying Currency => amount of currency marketplace hold for that specific wLegalToken
    // mapping(address => mapping(address => uint256)) public wLegalToTokens;

    //----------------------------------------
    // Modifiers
    //----------------------------------------

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdminRole();
        }
        _;
    }

    //----------------------------------------
    // Constructors
    //----------------------------------------

    // /**
    //  * @notice constructor - called only once at the time of deployment
    //  * @param _finder address of the finder.
    //  * @param _buyFeePercentage percentage of buy fee
    //  * @param _buyFeeReceiver buy fee reciver address.
    //  */
    constructor(ConstructorParams memory params) {
        storageParams.initialize(
            InitializationParams(
                10000,
                State.Active,
                State.Paused,
                params.finder,
                params.buyFeePercentage,
                params.buyFeeReceiver
            ),
            _msgSender()
        );
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    //----------------------------------------
    // External view
    //----------------------------------------

    /**
     * @notice migrate Legal and WLegal to new Marketplace
     * @param legalToken Address
     */
    function getLegalToProperty(
        address legalToken
    ) external view returns (property memory) {
        return storageParams.legalToProperty[legalToken];
    }

    /**
     * @notice to get all legal Property addresses
     */
    function getLegalProperties()
        external
        view
        returns (address[] memory properties)
    {
        return storageParams.getLegalProperties();
    }

    /**
     * @param _wLegalToken address of wrapped token
     * @param _token currency address
     */
    function getTokenLiquidity(
        address _wLegalToken,
        address _token
    ) external view returns (uint256) {
        return storageParams.wLegalToTokens[_wLegalToken][_token];
    }

    /**
     * @notice Wrapped Legal token to Pool Id
     * @param _WLegalToken - Wrapped Legal Token Address
     */
    function viewWLegalToPoolId(
        address _WLegalToken
    ) external view returns (uint256) {
        return storageParams.wLegalToPoolId[_WLegalToken];
    }

    /**
     * @notice return the wrapped ERC20 token address
     * @param _legalToken ERC3643 address
     */
    function LegalToWLegal(
        address _legalToken
    ) external view returns (address) {
        return storageParams.legalToProperty[_legalToken].WLegalShares;
    }

    /**
     * @notice - view the price of the token
     * @param _token - address of the wrapped token (ERC20)
     * @return price of the wrapped token.
     */
    function getPrice(address _token) external view returns (uint256) {
        if (!storageParams.tokenExisits[_token]) {
            revert invalidToken();
        }
        return storageParams.tokenPrice[_token];
    }

    //----------------------------------------
    // External functions
    //----------------------------------------

    // /**
    //  * @notice migrate Legal and WLegal to new Marketplace
    //  */

    // function migrate(
    //     address _legalToken,
    //     address _newMarketplace
    // ) external onlyAdmin {
    //     address wrapped = legalToProperty[_legalToken].WLegalShares;

    //     if (wrapped == address(0x00)) {
    //         revert NoPropertyFound();
    //     }

    //     if (_newMarketplace == address(0)) {
    //         revert ZeroAddress();
    //     }

    //     uint256 legalMarketplaceBalance = IERC20(_legalToken).balanceOf(
    //         address(this)
    //     );

    //     IERC20(_legalToken).transfer(_newMarketplace, legalMarketplaceBalance);

    //     uint256 wrappedMarketBalance = IERC20(wrapped).balanceOf(address(this));
    //     IERC20(wrapped).transfer(_newMarketplace, wrappedMarketBalance);
    // }

    /**
     * @notice to pause/unpause to the Buy on swap function
     */
    function changeBuyState() external onlyAdmin {
        storageParams.buyState = storageParams.buyState == State.Active
            ? State.Paused
            : State.Active;
        emit BuyStateChanged(storageParams.buyState);
    }

    /**
     * @notice to pause/unpause to the Sell on swap function
     */
    function changeSellState() external onlyAdmin {
        storageParams.sellState = storageParams.sellState == State.Active
            ? State.Paused
            : State.Active;
        emit SellStateChanged(storageParams.sellState);
    }

    /**
     * @notice to update the fee on buy.
     * @param _newPercentage percentage of the buy fee.
     */
    function updateBuyFeePercentage(uint256 _newPercentage) external onlyAdmin {
        require(
            _newPercentage > 0 &&
                _newPercentage <= storageParams.PERCENTAGE_BASED_POINT,
            "Update Buy Percentage Error"
        );
        storageParams.buyFeePercentage = _newPercentage;
    }

    /**
     * @notice update the address of the buy Fee receiver
     * @param _buyFeeReceiver address of the buy fee receiver
     */
    function setBuyFeeReceiverAddress(
        address _buyFeeReceiver
    ) external onlyAdmin {
        require(_buyFeeReceiver != address(0), "Zero Address Input");
        storageParams.buyFeeReceiverAddress = _buyFeeReceiver;
    }

    /**
     * @notice to call any function on identity contract
     * @param _identity address of identity of contract for legalToken
     * @param _data function signature and data you want to send along with it.
     */
    function callIdentity(
        address _identity,
        bytes memory _data
    ) external onlyAdmin {
        (bool success, ) = _identity.call(_data);
        require(success, "tx failed!");
    }

    /**
     * @notice admin can transfer token when payment is made offline.
     * @param _wLegalToken address of the wrapped token
     * @param _to address of the offline payment payer.
     *@param _amount amount wLegalTokens to transfer
     */
    function adminTransferToken(
        address _wLegalToken,
        address _to,
        uint256 _amount
    ) external onlyAdmin {
        if (storageParams.tokenExisits[_wLegalToken]) {
            revert invalidToken();
        }
        IERC20(_wLegalToken).safeTransfer(_to, _amount);
    }

    /**
     * @notice if admin want to withdraw liquidity of _wLegalToken
     * @param _wLegalToken address of the wrapped legal token
     * @param _token amount of wrapped legal token.
     * @param _to address of the receiver.
     */
    function withdrawLiquidity(
        address _wLegalToken,
        address _token,
        address _to
    ) external onlyAdmin {
        if (storageParams.wLegalToTokens[_wLegalToken][_token] == 0) {
            revert zeroBalance();
        }
        uint256 amountToSend = storageParams.wLegalToTokens[_wLegalToken][
            _token
        ];
        storageParams.wLegalToTokens[_wLegalToken][_token] = 0;
        IERC20(_wLegalToken).safeTransfer(_to, amountToSend);
    }

    /**
     * @notice to create the identity contract for marketplace.
     */
    function createIdentity() external onlyAdmin {
        storageParams.identityCount += 1;
        bytes32 salt = keccak256(abi.encodePacked(storageParams.identityCount));

        //deploying new Identity Proxy.
        bytes memory IPbytecode = abi.encodePacked(
            IFinder(storageParams.finder).getImplementationBytecode(
                ZeroXInterfaces.IdentityProxy
            ),
            abi.encode(storageParams.IAuthority, address(this))
        );
        address IdentityProxy = _createContract(salt, IPbytecode);

        emit newIdentity(address(IdentityProxy));
    }

    // /**
    // TODO: remove total legal shares as input fetch the total supply instead
    // TODO: make sure to check if the address of legal token is really legal token
    //  * @notice Deploys the Wrapped Legal contract.
    //  * @param _legalToken The address of the legal Token contract aka ERC3643.
    //  * @param _legalSharesToLock How many shares you want to lock and issue Wrapped LegalTokens.
    //  * @param _tokensPerLegalShares Ratio of LegalERC3643:WrappedERC20, e.g 1:100
    //  * @param _propertyDetails property details struct {price, priceToken, priceFeed}
    //  * @return WLegalShares Address of the Wrapped Legal Token, i.e ERC20
    //  */
    function addProperty(
        AddPropertyParams calldata _propertyParams
    ) external onlyAdmin returns (address WLegalShares) {
        WLegalShares = storageParams.addProperty(_propertyParams);
        _lockAndMint(
            _propertyParams.legalToken,
            WLegalShares,
            _propertyParams.legalSharesToLock,
            _propertyParams.tokensPerLegalShares
        );
        storageParams._addProperty(
            AddPropertyParams2(
                _propertyParams.legalToken,
                _propertyParams.legalSharesToLock,
                _propertyParams.tokensPerLegalShares,
                _propertyParams.totalLegalShares,
                _propertyParams.propertyDetails,
                WLegalShares
            )
        );
    }

    /**
     * @notice To unlock all legal shares and burn all WlegalTokens
     * @param _legalToken - The address of the legal Token contract aka ERC3643.
     */
    function removeProperty(address _legalToken) external onlyAdmin {
        property memory _Property = storageParams.legalToProperty[_legalToken];
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

    /**
     * @notice burn partial WLegalTokens and unlock legal tokens
     * @param _legalToken - The address of the legal Token contract aka ERC3643.
     * @param _LegalSharesToUnlock - How many shares you want to burn and unlock LegalTokens.
     */
    function unlockParialLegal(
        address _legalToken,
        uint256 _LegalSharesToUnlock
    ) external onlyAdmin {
        address WLegalShares = storageParams
            .legalToProperty[_legalToken]
            .WLegalShares;
        if (WLegalShares == address(0x00)) {
            revert PropertyDoesNotExist();
        }
        _burnAndUnlock(
            _legalToken,
            WLegalShares,
            _LegalSharesToUnlock *
                storageParams.legalToProperty[_legalToken].tokensPerLegalShares
        );
        storageParams
            .legalToProperty[_legalToken]
            .lockedLegalShares -= _LegalSharesToUnlock;
    }

    /**
     * @notice To lock more Legal tokens and Mint WLegal tokens.
     * @param _legalToken - The address of the legal Token contract aka ERC3643.
     * @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
     */
    function addMoreWLegalTokens(
        address _legalToken,
        uint256 _legalSharesToLock
    ) external onlyAdmin {
        if (
            storageParams.legalToProperty[_legalToken].WLegalShares ==
            address(0x00)
        ) {
            revert PropertyDoesNotExist();
        }
        if (
            storageParams.legalToProperty[_legalToken].totalLegalShares <
            storageParams.legalToProperty[_legalToken].lockedLegalShares +
                _legalSharesToLock
        ) {
            revert ExceedTotalLegalShares();
        }
        if (_legalSharesToLock < 0) {
            revert MustBeGreaterThanZero();
        }
        _lockAndMint(
            _legalToken,
            storageParams.legalToProperty[_legalToken].WLegalShares,
            _legalSharesToLock
        );

        storageParams
            .legalToProperty[_legalToken]
            .lockedLegalShares += _legalSharesToLock;
    }

    //swap function
    //check if the amount of share is in whole number
    //check if the to is in the tokenExisist that means that the person is truying to buy
    //pass the valeus in the _swap function with _swap(_from, _to, _amountOfShares, true)
    /**
     * @notice to buy and sell wrapped Token
     * @dev first finding if the user is trying to sell or buy.
     * @param args sruct of swapArgs {_from, _to, _amountOfShares}
     */
    function swap(swapArgs calldata args) external {
        if (args.amountOfShares % 1 != 0) {
            revert MustBeWholeNumber();
        }
        //buy
        if (storageParams.tokenExisits[args.to]) {
            if (storageParams.buyState == State.Paused) {
                revert BuyPaused();
            } else {
                _swap(args.from, args.to, args.amountOfShares, true);
            }

            //sell
        } else if (storageParams.tokenExisits[args.from]) {
            if (storageParams.sellState == State.Paused) {
                revert SellPaused();
            } else {
                if (
                    !(IPriceFeed(
                        IFinder(storageParams.finder).getImplementationAddress(
                            ZeroXInterfaces.PriceFeed
                        )
                    ).getCurrencyToFeed(args.to) != address(0))
                ) {
                    revert invalidCurrency();
                }
                _swap(args.to, args.from, args.amountOfShares, false);
            }
        } else {
            revert invalidCase();
        }
    }

    //----------------------------------------
    // Internal
    //----------------------------------------

    /**
     * @notice Lock legal token and mint wrapped tokens, when want to add more tokens.
     * @param _legalToken - The address of the legal Token contract aka ERC3643.
     * @param _WLegalToken - wrapped Legal tokens i.e ERC20 token with locked ERC3643.
     * @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
     */
    function _lockAndMint(
        address _legalToken,
        address _WLegalToken,
        uint256 _legalSharesToLock
    ) internal {
        _lockAndMint(
            _legalToken,
            _WLegalToken,
            _legalSharesToLock,
            storageParams.legalToProperty[_legalToken].tokensPerLegalShares
        );
    }

    /**
     * @notice Lock legal token and mint wrapped tokens.
     * @param _legalToken - The address of the legal Token contract aka ERC3643.
     * @param _WLegalToken - wrapped Legal tokens i.e ERC20 token with locked ERC3643.
     * @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
     * @param _tokensPerLegalShares - Ratio of LegalERC3643:WrappedERC20, e.g 1:100
     */
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

        storageParams
            .legalToProperty[_legalToken]
            .lockedLegalShares += _legalSharesToLock;
    }

    /**
     * @notice burn WLegal(ERC20) and unlock legal tokens
     * @param _legalToken - The address of the legal Token contract aka ERC3643.
     * @param _WLegalToken - wrapped Legal tokens i.e ERC20 token with locked ERC3643.
     * @param _WlegalSharesToBurn - ERC20 tokens you want to burn and unlock Legal tokens.
     */
    function _burnAndUnlock(
        address _legalToken,
        address _WLegalToken,
        uint256 _WlegalSharesToBurn
    ) internal {
        // => sent erc20 to 0x00, issue legalTokens
        uint256 tokensPerShare = storageParams
            .legalToProperty[_legalToken]
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
        storageParams
            .legalToProperty[_legalToken]
            .lockedLegalShares -= legalTokensToUnlock;
        if (storageParams.legalToProperty[_legalToken].lockedLegalShares == 0) {
            delete storageParams.legalToProperty[_legalToken];
            delete storageParams.tokenPrice[
                storageParams.legalToProperty[_legalToken].WLegalShares
            ];
            delete storageParams.tokenExisits[
                storageParams.legalToProperty[_legalToken].WLegalShares
            ];
        }
    }

    /**
     * @notice - create2 function, for deterministic address.
     * @param _salt - unique identifier
     * @param _contractCode - bytecode packed along with constructor params.
     */
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

    //_swap(_from, _to, _amountOfShares, true)

    //in the swap function we would assume that the FROM is the Currency Where as _to is the propertyToken
    //we will fetch the priceFeed using the FROM
    //make sure that the currency address is not zero
    //fetch the propertyDetails and save it in _property

    /**
     *  @notice internal function to do the swap.
     *  @dev segregating if the user want to buy in property's token or in other curruncy.
     * @param _from from address can be if(buy) ? buyCurrency : propertyToken
     * @param _to to address can be if(buy) ? propertyToken : sellCurrency
     * @param _amountOfShares number of wrapped token user want to buy or sell.
     * @param isBuying if(true) ? user want to buy : user want to sell.
     */
    function _swap(
        address _from,
        address _to,
        uint256 _amountOfShares,
        bool isBuying
    ) internal {
        address _priceFeed = IFinder(storageParams.finder)
            .getImplementationAddress(ZeroXInterfaces.PriceFeed);
        address _currencyToFeed = IPriceFeed(_priceFeed).getCurrencyToFeed(
            _from
        );

        if ((_currencyToFeed == address(0))) {
            revert invalidCurrency();
        }

        IPriceFeed.Property memory _property = IPriceFeed(_priceFeed)
            .getPropertyDetail(IERC20Metadata(_to).symbol());

        if (_property.priceFeed == _currencyToFeed) {
            console.log("INSIDE SIMPLE BUY SELL");
            uint256 quotePrice = _amountOfShares * _property.price;
            _transferProperty(
                _amountOfShares,
                _to,
                _from,
                isBuying,
                quotePrice
            );
        } else {
            //fetching Price in Decimals, Getting price for the quote Currency,

            uint256 quotePrice = _propertyQuotePrice(
                QuotePriceParams(
                    _amountOfShares,
                    _property.currency,
                    _from,
                    _property.priceFeed,
                    _currencyToFeed,
                    _property.price,
                    _priceFeed
                )
            );

            console.log("quotePrice**", quotePrice);

            _transferProperty(
                _amountOfShares,
                _to,
                _from,
                isBuying,
                quotePrice
            );
        }
    }

    /**
     * @notice to execture transfer and transferFrom operation for swap.
     * @param _amountOfShares number of shares user want to buy or sell.
     * @param _from from address can be if(buy) ? buyCurrency : propertyToken
     * @param _to to address can be if(buy) ? propertyToken : sellCurrency
     *  @param _isBuying if(true) ? user want to buy : user want to sell.
     * @param _quotePrice price if(buy) ? transferFrom : transfer
     */
    function _transferProperty(
        uint256 _amountOfShares,
        address _to,
        address _from,
        bool _isBuying,
        uint256 _quotePrice
    ) internal {
        storageParams._transferProperty(
            TransferPropertyParams(
                _amountOfShares,
                _to,
                _from,
                _isBuying,
                _quotePrice
            ),
            _msgSender()
        );
    }

    // /**
    //  * @notice to calculate the quote price.
    //  *  @param _amountOfShares number of shares user want to buy or sell.
    //  * @param _propertyCurrency address of the token in which property shares are listed.
    //  *  @param _quoteCurrency address of the token in which user want to buy/sell.
    //  *  @param _propertyPriceFeed price feed address of _propertyCurrency.
    //  * @param _quotePriceFeed price feed address of _quoteCurrency.
    //  * @param _propertyPrice per share price of the property's wrapped shares.
    //  * @param _priceFeed address of the priceFeed contract.
    //  */
    function _propertyQuotePrice(
        IMarketplace.QuotePriceParams memory _quoteParams
    ) internal view returns (uint256 quotePrice) {
        return MarketplaceLib.propertyQuotePrice(_quoteParams);
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
    // /**
    //  * @notice - update the price of token
    //  * @param _token - address of the wrapped Erc20 Token
    //  *  @param _price - price you want to set. must be greater then zero.
    //  */

    // function updatePrice(address _token, uint256 _price) public onlyAdmin {
    //     if (!tokenExisits[_token]) {
    //         revert invalidToken();
    //     }
    //     if (_price < 0) {
    //         revert MustBeGreaterThanZero();
    //     }
    //     tokenPrice[_token] = _price;
    //     emit priceUpdated(_token, _price);
    // }

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
