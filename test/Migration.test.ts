/* eslint-disable prefer-const */
import { tracer } from "hardhat";
import "@nomiclabs/hardhat-web3";
import { expect, assert } from "chai";
import { Contract } from "ethers";
import hre, { ethers, web3 } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
const web3Utils = require('web3-utils');

import addClaim from "../scripts/addClaim";
import fetchArtifacts from "../scripts/artifacts";
import deployArtifacts from "../scripts/deployArtifacts";
import deployIdentityProxye from "../scripts/identityProxy";
import addMarketplaceClaim from "../scripts/addMarketplaceClaim";
import fetchOffers from "../scripts/fetchOffers";

import { Console } from "console";

const propertyTokenBytecode =
  require("./../artifacts/contracts/propertyToken.sol/PropertyToken.json").bytecode;
const identityBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/Identity.sol/Identity.json").bytecode;
const implementationAuthorityBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol/ImplementationAuthority.json").bytecode;
const identityProxyBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/proxy/IdentityProxy.sol/IdentityProxy.json").bytecode;

const buyFeePercentage = 500; // 5 percentage  (500 / 10000 * 100) = 5%
let buyFeeReceiver: string;
let FactoryInstance;
let tokenAddress: any;
let user1: any;
let user2: any;
let agent: any;
let claimTopicsRegistry: any;
let trustedIssuersRegistry: any;
let identityRegistryStorage: any;
let identityRegistry: any;
let modularCompliance: any;
let token: any;
let Implementation: any;
let implementationSC: Contract;
let factory: Contract;
let user1Contract: Contract;
let user2Contract: Contract;
let tokeny: any;
let accounts: any;
let Marketplace: Contract;
let StableCoin: Contract;
let RShareInstance: Contract;
let RTInstance: Contract;
let JEuro: Contract;
let jTry: Contract;
let tokenDetails: any;
let claimDetails: any;
let claimIssuer: any;
let JUSDC: Contract;
let MP: any;
let mock1: Contract;
let mock2: Contract;
let mock3: Contract;
let finder: Contract;
let priceFeed: Contract;
let Marketplace2: Contract;
let MarketplaceLib: Contract;
let rentDistributor: Contract;
const signer: any = web3.eth.accounts.create();
const signerKey = web3.utils.keccak256(
  web3.eth.abi.encodeParameter("address", signer.address)
);

let TOOOOKENN: Contract;
let initialized: any;

