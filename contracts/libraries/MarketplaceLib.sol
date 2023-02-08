// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.9;

import "hardhat/console.sol";
import {IMarketplace} from "../Interface/IMarketplace.sol";
import {ZeroXInterfaces} from "../constants.sol";
import {IFinder} from "../Interface/IFinder.sol";
import {IMarketPlaceBorrower} from "../Interface/IMarketPlaceBorrower.sol";
import {IToken} from "../ERC3643/contracts/token/IToken.sol";
import {IPriceFeed} from "../Interface/IPriceFeed.sol";
import {IRentShare} from "../Interface/IRentShare.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPropertyToken} from "../Interface/IPropertyToken.sol";
import {WadRayMath} from "./WadRayMath.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {IERC4626StakingPool} from "./../XEQ/interfaces/IERC4626StakingPool.sol";

import {AccessControlEnumerable, Context} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

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
error MustBeGreaterThenAmount();
error EmptyBytecode();
error invalidCurrency();
error invalidCase();
error zeroBalance();
error BuyPaused();
error SellPaused();
error NoPropertyFound();

/**
 * @title Multi LP Synthereum pool lib with main functions
 */

library MarketplaceLib {
    using SafeERC20 for IERC20;
    using WadRayMath for uint256;

    event newERC3643(address legaltoken);
    event newPropertyAdded(address legalToken, address wLegalToken);
    event priceUpdated(address token, uint256 price);
    event newIdentity(address Identity);
    event swaped(address from, address to, uint256 amountIn, uint256 amountOut);
    event newBid(
        address token,
        address bidder,
        uint256 amount,
        uint256 amountPerToken
    );
    enum State {
        Active,
        Paused
    }

    event BuyStateChanged(State);
    event SellStateChanged(State);
    event newAsk(
        address token,
        address offerer,
        uint256 amount,
        uint256 amountPerToken
    );

    function initialize(
        IMarketplace.Storage storage _storageParams,
        IMarketplace.InitializationParams calldata _params,
        address sender
    ) external {
        _storageParams.PERCENTAGE_BASED_POINT = 10000;
        _storageParams.buyState = IMarketplace.State.Active;
        _storageParams.sellState = IMarketplace.State.Paused;

        require(
            _params.buyFeePercentage > 0 &&
                _params.buyFeePercentage <=
                _storageParams.PERCENTAGE_BASED_POINT,
            "Update Buy Percentage Error"
        );
        require(_params.feeReceiver != address(0), "Zero Address Input");
        if (_params.finder == address(0)) {
            revert ZeroAddress();
        }
        _storageParams.finder = _params.finder;
        _storageParams.buyFeePercentage = _params.buyFeePercentage;
        _storageParams.sellFeePercentage = _params.sellFeePercentage;
        _storageParams.feeReceiver = _params.feeReceiver;

        bytes32 salt = keccak256(abi.encodePacked(sender));
        bytes memory Identitybytecode = abi.encodePacked(
            IFinder(_storageParams.finder).getImplementationBytecode(
                ZeroXInterfaces.IDENTITY
            ),
            abi.encode(address(this), true)
        );
        _storageParams.identity = _createContract(salt, Identitybytecode);

        bytes memory impAuthbytecode = abi.encodePacked(
            IFinder(_storageParams.finder).getImplementationBytecode(
                ZeroXInterfaces.IMPLEMENTATION_AUTHORITY
            ),
            abi.encode(_storageParams.identity)
        );
        _storageParams.IAuthority = _createContract(salt, impAuthbytecode);
        console.log("before msgSender");
    }

    function addProperty(
        IMarketplace.Storage storage _storageParams,
        IMarketplace.AddPropertyParams calldata _propertyParams
    ) external returns (address WLegalShares) {
        if (
            _storageParams
                .legalToProperty[_propertyParams.legalToken]
                .WLegalShares != address(0x00)
        ) {
            revert PropertyAlreadyExist();
        }
        if (_propertyParams.legalToken == address(0x00)) {
            revert ZeroAddress();
        }
        if (
            _propertyParams.legalSharesToLock <= 0 ||
            _propertyParams.tokensPerLegalShares <= 0
        ) {
            revert MustBeGreaterThanZero();
        }
        if (
            _propertyParams.totalLegalShares < _propertyParams.legalSharesToLock
        ) {
            revert totalMustBeGreaterThanToLock();
        }
        if (_propertyParams.propertyDetails.price <= 0) {
            revert MustBeGreaterThanZero();
        }

        bytes32 salt = keccak256(abi.encodePacked(_propertyParams.legalToken));
        //bytes memory creationCode = type(PropertyToken).creationCode;
        address rentShare = IFinder(_storageParams.finder)
            .getImplementationAddress(ZeroXInterfaces.RENT_SHARE);
        bytes memory bytecode = abi.encodePacked(
            IFinder(_storageParams.finder).getImplementationBytecode(
                ZeroXInterfaces.PROPERTY_TOKEN
            ),
            abi.encode(
                _storageParams.finder,
                msg.sender,
                _storageParams.poolId,
                string.concat(
                    "W",
                    bytes(IToken(_propertyParams.legalToken).name())
                ),
                string.concat(
                    "W",
                    bytes(IToken(_propertyParams.legalToken).symbol())
                ),
                0
            )
        );

        WLegalShares = _createContract(salt, bytecode);
        _storageParams.wLegalToPoolId[WLegalShares] = IRentShare(rentShare)
            .createPool(
                IERC20(WLegalShares),
                WLegalShares,
                IERC20Metadata(WLegalShares).symbol(),
                _storageParams.poolId
            );
    }

    function _addProperty(
        IMarketplace.Storage storage _storageParams,
        IMarketplace.AddPropertyParams2 calldata _propertyParams
    ) external {
        console.log(
            "***************** ******************************  ******************* "
        );
        _storageParams
            .legalToProperty[_propertyParams.legalToken]
            .lockedLegalShares += _propertyParams.legalSharesToLock;

        _storageParams.legalToProperty[
            _propertyParams.legalToken
        ] = IMarketplace.property(
            _propertyParams.WLegalShares,
            _propertyParams.totalLegalShares,
            _propertyParams.legalSharesToLock,
            _propertyParams.tokensPerLegalShares
        );
        IPriceFeed(
            IFinder(_storageParams.finder).getImplementationAddress(
                ZeroXInterfaces.PRICE_FEED
            )
        ).setPropertyDetails(
                IERC20Metadata(_propertyParams.WLegalShares).symbol(),
                _propertyParams.propertyDetails
            );

        _storageParams.tokenExisits[_propertyParams.WLegalShares] = true;

        assert(
            _storageParams.wLegalToPoolId[_propertyParams.WLegalShares] ==
                _storageParams.poolId
        );
        _storageParams.poolId += 1;
        _storageParams.legalProperties.push(_propertyParams.legalToken);
        emit newPropertyAdded(
            _propertyParams.legalToken,
            _propertyParams.WLegalShares
        );
    }

    function propertyQuotePrice(
        IMarketplace.QuotePriceParams memory _quoteParams
    ) external view returns (uint256 quotePrice) {
        uint8 propertyCurrencyDecimals = IERC20Metadata(
            _quoteParams.propertyCurrency
        ).decimals();
        uint8 quoteCurrencyDecimals = IERC20Metadata(_quoteParams.quoteCurrency)
            .decimals();

        uint256 propetyCurrencyInUsd = IPriceFeed(_quoteParams.priceFeed)
            .feedPriceChainlink(_quoteParams.propertyPriceFeed);

        uint256 quotePriceInUsd = IPriceFeed(_quoteParams.priceFeed)
            .feedPriceChainlink(_quoteParams.quotePriceFeed);
        // coverting property price in 18 decimals
        _quoteParams.propertyPrice =
            _quoteParams.propertyPrice *
            (10**(18 - propertyCurrencyDecimals));

        // getting property price in usd Feed
        // converting _propertyPrice from 18 decimals to 27 decimals precision
        // converting propetyCurrencyInUsd from 18 decimals to 27 decimals precision
        // multiplying propertyPrice(Price in its own currency set by admin) with property
        // currency price in Usd and then dividing with RAY to get end result in RAY
        // propertyPriceInUsd result will be in USD form in RAY = 1e27 decimals

        uint256 propertyPriceInUsd = (_quoteParams.propertyPrice.wadToRay())
            .rayMul(propetyCurrencyInUsd.wadToRay())
            .rayDiv(WadRayMath.RAY);

        // getting property price in quote feed
        // dividing propertyPriceInUsd with quote price
        // output of propertyPrice will be in quote price

        uint256 propertyPriceInQuote = (propertyPriceInUsd).rayDiv(
            quotePriceInUsd.wadToRay()
        );

        // price of property in other feed's token decimals
        // getting the price of property in quote for all amount of shares
        // end result will be quoteCurrency decimals

        quotePrice = (
            ((_quoteParams.amountOfShares *
                (propertyPriceInQuote.rayToWad().wadDiv(WadRayMath.WAD))) /
                (10**(18 - quoteCurrencyDecimals)))
        );
    }

    function _transferProperty(
        IMarketplace.Storage storage _storageParams,
        IMarketplace.TransferPropertyParams memory _transferParams,
        address sender
    ) external {
        if (_transferParams.isBuying) {
            _storageParams.wLegalToTokens[_transferParams.to][
                    _transferParams.from
                ] += _transferParams.quotePrice;
            uint256 buyFeeAmount = ((_transferParams.quotePrice *
                _storageParams.buyFeePercentage) /
                _storageParams.PERCENTAGE_BASED_POINT);
            IERC20(_transferParams.from).safeTransferFrom(
                sender,
                address(this),
                _transferParams.quotePrice + buyFeeAmount
            );
            // transferring fees to fee receiver
            IERC20(_transferParams.from).transfer(
                _storageParams.feeReceiver,
                buyFeeAmount
            );
            IERC20(_transferParams.to).safeTransfer(
                sender,
                _transferParams.amountOfShares
            );
            emit swaped(
                _transferParams.from,
                _transferParams.to,
                _transferParams.quotePrice,
                _transferParams.amountOfShares
            );
        } else {
            IERC20(_transferParams.to).safeTransferFrom(
                sender,
                IMarketPlaceBorrower(_storageParams.marketPlaceBorrower)
                    .getPoolToBorrowFromAddress(), // transferring property tokens directly to the POOL from where this contract is borrowing funds from
                _transferParams.amountOfShares
            );

            _storageParams.wLegalToTokens[_transferParams.to][
                    _transferParams.from
                ] -= _transferParams.quotePrice;

            // getting funds from staking Pool through MarketplaceBorrower
            _borrowTokens(
                _storageParams.marketPlaceBorrower,
                _transferParams.quotePrice // tokens to borrow
            );

            // transfer fee to fee reciever
            _transferSellFee(
                _storageParams,
                _transferParams.from,
                _transferParams.quotePrice
            );

            // transfer tokens to user
            _transferTokensToUser(
                _storageParams,
                _transferParams.from,
                sender,
                _transferParams.quotePrice
            );

            // IERC20(_transferParams.from).safeTransfer(
            //     sender,
            //     _transferParams.quotePrice
            // );
            emit swaped(
                _transferParams.to,
                _transferParams.from,
                _transferParams.amountOfShares,
                _transferParams.quotePrice
            );
        }
    }

    function isTrustedForwarder(
        IMarketplace.Storage storage _storageParams,
        address _forwarder
    ) external view returns (bool) {
        try
            IFinder(_storageParams.finder).getImplementationAddress(
                ZeroXInterfaces.TRUSTED_FORWARDER
            )
        returns (address trustedForwarder) {
            if (_forwarder == trustedForwarder) {
                return true;
            } else {
                return false;
            }
        } catch {
            return false;
        }
    }

    //----------------------------------------
    // External view
    //----------------------------------------

    /**
     * @notice to get all legal Property addresses
     */
    function getLegalProperties(IMarketplace.Storage storage _storageParams)
        external
        view
        returns (address[] memory properties)
    {
        uint256 len = _storageParams.legalProperties.length;
        properties = new address[](len);
        for (uint256 i; i < len; i++) {
            properties[i] = _storageParams.legalProperties[i];
        }
        return properties;
    }

    //----------------------------------------
    // Internal
    //----------------------------------------

    /**
     * @notice - create2 function, for deterministic address.
     * @param _salt - unique identifier
     * @param _contractCode - bytecode packed along with constructor params.
     */
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

    /**
     * @notice - updates marketPlace borrower.
     * @param _address - new MarketplaceBorrower address
     */
    function _updateMarketplaceBorrower(
        IMarketplace.Storage storage _storageParams,
        address _address
    ) internal {
        if (_address == address(0x00)) {
            revert ZeroAddress();
        }
        _storageParams.marketPlaceBorrower = _address;
    }

    /**
     * @notice - borrows tokens from marketPlaceBorrower.
     * @param _mpBorrower marketplace borrower address
     * @param _tokensToBorrowWithoutFees amount of tokens to borrow
     */
    function _borrowTokens(
        address _mpBorrower,
        uint256 _tokensToBorrowWithoutFees
    ) internal {
        // IERC20(_propertyToken).approve(_mpBorrower, _amountOfPropertyTokensGot);
        IMarketPlaceBorrower(_mpBorrower).borrowTokens(
            _tokensToBorrowWithoutFees
        );
    }

    function _transferSellFee(
        IMarketplace.Storage storage _storageParams,
        address _token,
        uint256 _quotePrice
    ) internal {
        uint256 fee = (_quotePrice * _storageParams.sellFeePercentage) /
            _storageParams.PERCENTAGE_BASED_POINT;

        // transferring fees to fee receiver
        IERC20(_token).transfer(_storageParams.feeReceiver, fee);
    }

    function _transferTokensToUser(
        IMarketplace.Storage storage _storageParams,
        address _token,
        address sender,
        uint256 _quotePrice
    ) internal {
        uint256 totalFeePercentage = _storageParams.sellFeePercentage +
            IERC4626StakingPool(
                IMarketPlaceBorrower(_storageParams.marketPlaceBorrower)
                    .getPoolToBorrowFromAddress()
            ).fees(); // protolcolfee + pool fee. e.g 1.25 % + 3.75

        uint256 fee = (_quotePrice * totalFeePercentage) /
            _storageParams.PERCENTAGE_BASED_POINT;

        // transferring tokens to user
        IERC20(_token).transfer(sender, _quotePrice - fee);
    }
}
