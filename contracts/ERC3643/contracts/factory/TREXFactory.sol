// SPDX-License-Identifier: GPL-3.0
//
//                                             :+#####%%%%%%%%%%%%%%+
//                                         .-*@@@%+.:+%@@@@@%%#***%@@%=
//                                     :=*%@@@#=.      :#@@%       *@@@%=
//                       .-+*%@%*-.:+%@@@@@@+.     -*+:  .=#.       :%@@@%-
//                   :=*@@@@%%@@@@@@@@@%@@@-   .=#@@@%@%=             =@@@@#.
//             -=+#%@@%#*=:.  :%@@@@%.   -*@@#*@@@@@@@#=:-              *@@@@+
//            =@@%=:.     :=:   *@@@@@%#-   =%*%@@@@#+-.        =+       :%@@@%-
//           -@@%.     .+@@@     =+=-.         @@#-           +@@@%-       =@@@@%:
//          :@@@.    .+@@#%:                   :    .=*=-::.-%@@@+*@@=       +@@@@#.
//          %@@:    +@%%*                         =%@@@@@@@@@@@#.  .*@%-       +@@@@*.
//         #@@=                                .+@@@@%:=*@@@@@-      :%@%:      .*@@@@+
//        *@@*                                +@@@#-@@%-:%@@*          +@@#.      :%@@@@-
//       -@@%           .:-=++*##%%%@@@@@@@@@@@@*. :@+.@@@%:            .#@@+       =@@@@#:
//      .@@@*-+*#%%%@@@@@@@@@@@@@@@@%%#**@@%@@@.   *@=*@@#                :#@%=      .#@@@@#-
//      -%@@@@@@@@@@@@@@@*+==-:-@@@=    *@# .#@*-=*@@@@%=                 -%@@@*       =@@@@@%-
//         -+%@@@#.   %@%%=   -@@:+@: -@@*    *@@*-::                   -%@@%=.         .*@@@@@#
//            *@@@*  +@* *@@##@@-  #@*@@+    -@@=          .         :+@@@#:           .-+@@@%+-
//             +@@@%*@@:..=@@@@*   .@@@*   .#@#.       .=+-       .=%@@@*.         :+#@@@@*=:
//              =@@@@%@@@@@@@@@@@@@@@@@@@@@@%-      :+#*.       :*@@@%=.       .=#@@@@%+:
//               .%@@=                 .....    .=#@@+.       .#@@@*:       -*%@@@@%+.
//                 +@@#+===---:::...         .=%@@*-         +@@@+.      -*@@@@@%+.
//                  -@@@@@@@@@@@@@@@@@@@@@@%@@@@=          -@@@+      -#@@@@@#=.
//                    ..:::---===+++***###%%%@@@#-       .#@@+     -*@@@@@#=.
//                                           @@@@@@+.   +@@*.   .+@@@@@%=.
//                                          -@@@@@=   =@@%:   -#@@@@%+.
//                                          +@@@@@. =@@@=  .+@@@@@*:
//                                          #@@@@#:%@@#. :*@@@@#-
//                                          @@@@@%@@@= :#@@@@+.
//                                         :@@@@@@@#.:#@@@%-
//                                         +@@@@@@-.*@@@*:
//                                         #@@@@#.=@@@+.
//                                         @@@@+-%@%=
//                                        :@@@#%@%=
//                                        +@@@@%-
//                                        :#%%=
//
/**
 *     NOTICE
 *
 *     The T-REX software is licensed under a proprietary license or the GPL v.3.
 *     If you choose to receive it under the GPL v.3 license, the following applies:
 *     T-REX is a suite of smart contracts developed by Tokeny to manage and transfer financial assets on the ethereum blockchain
 *
 *     Copyright (C) 2022, Tokeny sàrl.
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
pragma solidity ^0.8.0;

import "../roles/AgentRole.sol";
import "../token/IToken.sol";
import "../token/propertyToken.sol";
import "../registry/interface/IClaimTopicsRegistry.sol";
import "../registry/interface/IIdentityRegistry.sol";
import "../compliance/modular/IModularCompliance.sol";
import "../registry/interface/ITrustedIssuersRegistry.sol";
import "../registry/interface/IIdentityRegistryStorage.sol";
import "../proxy/authority/ITREXImplementationAuthority.sol";
import "../proxy/TokenProxy.sol";
import "../proxy/ClaimTopicsRegistryProxy.sol";
import "../proxy/IdentityRegistryProxy.sol";
import "../proxy/IdentityRegistryStorageProxy.sol";
import "../proxy/TrustedIssuersRegistryProxy.sol";
import "../proxy/ModularComplianceProxy.sol";
import "./ITREXFactory.sol";
import "hardhat/console.sol";

contract TREXFactory is ITREXFactory, Ownable {
    /// the address of the implementation authority contract used in the tokens deployed by the factory
    address public implementationAuthority;

    /// mapping containing info about the token contracts corresponding to salt already used for CREATE2 deployments
    mapping(string => address) public tokenDeployed;

    mapping(address => property) public legalToProperty;

    /// constructor is setting the implementation authority of the factory
    constructor(address _implementationAuthority) {
        setImplementationAuthority(_implementationAuthority);
    }

    /**
     *  @dev See {ITREXFactory-getToken}.
     */
    function getToken(string calldata _salt)
        external
        view
        override
        returns (address)
    {
        return tokenDeployed[_salt];
    }

    /**
     *  @dev See {ITREXFactory-setImplementationAuthority}.
     */
    function setImplementationAuthority(address _implementationAuthority)
        public
        override
        onlyOwner
    {
        // should not be possible to set an implementation authority that is not complete
        require(
            (ITREXImplementationAuthority(_implementationAuthority))
                .getTokenImplementation() !=
                address(0x00) &&
                (ITREXImplementationAuthority(_implementationAuthority))
                    .getCTRImplementation() !=
                address(0x00) &&
                (ITREXImplementationAuthority(_implementationAuthority))
                    .getIRImplementation() !=
                address(0x00) &&
                (ITREXImplementationAuthority(_implementationAuthority))
                    .getIRSImplementation() !=
                address(0x00) &&
                (ITREXImplementationAuthority(_implementationAuthority))
                    .getMCImplementation() !=
                address(0x00) &&
                (ITREXImplementationAuthority(_implementationAuthority))
                    .getTIRImplementation() !=
                address(0x00),
            "invalid Implementation Authority"
        );
        implementationAuthority = _implementationAuthority;
        emit ImplementationAuthoritySet(_implementationAuthority);
    }

    /// deploy function with create2 opcode call
    /// returns the address of the contract created
    function deploy(string memory salt, bytes memory bytecode)
        internal
        returns (address)
    {
        bytes memory implInitCode = bytecode;
        console.log("bytes codeeee---------------------------------");
        console.logBytes(bytecode);
        address addr;
        bool done;
        console.log("bfore asseeeembblllyy", salt);
        bytes32 saleee = keccak256(abi.encodePacked("hardcode"));
        assembly {
            // let encoded_data :=  // load initialization code.
            // let encoded_size :=  // load init code's length.
            // addr := create2(
            //     0,
            //     add(implInitCode, 0x20),
            //     mload(implInitCode),
            //     saleee
            // )
            addr := create2(
                0,
                add(implInitCode, 0x20),
                mload(implInitCode),
                saleee
            )
            //addr := create2(0, add(implInitCode, 32), mload(bytecode), salt)
        }

        console.log("after asseeeembblllyy", done);
        console.log(addr);

        emit Deployed(addr);
        return addr;
    }

    function deployments(
        string memory _salt,
        TokenDetails calldata _tokenDetails
    )
        internal
        returns (
            ITrustedIssuersRegistry tir,
            IClaimTopicsRegistry ctr,
            IModularCompliance mc,
            IIdentityRegistryStorage irs,
            IIdentityRegistry ir,
            IToken token
        )
    {
        tir = ITrustedIssuersRegistry(
            deployTIR(_salt, implementationAuthority)
        );

        console.log("insider deployments");

        ctr = IClaimTopicsRegistry(deployCTR(_salt, implementationAuthority));
        mc = IModularCompliance(deployMC(_salt, implementationAuthority));
        if (_tokenDetails.irs == address(0)) {
            irs = IIdentityRegistryStorage(
                deployIRS(_salt, implementationAuthority)
            );
        } else {
            irs = IIdentityRegistryStorage(_tokenDetails.irs);
        }

        ir = IIdentityRegistry(
            deployIR(
                _salt,
                implementationAuthority,
                address(tir),
                address(ctr),
                address(irs)
            )
        );

        token = IToken(
            deployToken(
                _salt,
                implementationAuthority,
                address(ir),
                address(mc),
                _tokenDetails.name,
                _tokenDetails.symbol,
                _tokenDetails.decimals,
                _tokenDetails.ONCHAINID
            )
        );
        console.log("in the end");
    }

    /**
     *  @dev See {ITREXFactory-deployTREXSuite}.
     */
    function deployTREXSuite(
        string memory _salt,
        TokenDetails calldata _tokenDetails,
        ClaimDetails calldata _claimDetails
    ) external override onlyOwner returns (address) {
        console.log("insider");
        require(tokenDeployed[_salt] == address(0), "token already deployed");
        require(
            (_claimDetails.issuers).length ==
                (_claimDetails.issuerClaims).length,
            "claim pattern not valid"
        );
        console.log("require passed!");

        (
            ITrustedIssuersRegistry tir,
            IClaimTopicsRegistry ctr,
            IModularCompliance mc,
            IIdentityRegistryStorage irs,
            IIdentityRegistry ir,
            IToken token
        ) = deployments(_salt, _tokenDetails);
        console.log("deployment passed!");
        // ITrustedIssuersRegistry tir,  = ITrustedIssuersRegistry(
        //     deployTIR(_salt, implementationAuthority)
        // );
        // IClaimTopicsRegistry ctr = IClaimTopicsRegistry(
        //     deployCTR(_salt, implementationAuthority)
        // );
        // IModularCompliance mc = IModularCompliance(
        //     deployMC(_salt, implementationAuthority)
        // );
        // IIdentityRegistryStorage irs;
        // if (_tokenDetails.irs == address(0)) {
        //     irs = IIdentityRegistryStorage(
        //         deployIRS(_salt, implementationAuthority)
        //     );
        // } else {
        //     irs = IIdentityRegistryStorage(_tokenDetails.irs);
        // }
        // IIdentityRegistry ir = IIdentityRegistry(
        //     deployIR(
        //         _salt,
        //         implementationAuthority,
        //         address(tir),
        //         address(ctr),
        //         address(irs)
        //     )
        // );

        // IToken token = IToken(
        //     deployToken(
        //         _salt,
        //         implementationAuthority,
        //         address(ir),
        //         address(mc),
        //         _tokenDetails.name,
        //         _tokenDetails.symbol,
        //         _tokenDetails.decimals,
        //         _tokenDetails.ONCHAINID
        //     )
        // );

        for (uint256 i = 0; i < (_claimDetails.claimTopics).length; i++) {
            ctr.addClaimTopic(_claimDetails.claimTopics[i]);
        }
        for (uint256 i = 0; i < (_claimDetails.issuers).length; i++) {
            tir.addTrustedIssuer(
                IClaimIssuer((_claimDetails).issuers[i]),
                _claimDetails.issuerClaims[i]
            );
        }
        irs.bindIdentityRegistry(address(ir));
        AgentRole(address(ir)).addAgent(address(token));
        for (uint256 i = 0; i < (_tokenDetails.irAgents).length; i++) {
            AgentRole(address(ir)).addAgent(_tokenDetails.irAgents[i]);
        }
        for (uint256 i = 0; i < (_tokenDetails.tokenAgents).length; i++) {
            AgentRole(address(token)).addAgent(_tokenDetails.tokenAgents[i]);
        }
        for (uint256 i = 0; i < (_tokenDetails.complianceModules).length; i++) {
            if (!mc.isModuleBound(_tokenDetails.complianceModules[i])) {
                mc.addModule(_tokenDetails.complianceModules[i]);
            }
            if (i < (_tokenDetails.complianceSettings).length) {
                mc.callModuleFunction(
                    _tokenDetails.complianceSettings[i],
                    _tokenDetails.complianceModules[i]
                );
            }
        }
        tokenDeployed[_salt] = address(token);
        (Ownable(address(token))).transferOwnership(_tokenDetails.owner);
        (Ownable(address(ir))).transferOwnership(_tokenDetails.owner);
        (Ownable(address(tir))).transferOwnership(_tokenDetails.owner);
        (Ownable(address(ctr))).transferOwnership(_tokenDetails.owner);
        (Ownable(address(mc))).transferOwnership(_tokenDetails.owner);
        emit TREXSuiteDeployed(
            address(token),
            address(ir),
            address(irs),
            address(tir),
            address(ctr),
            _salt
        );
        return address(token);
    }

    //@question: how to check if the contract is really erc3643 and admin is not millicious and using erc20 contract address
    /// @notice Deploys the Wrapped Legal contract.
    /// @param _legalToken - The address of the legal Token contract aka ERC3643.
    /// @param _legalSharesToLock - How many shares you want to lock and issue Wrapped LegalTokens.
    /// @param _tokensPerLegalShares - Ratio of LegalERC3643:WrappedERC20, e.g 1:100
    /// @return WLegalShares - Address of the Wrapped Legal Token, i.e ERC20
    function addProperty(
        string memory _salt,
        address _legalToken,
        uint256 _legalSharesToLock,
        uint256 _tokensPerLegalShares,
        uint256 _totalLegalShares
    ) external returns (address WLegalShares) {
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
        //bytes32 salt = keccak256(abi.encodePacked(_legalToken));

        bytes memory creationCode = type(PropertyToken).creationCode;
        bytes memory bytecode = abi.encodePacked(
            creationCode,
            abi.encode(
                _legalToken,
                IToken(_legalToken).name(),
                IToken(_legalToken).symbol()
            )
        );
        WLegalShares = deploy(_salt, bytecode);
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
    function removeProperty(address _legalToken) external {
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
    ) external {
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
        IToken(_WLegalToken).transferFrom(
            _WLegalToken,
            _msgSender(),
            legalTokensToUnlock
        );

        legalToProperty[_legalToken].lockedLegalShares -= legalTokensToUnlock;
    }

    /// function used to deploy a trusted issuers registry using CREATE2
    function deployTIR(string memory _salt, address _implementationAuthority)
        internal
        returns (address)
    {
        bytes memory _code = type(TrustedIssuersRegistryProxy).creationCode;
        bytes memory _constructData = abi.encode(_implementationAuthority);
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return deploy(_salt, bytecode);
    }

    /// function used to deploy a claim topics registry using CREATE2
    function deployCTR(string memory _salt, address _implementationAuthority)
        internal
        returns (address)
    {
        //bytes memory _code = type(ClaimTopicsRegistryProxy).creationCode;
        bytes memory _code = type(ClaimTopicsRegistryProxy).creationCode;
        bytes memory _constructData = abi.encode(_implementationAuthority);
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return deploy(_salt, bytecode);
    }

    /// function used to deploy modular compliance contract using CREATE2
    function deployMC(string memory _salt, address _implementationAuthority)
        internal
        returns (address)
    {
        bytes memory _code = type(ModularComplianceProxy).creationCode;
        bytes memory _constructData = abi.encode(_implementationAuthority);
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return deploy(_salt, bytecode);
    }

    /// function used to deploy an identity registry storage using CREATE2
    function deployIRS(string memory _salt, address _implementationAuthority)
        internal
        returns (address)
    {
        bytes memory _code = type(IdentityRegistryStorageProxy).creationCode;
        bytes memory _constructData = abi.encode(_implementationAuthority);
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return deploy(_salt, bytecode);
    }

    /// function used to deploy an identity registry using CREATE2
    function deployIR(
        string memory _salt,
        address _implementationAuthority,
        address _trustedIssuersRegistry,
        address _claimTopicsRegistry,
        address _identityStorage
    ) internal returns (address) {
        bytes memory _code = type(IdentityRegistryProxy).creationCode;
        bytes memory _constructData = abi.encode(
            _implementationAuthority,
            _trustedIssuersRegistry,
            _claimTopicsRegistry,
            _identityStorage
        );
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return deploy(_salt, bytecode);
    }

    /// function used to deploy a token using CREATE2
    function deployToken(
        string memory _salt,
        address _implementationAuthority,
        address _identityRegistry,
        address _compliance,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _ONCHAINID
    ) internal returns (address) {
        bytes memory _code = type(TokenProxy).creationCode;
        bytes memory _constructData = abi.encode(
            _implementationAuthority,
            _identityRegistry,
            _compliance,
            _name,
            _symbol,
            _decimals,
            _ONCHAINID
        );
        bytes memory bytecode = abi.encodePacked(_code, _constructData);
        return deploy(_salt, bytecode);
    }

    /**
     *  @dev See {ITREXFactory-recoverContractOwnership}.
     */
    function recoverContractOwnership(address _contract, address _newOwner)
        external
        override
        onlyOwner
    {
        (Ownable(_contract)).transferOwnership(_newOwner);
    }
}