describe.only("ERC3643", function () {
  initialized = false;
  before("NEWSETUP: Deploying factory ", async function () {
      //---------------FETCHING ARTIFACTS---------------------------------

      const {
        ClaimTopicsRegistry,
        TrustedIssuersRegistry,
        IdentityRegistryStorage,
        IdentityRegistry,
        ModularCompliance,
        Token,
        IssuerIdentity,
        Implementation,
        TREXFactory
      } = await fetchArtifacts();

      //---------------FETCHING ACCOUNTS---------------------------------

      accounts = await hre.ethers.getSigners();
      buyFeeReceiver = accounts[0].address;
      const abiCoder = new ethers.utils.AbiCoder();

      // console.log("accounts", accounts);
      tokeny = accounts[0];
      claimIssuer = accounts[1];
      user1 = accounts[2];
      user2 = accounts[3];
      agent = accounts[4];
      const claimTopics = [7];
      console.log("agent :", agent.address);

      //---------------------DEPLOYING ARTIFACTS-------------------------------

      let {
        claimTopicsRegistry,
        trustedIssuersRegistry,
        identityRegistryStorage,
        identityRegistry,
        modularCompliance,
        token
      } = await deployArtifacts(
        tokeny,
        ClaimTopicsRegistry,
        TrustedIssuersRegistry,
        IdentityRegistryStorage,
        IdentityRegistry,
        ModularCompliance,
        Token
      );

      //---------------SETTING IMPLEMENTATION AUTHORITY----------------------

      implementationSC = await Implementation.connect(tokeny).deploy();
      await implementationSC.deployed();
      const tx1 = await implementationSC.setCTRImplementation(
        claimTopicsRegistry.address
      );
      await tx1.wait();
      const tx2 = await implementationSC.setTIRImplementation(
        trustedIssuersRegistry.address
      );
      await tx2.wait();
      const tx3 = await implementationSC.setIRSImplementation(
        identityRegistryStorage.address
      );
      await tx3.wait();
      const tx4 = await implementationSC.setIRImplementation(
        identityRegistry.address
      );
      await tx4.wait();
      const tx5 = await implementationSC.setTokenImplementation(token.address);
      await tx5.wait();
      const tx6 = await implementationSC.setMCImplementation(
        modularCompliance.address
      );
      await tx6.wait();

      //--------------------------DEPLOYING FACTORY--------------------------

      factory = await TREXFactory.connect(tokeny).deploy(
        implementationSC.address
      );
      await factory.deployed();

      //------------------DEPLOYING CLAIMISSUER CONTRACT----------------------

      const claimIssuerContract = await IssuerIdentity.connect(
        claimIssuer
      ).deploy(claimIssuer.address);
      await claimIssuerContract.deployed();

      console.log("claim issuer is : ", claimIssuer.address);
      const addKey = await claimIssuerContract
        .connect(claimIssuer)
        .addKey(signerKey, 3, 1);
      await addKey.wait();

      //---------------------------ADDING USER1 CLAIM---------------------------

      user1Contract = await deployIdentityProxye(user1);
      await addClaim(user1Contract, user1, signer, claimIssuerContract);

      console.log("User 1 claim added!");
      //---------------------------ADDING USER2 CLAIM----------------------------

      user2Contract = await deployIdentityProxye(user2);
      //addClaim(userIdentityProxy, user, singer, claimIssuerContract)
      await addClaim(user2Contract, user2, signer, claimIssuerContract);
      console.log("User 2 claim added!");

      //---------------DEPLOYING STABLE COIN---------------------------------
      //TODO:change ANERC20
      const SC = await hre.ethers.getContractFactory("ANERC20");
      StableCoin = await SC.deploy();
      await StableCoin.deployed();
      const tx8 = await StableCoin.mint(
        user2.address,
        ethers.utils.parseUnits("10000000000000000", 8)
      );
      await tx8.wait();
      const tx9 = await StableCoin.mint(
        user1.address,
        ethers.utils.parseUnits("10000000000000000", 8)
      );
      await tx9.wait();

      //---------------USDC -----------------------------------------------
      const USDC = await hre.ethers.getContractFactory(
        "MintableBurnableSyntheticTokenPermit"
      );
      JUSDC = await USDC.deploy("jUSDC", "jUSDC", 6);
      await JUSDC.deployed();
      console.log("JUSDC : ", JUSDC.address);

      const tx12200 = await JUSDC.addMinter(accounts[0].address);
      await tx12200.wait();

      const tx101 = await JUSDC.mint(
        user2.address,
        ethers.utils.parseUnits("1000000000000000000000000", 6)
      );
      await tx101.wait();

      //---------------DEPLOYING jEURO COIN---------------------------------
      const JE = await hre.ethers.getContractFactory(
        "MintableBurnableSyntheticTokenPermit"
      );
      JEuro = await JE.deploy("jEUR", "jEUR", 18);
      await JEuro.deployed();
      console.log("JEuro : ", JEuro.address);

      const tx122121 = await JEuro.addMinter(accounts[0].address);
      await tx122121.wait();

      const tx10 = await JEuro.mint(
        user2.address,
        ethers.utils.parseUnits("1000000000", 18)
      );
      await tx10.wait();

      const tx11110 = await JEuro.mint(
        "0xF1f6Cc709c961069D33F797575eA966c94C1357B",
        ethers.utils.parseUnits("1000000000", 18)
      );
      await tx11110.wait();
      //StableCoin.mint(user1.address, ethers.utils.parseUnits("10000", 18));

      const JTRY = await hre.ethers.getContractFactory(
        "MintableBurnableSyntheticTokenPermit"
      );
      jTry = await JTRY.deploy("jTRY", "jTRY", 18);
      console.log("jTry : ", jTry.address);
      await jTry.deployed();
      const tx122111 = await jTry.addMinter(accounts[0].address);
      await tx122111.wait();
      const tx11 = await jTry.mint(
        user2.address,
        ethers.utils.parseUnits("1000000000", 18)
      );
      await tx11.wait();
      const tx11000 = await jTry.mint(
        "0xF1f6Cc709c961069D33F797575eA966c94C1357B",
        ethers.utils.parseUnits("1000000000", 18)
      );
      await tx11000.wait();
      const MA1 = await hre.ethers.getContractFactory("MockRandomAggregator");

      //----------------------DEPLOYING REWARD TOKEN----------------------

      const RT = await hre.ethers.getContractFactory("MintableBurnableSyntheticTokenPermit");
      RTInstance = await RT.deploy("vTRY", "vTRY", 18);
      await RTInstance.deployed();
      console.log("Reward Token Address : ", RTInstance.address);

      //----------------------DEPLOYING STAKING CONTRACTS-------------------

      const RShareLib = await hre.ethers.getContractFactory("RentShareLib");
      const RSLib = await RShareLib.deploy();
      await RSLib.deployed();
  

      const RShare = await hre.ethers.getContractFactory("RentShare", {
        libraries: {
          RentShareLib: RSLib.address,
        },
      });

      RShareInstance = await RShare.deploy(RTInstance.address);
      await RShareInstance.deployed();

      const tx122921 = await RTInstance.addMinter(RShareInstance.address);
      await tx122921.wait();
  
      console.log("Staking Manger Address : ", RShareInstance.address);

      //----------------------DEPLOYING PRICEFEED CONTRACTS-------------------
      const PriceFeedLib = await hre.ethers.getContractFactory("PriceFeedLib");
      const pfLib = await PriceFeedLib.deploy();
      await pfLib.deployed();

      const PF = await hre.ethers.getContractFactory("priceFeed", {
        libraries: {
          PriceFeedLib: pfLib.address,
        },
      });
      priceFeed = await PF.deploy();
      await priceFeed.deployed();
      console.log("Price Feed Address : ", priceFeed.address);

      //----------------------DEPLOYING MockAggregatorV3 - 1  CONTRACTS-------------------

      mock1 = await MA1.deploy(ethers.utils.parseUnits("0.05332091", 8), 1);
      await mock1.deployed();
      //await mock1.setPriceUpdate(ethers.utils.parseUnits("5329349", 0));
      console.log("mock1 Address : ", mock1.address);

      mock2 = await MA1.deploy(ethers.utils.parseUnits("1.07194", 8), 1);
      await mock2.deployed();
      // await mock2.setPriceUpdate(ethers.utils.parseUnits("106131000", 0));
      console.log("mock2 Address : ", mock2.address);

      mock3 = await MA1.deploy(ethers.utils.parseUnits("0.99997503", 8), 1);
      await mock3.deployed();
      // await mock2.setPriceUpdate(ethers.utils.parseUnits("106131000", 0));
      console.log("mock3 Address : ", mock3.address);

      await priceFeed.setCurrencyToFeed("TRYUSD", jTry.address, mock1.address);
      await priceFeed.setCurrencyToFeed("EURUSD", JEuro.address, mock2.address);
      await priceFeed.setCurrencyToFeed("USDCUSD", JUSDC.address, mock3.address);
      //---------------------------DEPLOYING FINDER----------------------

      const FNDR = await hre.ethers.getContractFactory("Finder");
      finder = await FNDR.deploy([tokeny.address, tokeny.address]);
      await finder.deployed();
      console.log("Finder => ", finder.address);
      const RentshareInterface = '0x72656e7453686172650000000000000000000000000000000000000000000000';
      const PriceFeedInterface = '0x7072696365466565640000000000000000000000000000000000000000000000';
      const PropertyTokenInterface = '0x70726f7065727479546f6b656e00000000000000000000000000000000000000';
      const IndentityInterface = '0x6964656e74697479000000000000000000000000000000000000000000000000';
      const ImplementationAuthorityInterface = '0x696d706c656d656e746174696f6e417574686f72697479000000000000000000';
      const IdentityProxyInterface = '0x6964656e7469747950726f787900000000000000000000000000000000000000';
      const Maintainer = "0x126303c860ea810f85e857ad8768056e2eebc24b7796655ff3107e4af18e3f1e";
      const MarketplaceInterface = "0x4d61726b6574706c616365000000000000000000000000000000000000000000";
      const burnerRole = "0xe4b2a1ba12b0ae46fe120e095faea153cf269e4b012b647a52a09f4e0e45f179";
      const RewardTokenInterface = "0x526577617264546f6b656e000000000000000000000000000000000000000000";

      //set RentShare address
      let tx0000011 = await finder.changeImplementationAddress(RentshareInterface, RShareInstance.address);
      await tx0000011.wait();
      //set PriceFeed address
      let tx0000012 = await finder.changeImplementationAddress(PriceFeedInterface, priceFeed.address);
      await tx0000012.wait();
      let tx0000013 = await finder.changeImplementationBytecode(PropertyTokenInterface, propertyTokenBytecode);
      await tx0000013.wait();
      let tx0000014 = await finder.changeImplementationBytecode(IndentityInterface, identityBytecode);
      await tx0000014.wait();
      let tx0000015 = await finder.changeImplementationBytecode(ImplementationAuthorityInterface, implementationAuthorityBytecode);
      await tx0000015.wait();
      let tx0000016 = await finder.changeImplementationBytecode(IdentityProxyInterface, identityProxyBytecode);
      await tx0000016.wait();
      let tx0000017 = await finder.changeImplementationAddress(RewardTokenInterface, RTInstance.address);
      await tx0000017.wait();

      //---------------------------DEPLOYING MARKETPLACE----------------------
      console.log("Before Marketplace Deployment ...");
      
      const Lib = await hre.ethers.getContractFactory("MarketplaceLib");
      MarketplaceLib = await Lib.deploy();
      await MarketplaceLib.deployed();

      MP = await hre.ethers.getContractFactory("Marketplace",
      {
        libraries: {
          MarketplaceLib: MarketplaceLib.address,
        },
      });
      console.log("User1 address is :", user1.address);

      Marketplace = await MP.connect(user1).deploy(
        [finder.address,
        buyFeePercentage,
        buyFeeReceiver]
      );

      await Marketplace.deployed();
      //TODO:
      await RShareInstance.grantRole(Maintainer, Marketplace.address);
      console.log("after marketplace deplyment");
      
      let tx0000019 = await finder.changeImplementationAddress(MarketplaceInterface, Marketplace.address);
      await tx0000019.wait();

      //TODO:
      const tx11111 = await JEuro.mint(
        Marketplace.address,
        ethers.utils.parseUnits("100000000000000000", 18)
      );
      await tx11111.wait();
      const tx12221 = await jTry.mint(
        user2.address,
        ethers.utils.parseUnits("100000000000000000", 18)
      );
      await tx12221.wait();

      console.log("Before Adding Claim");

      //---------------ADDING MARKETPLACE CLAIM ----------------------
      console.log("Marketplace => ", Marketplace.address);
      console.log("claimIssuerContract => ", claimIssuerContract.address);
      const MarketPlaceIdentity = await addMarketplaceClaim(
        Marketplace,
        user1,
        signer,
        claimIssuerContract
      );
      console.log("After")
      const tx14 = await StableCoin.mint(
        Marketplace.address,
        ethers.utils.parseUnits("200000000000000000000", 8)
      );
      await tx14.wait();

      //await Marketplace.connect(user1).addClaim();
      console.log("before initializable");

      //---------------ADDING MARKETPLACE CLAIM 2----------------------
      Marketplace2 = await MP.connect(user1).deploy(
        [finder.address,
        buyFeePercentage,
        buyFeeReceiver]
      );
      
      const MarketPlaceIdentity2 = await addMarketplaceClaim(
        Marketplace2,
        user1,
        signer,
        claimIssuerContract
      );

      const tx142 = await StableCoin.mint(
        Marketplace2.address,
        ethers.utils.parseUnits("200000000000000000000", 8)
      );
      await tx14.wait();

      //await Marketplace.connect(user1).addClaim();
      console.log("before initializable");
      //---------------------------DEPLOY T-REX SUIT-----------------------------

      console.log("Tokeny.address :", tokeny.address);
      console.log("agent.address :", agent.address);
      console.log(
        "Claim IssuerContract address : ",
        claimIssuerContract.address
      );

      tokenDetails = {
        owner: tokeny.address,
        name: "XEFR1",
        symbol: "XEFR1",
        decimals: 18,
        irs: "0x0000000000000000000000000000000000000000",
        ONCHAINID: "0x0000000000000000000000000000000000000042",
        irAgents: [tokeny.address, agent.address],
        tokenAgents: [tokeny.address, agent.address],
        complianceModules: [],
        complianceSettings: []
      };
      //TODO: WHAT 7 IS DOING?
      claimDetails = {
        claimTopics: [7],
        issuers: [claimIssuerContract.address],
        issuerClaims: [[7]]
      };
      const tx15 = await factory
        .connect(tokeny)
        .deployTREXSuite("test", tokenDetails, claimDetails);
      await tx15.wait();
      console.log("factory : ", factory.address);
      console.log("After initializable");

      //------------------FETCHING TOKEN AND IDENTITY INSTANCE----------------------

      const tokenAddress = await factory.getToken("test");
      console.log("tokenAddress", tokenAddress);
      TOOOOKENN = await hre.ethers.getContractAt("Token", tokenAddress);

      const identityRegistryAddressA = await TOOOOKENN.identityRegistry();

      console.log("identityRegistryAddress", identityRegistryAddressA);
      identityRegistry = await hre.ethers.getContractAt(
        "IdentityRegistry",
        identityRegistryAddressA
      );

      console.log("Fetching Done!");

      //------------------REGISTER IDENTITY FOR USER1, USER2 & Marketplace ----------------------

      const tx16 = await identityRegistry
        .connect(agent)
        .registerIdentity(user1.address, user1Contract.address, 91);
      await tx16.wait();
      const tx17 = await identityRegistry
        .connect(agent)
        .registerIdentity(user2.address, user2Contract.address, 101);
      await tx17.wait();
      const tx18 = await identityRegistry
        .connect(agent)
        .registerIdentity(Marketplace.address, MarketPlaceIdentity, 101);
      await tx18.wait();
      const tx19 = await identityRegistry
        .connect(agent)
        .registerIdentity(Marketplace2.address, MarketPlaceIdentity2, 191);
      await tx19.wait();
      console.log("Identity Added!");

      //------------------PRINTING IMPLEMENTATION ADDRESSES-------------------------

      console.log(
        "ClaimTopicsRegistry deployed to:",
        claimTopicsRegistry.address
      );
      console.log("TrustedIssuersRegistry", trustedIssuersRegistry.address);
      console.log("IdentityRegistry", identityRegistry.address);
      console.log("IdentityRegistryStorage", identityRegistryStorage.address);
      console.log("ModularCompliance", modularCompliance.address);
      console.log("Token", token.address);
      console.log("Implementation", implementationSC.address);
      console.log("factory", factory.address);
      console.log("claimIssuerContract", claimIssuerContract.address);
      console.log("claimIssuer : ", claimIssuer.address);
      console.log("StableCoin : ", StableCoin.address);
      console.log("RShare : ", RShareInstance.address);
      console.log("PriceFeed : ", priceFeed.address);
      console.log("Marketplace :", Marketplace.address);
      console.log("Marketplace2 : ", Marketplace2.address);
      console.log("factory : ", factory.address);

      console.log("just before verify");

      const tx1199 = await TOOOOKENN.connect(agent).unpause();
      await tx1199.wait();
      const tx1221 = await TOOOOKENN.connect(agent).mint(
        user1.address,
        ethers.utils.parseUnits("100", 18)
      );
      await tx1221.wait();
      console.log("Minting Done!");
      console.log("Marketplace Address => ", Marketplace.address);
      let hasMaintainerROle = await RShareInstance.hasRole(Maintainer, Marketplace.address);
      console.log("hasMaintainerROle? : ", hasMaintainerROle);
      console.log("RShareInstance => ", RShareInstance.address);

      const tx1222 = await TOOOOKENN.connect(user1).approve(
        Marketplace.address,
        ethers.utils.parseUnits("200", 18)
      );
      await tx1222.wait();
      const tx111 = await Marketplace.connect(user1).addProperty(
        [TOOOOKENN.address, //address of legal token address
        100, //shares to lock and issue wrapped tokens
        20, //raito of legal to wrapped legal 1:100
        ethers.utils.parseUnits("100", 18), // total number of legal toens
        [ethers.utils.parseUnits("2", 18), jTry.address, mock1.address]] //price in dai/usdt/usdc, *jTry* currency in property details
        // ethers.utils.parseUnits("100", 18) //reward per token.
      );
      await tx111.wait();
      console.log("Property Added");

      const WLegalTokenAddess = await Marketplace.LegalToWLegal(
        TOOOOKENN.address
      );
      const WLegalTokenAddessInstance = await ethers.getContractAt(
        "PropertyToken",
        WLegalTokenAddess
      );
      const symbol = await WLegalTokenAddessInstance.symbol();
      await RShareInstance.updateRewardPerMonth(symbol, ethers.utils.parseUnits("500", 18));
      
      //----------------------------------------------------------------------------------------
      const rd = await hre.ethers.getContractFactory("RentDistributor");
      rentDistributor = await rd.deploy( RTInstance.address, jTry.address);
      await rentDistributor.deployed();
      console.log("RentDistributor => ", rentDistributor.address);
      //rewardToken

      const tx22222 = await RShareInstance.grantRole(burnerRole, rentDistributor.address);
      await tx22222.wait();

      const tx1120= await jTry.mint(
        rentDistributor.address,
        ethers.utils.parseUnits("1000000000", 18)
      );
      await tx1120.wait();

    
    });
  

  // it("NON ADMIN => MP:STABLECOIN ADDR = 0 => REVERT", async () => {
  //   await expect(
  //     MP.connect(user1).deploy(
  //       "0x0000000000000000000000000000000000000000",
  //       RShareInstance.address,
  //       priceFeed.address,
  //       propertyTokenBytecode,
  //       identityBytecode,
  //       implementationAuthorityBytecode,
  //       identityProxyBytecode
  //     )
  //   ).to.be.revertedWithCustomError(MP, "ZeroAddress");
  // });
  // it("EMPTY BYTES => MP:CONSTRUCTOR:PROPERTYBYTECODE => REVERT", async () => {
  //   await expect(
  //     MP.connect(user1).deploy(
  //       TOOOOKENN.address,
  //       RShareInstance.address,
  //       priceFeed.address,
  //       [],
  //       identityBytecode,
  //       implementationAuthorityBytecode,
  //       identityProxyBytecode
  //     )
  //   ).to.be.revertedWithCustomError(MP, "EmptyBytecode");
  // });
  // it("EMPTY BYTES => MP:CONSTRUCTOR:identityBytecode => REVERT", async () => {
  //   await expect(
  //     MP.connect(user1).deploy(
  //       TOOOOKENN.address,
  //       RShareInstance.address,
  //       priceFeed.address,
  //       propertyTokenBytecode,
  //       [],
  //       implementationAuthorityBytecode,
  //       identityProxyBytecode
  //     )
  //   ).to.be.revertedWithCustomError(MP, "EmptyBytecode");
  // });
  // it("EMPTY BYTES => CONSTRUCTOR:implementationAuthorityBytecode => REVERT", async () => {
  //   await expect(
  //     MP.connect(user1).deploy(
  //       TOOOOKENN.address,
  //       RShareInstance.address,
  //       priceFeed.address,
  //       propertyTokenBytecode,
  //       identityBytecode,
  //       [],
  //       identityProxyBytecode
  //     )
  //   ).to.be.revertedWithCustomError(MP, "EmptyBytecode");
  // });
  // it("EMPTY BYTES => CONSTRUCTOR:identityProxyBytecode => REVERT", async () => {
  //   await expect(
  //     MP.connect(user1).deploy(
  //       TOOOOKENN.address,
  //       RShareInstance.address,
  //       priceFeed.address,
  //       propertyTokenBytecode,
  //       identityBytecode,
  //       implementationAuthorityBytecode,
  //       []
  //     )
  //   ).to.be.revertedWithCustomError(MP, "EmptyBytecode");
  // });
  // it(" NON ADMIN => createIdentity => REVERT", async () => {
  //   await expect(
  //     Marketplace.connect(user2).createIdentity()
  //   ).to.be.revertedWithCustomError(MP, "OnlyAdminRole");
  // });
  // it("REVERT : callIdentity : NON ADMIN", async () => {
  //   await expect(
  //     Marketplace.connect(user2).callIdentity(
  //       "0x0000000000000000000000000000000000000000",
  //       "0x00"
  //     )
  //   ).to.be.revertedWithCustomError(MP, "OnlyAdminRole");
  // });
  // it("ZER0 ADDR:STAKING CONTRACT ADDR => MP:CONSTURCTOR => REVERT ", async () => {
  //   await expect(
  //     MP.connect(user1).deploy(
  //       TOOOOKENN.address,
  //       "0x0000000000000000000000000000000000000000",
  //       priceFeed.address,
  //       propertyTokenBytecode,
  //       identityBytecode,
  //       implementationAuthorityBytecode,
  //       identityProxyBytecode
  //     )
  //   ).to.be.revertedWithCustomError(MP, "ZeroAddress");

  // });
  // it("ERC3643 => f(MINT) => USER1", async function () {
  //   await TOOOOKENN.connect(agent).unpause();
  //   await TOOOOKENN.connect(agent).mint(
  //     user1.address,
  //     ethers.utils.parseUnits("100", 8)
  //   ); // => total minted 1000 user2 = 1000
  //   console.log("Minting Done!");
  // });

  // it("ERC3643 => f(MINT) => USER2", async function () {
  //   await TOOOOKENN.connect(agent).mint(
  //     user2.address,
  //     ethers.utils.parseUnits("1000", 18)
  //   ); // => total minted 1000 user2 = 1000
  //   console.log("Minting Done!");
  // });

  // it("ERC3643 => f(MINT) => marketplace", async function () {
  //   await TOOOOKENN.connect(agent).mint(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("1000", 18)
  //   ); // => total minted 2000 user2 = 1000, marketplace = 1000
  //   console.log("Minting Done!");
  // });

  // it("f(transfer) => marketplace", async function () {
  //   await TOOOOKENN.connect(agent).mint(
  //     user2.address,
  //     ethers.utils.parseUnits("1000", 18)
  //   ); // => total minted 3000 user2 = 1000, marketplace = 2000
  //   console.log("Minting done!");
  //   await TOOOOKENN.connect(agent).unpause();
  //   await TOOOOKENN.connect(user2).transfer(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("1000", 18)
  //   ); // => total minted 3000 user2 = 1000, marketplace = 2000
  //   console.log("Transfer Done!");
  // });

  // it("transfer => Verified account", async function () {
  //   await TOOOOKENN.connect(agent).mint(
  //     user2.address,
  //     ethers.utils.parseUnits("1000", 18)
  //   ); // => total minted 4000 user2 = 2000, marketplace = 2000
  //   console.log("Minting done!");
  //   await TOOOOKENN.connect(user2).transfer(
  //     user1.address,
  //     ethers.utils.parseUnits("1000", 18)
  //   ); // => total minted 4000, user1:1000 user2:1000, marketplace:2000
  //   console.log("Transfer Done!");
  // });

  // it("transfer => nonVerified account => revert", async function () {
  //   await TOOOOKENN.connect(agent).mint(
  //     user2.address,
  //     ethers.utils.parseUnits("1000", 18)
  //   ); // => total minted 5000, user1:1000 user2:2000, marketplace:2000
  //   console.log("Minting done!");
  //   await expect(
  //     TOOOOKENN.connect(user2).transfer(
  //       accounts[12].address,
  //       ethers.utils.parseUnits("1000", 18)
  //     )
  //   ).to.be.revertedWith("Transfer not possible");
  // });

  // it("_legalSharesToLock = 0 => f(ADDPROPERTY) => REVERT", async function () {
  //   await expect(
  //     Marketplace.connect(user1).addProperty(
  //       TOOOOKENN.address, //address of legal token address
  //       0, //shares to lock and issue wrapped tokens
  //       ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
  //       ethers.utils.parseUnits("1000", 18), // total number of legal toens
  //       [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
  //       ethers.utils.parseUnits("100", 18) //reward per token.
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThanZero");
  // });
  // it("_tokensPerLegalShares = 0 => f(addProperty) => REVERT", async function () {
  //   await expect(
  //     Marketplace.connect(user1).addProperty(
  //       TOOOOKENN.address, //address of legal token address
  //       ethers.utils.parseUnits("100", 18), //shares to lock and issue wrapped tokens
  //       0, //raito of legal to wrapped legal 1:100
  //       ethers.utils.parseUnits("1000", 18), // total number of legal toens
  //       [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
  //       ethers.utils.parseUnits("100", 18) //reward per token.
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThanZero");
  // });
  // it("_totalLegalShares < _legalSharesToLock => f(addProperty) => REVERT", async function () {
  //   await expect(
  //     Marketplace.connect(user1).addProperty(
  //       TOOOOKENN.address, //address of legal token address
  //       ethers.utils.parseUnits("1000", 18), //shares to lock and issue wrapped tokens
  //       ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
  //       ethers.utils.parseUnits("100", 18), // total number of legal toens
  //       [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
  //       ethers.utils.parseUnits("100", 18) //reward per token.
  //     )
  //   ).to.be.revertedWithCustomError(
  //     Marketplace,
  //     "totalMustBeGreaterThanToLock"
  //   );
  // });
  // it("PRICE = 0 => f(ADDPROPERTY) => REVERT", async function () {
  //   await expect(
  //     Marketplace.connect(user1).addProperty(
  //       TOOOOKENN.address, //address of legal token address
  //       ethers.utils.parseUnits("100", 18), //shares to lock and issue wrapped tokens
  //       ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
  //       ethers.utils.parseUnits("1000", 18), // total number of legal toens
  //       [0, StableCoin.address, mock1.address], //price in dai/usdt/usdc
  //       ethers.utils.parseUnits("100", 18) //reward per token.
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThanZero");
  // });

  // it("ADMIN => f(ADDPROPERTY)", async function () {});

  // it("USED LEGALTOKEN ADDR => f(ADDPROPERTY) => REVERT", async function () {
  //   await expect(
  //     Marketplace.connect(user1).addProperty(
  //       TOOOOKENN.address, //address of legal token address
  //       ethers.utils.parseUnits("100", 18), //shares to lock and issue wrapped tokens
  //       ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
  //       ethers.utils.parseUnits("1000", 18), // total number of legal toens
  //       [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
  //       ethers.utils.parseUnits("100", 18) //reward per token.
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "PropertyAlreadyExist");
  // });
  // it("LEGAL TOKEN ADDRESS = 0x00 => f(ADDPROPERTY) => REVERT", async function () {
  //   await expect(
  //     Marketplace.connect(user1).addProperty(
  //       "0x0000000000000000000000000000000000000000", //address of legal token address
  //       ethers.utils.parseUnits("100", 18), //shares to lock and issue wrapped tokens
  //       ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
  //       ethers.utils.parseUnits("1000", 18), // total number of legal toens
  //       [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
  //       ethers.utils.parseUnits("100", 18) //reward per token.
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "ZeroAddress");
  // });
  it("anyone => f(BUY)", async function () {
    console.log("inside any can buy ... ");
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken",
      WLegalTokenAddess
    );

    await jTry
      .connect(user2)
      .approve(Marketplace.address, ethers.utils.parseUnits("200000", 18));

    const BeforeStableUserBalance = await jTry.balanceOf(user2.address);
    console.log("Before Stable User Tokens  =>", BeforeStableUserBalance);
    await Marketplace.connect(user2).swap([
      jTry.address,
      WLegalTokenAddess,
      10
    ]);

    const AfterStablUsereBalance = await jTry.balanceOf(user2.address);
    console.log("After Stable User TOkens  =>", AfterStablUsereBalance);

    const AfterStableMarketplaceBalance = await jTry.balanceOf(
      Marketplace.address
    );
    console.log(
      "After Stable Marketplace TOkens  =>",
      AfterStableMarketplaceBalance
    );

    const PropertyBalance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    console.log("Property TOkens  =>", PropertyBalance);
  });
  it("anyone => f(SELL)", async function () {
    const tx119 = await Marketplace.connect(user1).changeSellState();
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken",
      WLegalTokenAddess
    );
    const symbol = await WLegalTokenAddessInstance.symbol();
    await RShareInstance.connect(user2).harvestRewards(symbol);

    await WLegalTokenAddessInstance.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("2000000", 8)
    );

    //set Currency to Feed
    const check = await priceFeed.getCurrencyToFeed(jTry.address);
    console.log("price to feed for stablecoin is ", check);

    await Marketplace.connect(user2).swap([
      WLegalTokenAddess,
      jTry.address,
      10
    ]);
    const StableBalance = await jTry.balanceOf(user2.address);
    console.log("Stable TOkens  =>", StableBalance);
    const PropertyBalance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    console.log("Property TOkens  =>", PropertyBalance);
  });
  it("anyone => f(BUY) diffrent priceFeeds", async function () {
    // const peakyBlinder = await priceFeed.feedPriceChainlink(mock1.address);
    // console.log("peakyBlinder", peakyBlinder);
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken",
      WLegalTokenAddess
    );

    await JEuro.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("399504375000000000000", 0)
    );
    //398000000000000000000
    //3984000000000000000
    //1061310000000000000
    //397991250000000000000
    //399504375000000000000

    //set Currency to Feed

    const check = await priceFeed.getCurrencyToFeed(jTry.address);
    console.log("price to feed for stablecoin is ", check);

    await Marketplace.connect(user2).swap([
      JEuro.address,
      WLegalTokenAddess,
      10
    ]);

    const JEuroUser2Balance = await JEuro.balanceOf(user2.address);
    console.log("JEuro User Tokens  =>", JEuroUser2Balance);

    const JEuroMarketplaceBalance = await JEuro.balanceOf(Marketplace.address);
    console.log(
      "JEuro Marketplace Tokens  =>",
      ethers.utils.formatUnits(JEuroMarketplaceBalance, 18)
    );

    const PropertyBalance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    console.log(
      "Property TOkens  =>",
      ethers.utils.formatUnits(PropertyBalance, 0)
    );

    // const buyFeeAmount = await Marketplace.buyFeeAdmin(buyFeeReceiver, JEuro.address)
    // console.log("buyFeeAmount", ethers.utils.formatUnits(buyFeeAmount, 18)); //18 decimals of JEuro

    // await Marketplace.connect(user1).withdrawBuyFee(buyFeeReceiver, JEuro.address, buyFeeAmount);
    // let balanceOfAdmin = await JEuro.balanceOf(buyFeeReceiver);
    //console.log("balanceOfAdmin", ethers.utils.formatUnits(balanceOfAdmin, 18)); //18 decimals of JEuro

  });
  it("anyone => redeem vTRY to jTRY", async function () {
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken",
      WLegalTokenAddess
    );
    const symbol = await WLegalTokenAddessInstance.symbol();
    await RShareInstance.connect(user2).harvestRewards(symbol);
    
    const approve22 = await RTInstance.connect(user2).approve(rentDistributor.address, ethers.utils.parseUnits("1000", 18));
    await approve22.wait();
    const test11111 = await rentDistributor.redeem(ethers.utils.parseUnits("1", 18));
    await test11111.wait();
  });

  it("anyone => f(SELL) diffrent priceFeeds", async function () {
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken",
      WLegalTokenAddess
    );

    await WLegalTokenAddessInstance.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("1000000000", 8)
    );

    const check = await priceFeed.getCurrencyToFeed(jTry.address);
    console.log("price to feed for stablecoin is ", check);

    await Marketplace.connect(user2).swap([
      WLegalTokenAddess,
      JEuro.address,
      10
    ]);

    const JEuroUser2Balance = await JEuro.balanceOf(user2.address);
    console.log("JEuro User Tokens  =>", JEuroUser2Balance);

    const JEuroMarketplaceBalance = await JEuro.balanceOf(Marketplace.address);
    console.log("JEuro Marketplace Tokens  =>", JEuroMarketplaceBalance);

    const PropertyBalance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    console.log("Property TOkens  =>", PropertyBalance);
  });

  it("anyone => f(BUY) via 6 decimal", async function () {

    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken",
      WLegalTokenAddess
    );

    await JUSDC.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("399504375000000000000", 0)
    );
    //set Currency to Feed

    await Marketplace.connect(user2).swap([
      JUSDC.address,
      WLegalTokenAddess,
      10
    ]);

    const JUSDCUser2Balance = await JUSDC.balanceOf(user2.address);
    console.log("JUSDC User Tokens  =>", ethers.utils.formatUnits(JUSDCUser2Balance, 6));

    const JUSDCMarketplaceBalance = await JUSDC.balanceOf(Marketplace.address);
    console.log(
      "JUSDC Marketplace Tokens  =>",
      ethers.utils.formatUnits(JUSDCMarketplaceBalance, 6)
    );

    const PropertyBalance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    console.log(
      "Property TOkens  =>",
      ethers.utils.formatUnits(PropertyBalance, 0)
    );

  });



  // it("Calling Migration Function", async function () {
  //   const MarketplaceInterface = "0x4d61726b6574706c616365000000000000000000000000000000000000000000";
  //   let tx0000019 = await finder.changeImplementationAddress(MarketplaceInterface, Marketplace2.address);
  //   await tx0000019.wait();
  //   await Marketplace.connect(user1).migrate(TOOOOKENN.address, Marketplace2.address);
  //   let LegalTokenMarketplaceBalance = await TOOOOKENN.balanceOf(Marketplace2.address);
  //   console.log("TOOOKEN balance of Marketplace2 => ", ethers.utils.formatUnits(`${LegalTokenMarketplaceBalance}`, 18));
  // });
  // it("NON ADMIN => f(UNLOCK PARTIAL LEGAL) => REVERT", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   await WLegalTokenAddessInstance.approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("10000", 18)
  //   );
  //   await expect(
  //     Marketplace.connect(user2).unlockParialLegal(TOOOOKENN.address, 50)
  //   ).to.be.revertedWithCustomError(Marketplace, "OnlyAdminRole");
  // });

  // it("Admin => f(UNLOCK PARTIAL LEGAL)", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   await WLegalTokenAddessInstance.approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("10000", 18)
  //   );
  //   await Marketplace.connect(user1).unlockParialLegal(TOOOOKENN.address, 50); //now user1 has 50 tokens left.
  //   //await Marketplace.connect(user1).removeProperty(TOOOOKENN.address);
  // });
  // it("NON ADMIN => f(addMoreWLegalToken) => REVERT", async function () {
  //   await TOOOOKENN.connect(user1).approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("50", 18)
  //   );
  //   await expect(
  //     Marketplace.connect(user2).addMoreWLegalTokens(
  //       TOOOOKENN.address,
  //       ethers.utils.parseUnits("50", 18)
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "OnlyAdminRole"); //now back to 100
  // });
  // it("NON ADMIN => f(addMoreWLegalToken)", async function () {
  //   await TOOOOKENN.connect(user1).approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("50", 18)
  //   );
  //   await Marketplace.connect(user1).addMoreWLegalTokens(
  //     TOOOOKENN.address,
  //     ethers.utils.parseUnits("50", 18)
  //   ); //now back to 100
  // });

  // it("NON ADMIN => f(updatePrice) => REVERT", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   await expect(
  //     Marketplace.connect(user2).updatePrice(
  //       WLegalTokenAddess,
  //       ethers.utils.parseUnits("100", 18)
  //     )
  //   ).to.be.revertedWithCustomError(MP, "OnlyAdminRole");
  // });
  // it("_token != exisit => f(updatePrice) => REVERT", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   await expect(
  //     Marketplace.connect(user1).updatePrice(
  //       Marketplace.address,
  //       ethers.utils.parseUnits("100", 18)
  //     )
  //   ).to.be.revertedWithCustomError(MP, "invalidToken");
  // });
  // it("ADMIN => f(updatePrice)", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   await Marketplace.connect(user1).updatePrice(
  //     WLegalTokenAddess,
  //     ethers.utils.parseUnits("2", 18)
  //   );
  // });
  // it("WLegal Holder => f(createSellOffer):!tokenExisits => revert", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const user2Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user2.address
  //   );
  //   await WLegalTokenAddessInstance.connect(user2).approve(
  //     Marketplace.address,
  //     user2Balance
  //   );
  //   await expect(
  //     Marketplace.connect(user2).createSellOffer(
  //       Marketplace.address,
  //       user2Balance,
  //       ethers.utils.parseUnits("3", 18)
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "invalidToken");
  // });
  // it("WLegal Holder => f(createSellOffer):BalanceMustBeGreaterThenAmount => revert", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const user2Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user2.address
  //   );
  //   await WLegalTokenAddessInstance.connect(user2).approve(
  //     Marketplace.address,
  //     user2Balance
  //   );
  //   await expect(
  //     Marketplace.connect(user2).createSellOffer(
  //       WLegalTokenAddess,
  //       ethers.utils.parseUnits("10000000", 18),
  //       ethers.utils.parseUnits("3", 18)
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThenAmount");
  // });
  // it("WLegal Holder => f(createSellOffer):AllowenceMustBeGreaterThenAmount => revert", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const user2Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user2.address
  //   );
  //   await WLegalTokenAddessInstance.connect(user2).approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("1", 18)
  //   );
  //   await expect(
  //     Marketplace.connect(user2).createSellOffer(
  //       WLegalTokenAddess,
  //       ethers.utils.parseUnits("10", 18),
  //       ethers.utils.parseUnits("3", 18)
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThenAmount");
  // });

  // it("WLegal Holder => f(createSellOffer)", async function () {
  //   //--------------------FETCHING INSTANCE---------------------------------
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   //----------------------------------------------------------------
  //   //CHECKING BALANCE
  //   const user2Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user2.address
  //   );
  //   console.log("user2 has amount in WlegalTOkens => ", user2Balance / 1e18);
  //   //APPROVING TO MARKETPLACE TO PLACE A SELL OFFER
  //   await WLegalTokenAddessInstance.connect(user2).approve(
  //     Marketplace.address,
  //     user2Balance
  //   );
  //   //CREATING A SELL OFFER.
  //   await Marketplace.connect(user2).createSellOffer(
  //     WLegalTokenAddess,
  //     user2Balance,
  //     ethers.utils.parseUnits("3", 18)
  //   );
  // });

  // it("WLegal Holder => f(viewSellOffers)", async function () {
  //   const { sellerAddresses, offers } = await fetchOffers(
  //     TOOOOKENN,
  //     Marketplace
  //   );
  // });

  // it("ANYONE => f(buyOffer) => (buying == sellOffer)", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const { sellerAddresses, offers } = await fetchOffers(
  //     TOOOOKENN,
  //     Marketplace
  //   );
  //   await StableCoin.connect(user1).approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("300000000000000000000", 18)
  //   );
  //   console.log("Address => ", sellerAddresses[0]);
  //   console.log("offers => ", offers[0]);
  //   await Marketplace.connect(user1).buyOffer(
  //     WLegalTokenAddess,
  //     sellerAddresses[0],
  //     offers[0][0]
  //   );
  // });
  // it("WLegal Holder => f(viewSellOffers) => whenNoOffers", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );

  //   let sellerAddresses = [];
  //   let offers = [];

  //   [sellerAddresses, offers] = await Marketplace.viewSellOffers(
  //     WLegalTokenAddess
  //   );
  //   expect(sellerAddresses.length).to.be.equal(0);
  // });

  // it("ANYONE => f(buyOffer) => (buying < sellOffer)", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const user1Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user1.address
  //   );
  //   await WLegalTokenAddessInstance.connect(user1).approve(
  //     Marketplace.address,
  //     user1Balance
  //   );
  //   console.log("user1 balance is => ", user1Balance / 10 ** 18);
  //   await Marketplace.connect(user1).createSellOffer(
  //     WLegalTokenAddess, //token address
  //     user1Balance, // amount of tokens to sell
  //     ethers.utils.parseUnits("1", 18) // price per token
  //   );
  //   await StableCoin.connect(user2).approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("3000000000000000000000000", 18)
  //   );
  //   console.log("ANYONE => f(buyOffer) => (buying < sellOffer)");
  //   // let sellerAddresses = [];
  //   // let offers = [];

  //   // const sellerAddresses = await fetchOffers(WLegalTokenAddess, Marketplace);
  //   // console.log("sellerAddresses[0] ", sellerAddresses.sellerAddresses[0]);
  //   // console.log("offers[0] ", sellerAddresses.offers[0]);

  //   await Marketplace.connect(user2).buyOffer(
  //     WLegalTokenAddess, //wlegalTOkenAddr
  //     user1.address, //Seller Addr
  //     ethers.utils.parseUnits("1", 18) //amount
  //   );
  // });

  // it("ANYONE => f(buyOffer) => (buying > sellOffer)", async function () {
  //   //------------------------------------------------------------------
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   //------------------------------------------------------------------

  //   // const user2Balance = await WLegalTokenAddessInstance.balanceOf(
  //   //   user2.address
  //   // );
  //   // await WLegalTokenAddessInstance.connect(user2).approve(
  //   //   Marketplace.address,
  //   //   user2Balance
  //   // );

  //   // await Marketplace.connect(user2).createSellOffer(
  //   //   WLegalTokenAddess,
  //   //   user2Balance,
  //   //   ethers.utils.parseUnits("3", 18)
  //   // );
  //   //------------------------------------------------------------------

  //   let sellerAddresses = [];
  //   let offers = [];

  //   [sellerAddresses, offers] = await Marketplace.viewSellOffers(
  //     WLegalTokenAddess
  //   );

  //   // await StableCoin.connect(user2).approve(
  //   //   Marketplace.address,
  //   //   ethers.utils.parseUnits("10000000000000000000000000", 18)
  //   // );
  //   const approvedTokenMarketplace = await WLegalTokenAddessInstance.allowance(
  //     user1.address,
  //     Marketplace.address
  //   );
  //   console.log("approvedTOkens are ", approvedTokenMarketplace / 10 ** 18);
  //   await Marketplace.connect(user2).buyOffer(
  //     WLegalTokenAddess, //wlegalTOkenAddr
  //     user1.address, //Seller Addr
  //     ethers.utils.parseUnits("100", 18) //amount
  //   );
  // });

  // it("ANYONE => f(sell)", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const user2Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user2.address
  //   );

  //   await WLegalTokenAddessInstance.connect(user2).approve(
  //     Marketplace.address,
  //     user2Balance
  //   );
  //   await Marketplace.connect(user2).sell(
  //     WLegalTokenAddessInstance.address,
  //     user2Balance
  //   );
  // });

  // it("NON ADMIN => f(removeProperty) => REVERT", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const balance = await WLegalTokenAddessInstance.totalSupply();
  //   const user1Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user1.address
  //   );
  //   const user2Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user2.address
  //   );
  //   const marketplaceBalance = await WLegalTokenAddessInstance.balanceOf(
  //     Marketplace.address
  //   );
  //   const totalSupply = await WLegalTokenAddessInstance.totalSupply();
  //   await WLegalTokenAddessInstance.approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits(`${totalSupply}`, 18)
  //   );
  //   await expect(
  //     Marketplace.connect(user2).removeProperty(TOOOOKENN.address)
  //   ).to.be.revertedWithCustomError(Marketplace, "OnlyAdminRole");
  // });

  // it("WLegal Holder => f(createBuyOffer):!tokenExisits => revert", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const user1Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user1.address
  //   );
  //   await WLegalTokenAddessInstance.connect(user2).approve(
  //     Marketplace.address,
  //     user1Balance
  //   );
  //   await expect(
  //     Marketplace.connect(user1).createBuyOffer(
  //       Marketplace.address,
  //       user1Balance,
  //       ethers.utils.parseUnits("3", 18)
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "invalidToken");
  // });
  // it("WLegal Holder => f(createBuyOffer):BalanceMustBeGreaterThenAmount => revert", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const user1Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user1.address
  //   );
  //   await WLegalTokenAddessInstance.connect(user1).approve(
  //     Marketplace.address,
  //     user1Balance
  //   );
  //   await expect(
  //     Marketplace.connect(user1).createBuyOffer(
  //       WLegalTokenAddess,
  //       ethers.utils.parseUnits("10000000", 18),
  //       ethers.utils.parseUnits("3", 18)
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThenAmount");
  // });
  // it("WLegal Holder => f(createBuyOffer):AllowenceMustBeGreaterThenAmount => revert", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const user1Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user1.address
  //   );
  //   await WLegalTokenAddessInstance.connect(user1).approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("1", 18)
  //   );
  //   await expect(
  //     Marketplace.connect(user1).createBuyOffer(
  //       WLegalTokenAddess,
  //       ethers.utils.parseUnits("10", 18),
  //       ethers.utils.parseUnits("3", 18)
  //     )
  //   ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThenAmount");
  // });
  // it("WLegal Holder => f(createBuyOffer)", async function () {
  //   //--------------------FETCHING INSTANCE---------------------------------
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   //----------------------------------------------------------------
  //   //CHECKING BALANCE
  //   const user1Balance = await StableCoin.balanceOf(user1.address);
  //   console.log("user1 has amount in Stablecoin => ", user1Balance / 1e18);
  //   //APPROVING TO MARKETPLACE TO PLACE A SELL OFFER
  //   await StableCoin.connect(user1).approve(Marketplace.address, user1Balance);
  //   const amountToBuy = user1Balance / ethers.utils.parseUnits("3", 21);
  //   console.log("amountToBuy => ", amountToBuy);
  //   //CREATING A SELL OFFER.
  //   await Marketplace.connect(user1).createBuyOffer(
  //     WLegalTokenAddess,
  //     amountToBuy,
  //     ethers.utils.parseUnits("3", 18)
  //   );
  // });

  // it("ADMIN => f(removeProperty)", async function () {
  //   const WLegalTokenAddess = await Marketplace.LegalToWLegal(
  //     TOOOOKENN.address
  //   );
  //   const WLegalTokenAddessInstance = await ethers.getContractAt(
  //     "PropertyToken2",
  //     WLegalTokenAddess
  //   );
  //   const balance = await WLegalTokenAddessInstance.totalSupply();
  //   const user1Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user1.address
  //   );
  //   const user2Balance = await WLegalTokenAddessInstance.balanceOf(
  //     user2.address
  //   );
  //   const marketplaceBalance = await WLegalTokenAddessInstance.balanceOf(
  //     Marketplace.address
  //   );
  //   console.log("user1 balance => ", user1Balance);
  //   //await Marketplace.connect(user1).sell(WLegalTokenAddess, user1Balance);
  //   console.log("user1 balance is => ", user1Balance / 10 ** 18);
  //   console.log("user2 balance is => ", user2Balance / 10 ** 18);
  //   console.log("Marketplace balance is => ", marketplaceBalance / 10 ** 18);

  //   const totalSupply = await WLegalTokenAddessInstance.totalSupply();
  //   await WLegalTokenAddessInstance.approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits(`${totalSupply}`, 18)
  //   );
  //   await Marketplace.connect(user1).removeProperty(TOOOOKENN.address);
  // });

  // it("ADMIN => f(DEPLOY TREX SUIT)", async function () {
  //   await factory
  //     .connect(tokeny)
  //     .deployTREXSuite("test1", tokenDetails, claimDetails);
  //   await factory
  //     .connect(tokeny)
  //     .deployTREXSuite("test2", tokenDetails, claimDetails);
  // });
});
