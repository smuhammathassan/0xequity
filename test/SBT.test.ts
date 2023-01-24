/* eslint-disable prefer-const */
import { tracer } from "hardhat";
import "@nomiclabs/hardhat-web3";
import { expect, assert } from "chai";
import * as tdr from "truffle-deploy-registry";
import {createHash} from 'crypto';

import { Contract } from "ethers";
import hre, { ethers, web3 } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
const web3Utils = require('web3-utils');

import addClaim from "../scripts/addClaim";
import fetchArtifacts from "../scripts/artifacts";
import {deployArtifacts, _deploy} from "../scripts/deployArtifacts";
import deployIdentityProxye from "../scripts/identityProxy";
import addMarketplaceClaim from "../scripts/addMarketplaceClaim";
import fetchOffers from "../scripts/fetchOffers";

import { Console } from "console";
import exp from "constants";
const propertyTokenBytecode =
  require("./../artifacts/contracts/propertyToken.sol/PropertyToken.json").bytecode;
const identityBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/Identity.sol/Identity.json").bytecode;
const implementationAuthorityBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol/ImplementationAuthority.json").bytecode;
const identityProxyBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/proxy/IdentityProxy.sol/IdentityProxy.json").bytecode;


const buyFeePercentage = 25; // 5 percentage  (500 / 10000 * 100) = 5%
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
let vTRY: Contract;
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
let SBT : Contract;
let SBTLib : Contract;
const signer: any = web3.eth.accounts.create();
const signerKey = web3.utils.keccak256(
  web3.eth.abi.encodeParameter("address", signer.address)
);
const network = hre.hardhatArguments.network;
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

      tokeny = accounts[0];
      claimIssuer = accounts[1];
      user1 = accounts[2];
      user2 = accounts[3];
      agent = accounts[4];
      const claimTopics = [7];

      //---------------------DEPLOYING ARTIFACTS-------------------------------

      // let {
      //   claimTopicsRegistry,
      //   trustedIssuersRegistry,
      //   identityRegistryStorage,
      //   identityRegistry,
      //   modularCompliance,
      //   token
      // } = await deployArtifacts(
      //   tokeny,
      //   ClaimTopicsRegistry,
      //   TrustedIssuersRegistry,
      //   IdentityRegistryStorage,
      //   IdentityRegistry,
      //   ModularCompliance,
      //   Token
      // );

      claimTopicsRegistry = await _deploy("ClaimTopicsRegistry");
      trustedIssuersRegistry = await _deploy("TrustedIssuersRegistry");
      identityRegistryStorage = await _deploy("IdentityRegistryStorage");
      identityRegistry = await _deploy("IdentityRegistry");
      modularCompliance = await _deploy("ModularCompliance");
      token = await _deploy("Token");

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

      const tx102 = await JUSDC.mint(
        user1.address,
        ethers.utils.parseUnits("1000000000000000000000000", 6)
      );
      await tx102.wait();

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
      vTRY = await RT.deploy("vTRY", "vTRY", 18);
      await vTRY.deployed();
      console.log("vTRY : ", vTRY.address);

      //----------------------DEPLOYING STAKING CONTRACTS-------------------

      const RShareLib = await hre.ethers.getContractFactory("RentShareLib");
      const RSLib = await RShareLib.deploy();
      await RSLib.deployed();
  

      const RShare = await hre.ethers.getContractFactory("RentShare", {
        libraries: {
          RentShareLib: RSLib.address,
        },
      });

      RShareInstance = await RShare.deploy(vTRY.address);
      await RShareInstance.deployed();

      const tx122921 = await vTRY.addMinter(RShareInstance.address);
      await tx122921.wait();
  
      console.log("RENT SHARE : ", RShareInstance.address);

      //----------------------DEPLOYING PRICEFEED CONTRACTS-------------------
      const PriceFeedLib = await hre.ethers.getContractFactory("PriceFeedLib");
      const pfLib = await PriceFeedLib.deploy();
      await pfLib.deployed();

      const PF = await hre.ethers.getContractFactory("PriceFeed", {
        libraries: {
          PriceFeedLib: pfLib.address,
        },
      });
      priceFeed = await PF.deploy();
      await priceFeed.deployed();
      console.log("PRICE FEED ADDRESS : ", priceFeed.address);

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
      //--------------------------DEPLOYING SBT-------------------------

      const sbtLib = await hre.ethers.getContractFactory("SBTLib");
      SBTLib = await sbtLib.deploy();
      await SBTLib.deployed();
      
      const sbt = await hre.ethers.getContractFactory("SBT", {
        libraries: {
          SBTLib: SBTLib.address,
        },
      });
      SBT = await sbt.deploy();
      await SBT.deployed();

      let txAddCommunity1 = await SBT.addCommunity("0xEquity", 1);
      await txAddCommunity1.wait();

      console.log("Community Added!");

      let approvedCommunity1 = await SBT.addApprovedCommunity("WXEFR1", "0xEquity");
      await approvedCommunity1.wait();

      console.log("Community Approved!");

      











      //---------------------------DEPLOYING FINDER----------------------

      const FNDR = await hre.ethers.getContractFactory("Finder");
      finder = await FNDR.deploy([tokeny.address, tokeny.address]);
      await finder.deployed();
      console.log("Finder => ", finder.address);
      const RentshareInterface = ethers.utils.formatBytes32String("RentShare");
      const PriceFeedInterface = ethers.utils.formatBytes32String('PriceFeed');
      const PropertyTokenInterface = ethers.utils.formatBytes32String('PropertyToken');
      const IndentityInterface = ethers.utils.formatBytes32String('Identity');
      const ImplementationAuthorityInterface = ethers.utils.formatBytes32String('ImplementationAuthority');
      const IdentityProxyInterface = ethers.utils.formatBytes32String('IdentityProxy');
      const Maintainer = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Maintainer'));
      const MarketplaceInterface = ethers.utils.formatBytes32String('Marketplace');
      const burnerRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Burner'));
      const RewardTokenInterface = ethers.utils.formatBytes32String('RewardToken');
      const SBTInterface = ethers.utils.formatBytes32String("SBT");

      let tx0000011 = await finder.changeImplementationAddress(RentshareInterface, RShareInstance.address);
      await tx0000011.wait();
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
      let tx0000017 = await finder.changeImplementationAddress(RewardTokenInterface, vTRY.address);
      await tx0000017.wait();
      let tx0000020 = await finder.changeImplementationAddress(SBTInterface, SBT.address);
      await tx0000020.wait();
      console.log("After all");

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
        [
          finder.address,
          buyFeePercentage,
          buyFeeReceiver
        ]
      );

      await Marketplace.deployed();
      //TODO:
      let tx000 = await RShareInstance.grantRole(Maintainer, Marketplace.address);
      await tx000.wait();
      console.log("after marketplace deplyment");
      
      let tx0000019 = await finder.changeImplementationAddress(MarketplaceInterface, Marketplace.address);
      await tx0000019.wait();

      let MarketplaceSBT = await SBT.mint(Marketplace.address, "0xEquity");
      await MarketplaceSBT.wait();
      


      let User2SBT = await SBT.mint(user2.address, "0xEquity");
      await User2SBT.wait();

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
      console.log("ClaimIssuerContract => ", claimIssuerContract.address);
      const MarketPlaceIdentity = await addMarketplaceClaim(
        Marketplace,
        user1,
        signer,
        claimIssuerContract
      );

      console.log("before initializable");

      //---------------ADDING MARKETPLACE CLAIM 2----------------------
      Marketplace2 = await MP.connect(user1).deploy(
        [
          finder.address,
          buyFeePercentage,
          buyFeeReceiver
        ]
      );
      
      const MarketPlaceIdentity2 = await addMarketplaceClaim(
        Marketplace2,
        user1,
        signer,
        claimIssuerContract
      );

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
      await WLegalTokenAddessInstance.connect(user1).setCommunityBound(true);
      const symbol = await WLegalTokenAddessInstance.symbol();
      await RShareInstance.updateRewardPerMonth(symbol, ethers.utils.parseUnits("500", 18));
      
      //----------------------------------------------------------------------------------------
      const rd = await hre.ethers.getContractFactory("RentDistributor");
      rentDistributor = await rd.deploy( vTRY.address, jTry.address);
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
      console.log("At the end of beforeEach");

    
    });
  
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
    //console.log("price to feed for stablecoin is ", check);

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
    //console.log("price to feed for stablecoin is ", check);

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
    //console.log("price to feed for stablecoin is ", check);

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

  it("revoke SBT => revert", async function () {

    let revoking = await SBT.revoke(user2.address, "0xEquity");
    await revoking.wait();

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

    await expect(Marketplace.connect(user2).swap([
      JUSDC.address,
      WLegalTokenAddess,
      10
    ])).to.be.revertedWithCustomError(WLegalTokenAddessInstance, "NonKYC");

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

  it("Non KYC user can't receive => revert", async function () {

    let minting = await SBT.mint(user2.address, "0xEquity");
    await minting.wait();

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
    await expect(WLegalTokenAddessInstance.connect(user2).transfer(user1.address, 10)).to.be.revertedWithCustomError(WLegalTokenAddessInstance, "NonKYC");

  });
  it("Transfer between KYC users", async function () {
    let minting2 = await SBT.mint(user1.address, "0xEquity");
    await minting2.wait();

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
    await WLegalTokenAddessInstance.connect(user2).transfer(user1.address, 10);

  });

  it("Giving same community access twice => revert", async function () {
    await expect(SBT.mint(user1.address, "0xEquity")).to.be.revertedWithCustomError(SBT, "CantMintTwice");
  });

  it("Tring to add community that is not approved => revert", async function () {
    await expect(SBT.mint(user1.address, "testCommunity")).to.be.revertedWithCustomError(SBT, "WrongCommunityName");
  });

  it("Tring to add community that is not approved mintBatch => revert", async function () {
    await expect(SBT.mintBatch(agent.address, ["0xEquity", "testCommunity"])).to.be.revertedWithCustomError(SBT, "WrongCommunityName");
  });

  it("Tring to approve already approved property => revert", async function () {
    await expect(SBT.addCommunity("0xEquity", 2)).to.be.revertedWithCustomError(SBTLib,"AlreadyApprovedCommunity");
  });

  it("mintbatch", async function () {
    let revoking = await SBT.revoke(user1.address, "0xEquity");
    await revoking.wait();

    let AddingCommunity = await SBT.addCommunity("IdeoFuzion", 2);
    await AddingCommunity.wait();

    let mintingBatch = await SBT.mintBatch(user1.address, ["0xEquity", "IdeoFuzion"]);
    await mintingBatch.wait();
    let balance1 = await SBT.getBalanceOf(user1.address, "0xEquity");
    let balance2 = await SBT.getBalanceOf(user1.address, "IdeoFuzion");
    console.log("balance1 => ", balance1);
    console.log("balance2 => ", balance2);
    await expect(balance1).to.be.equal(1);
    await expect(balance2).to.be.equal(1);
  });

  it("Should not be able to buy with non approved Community against wrapped token => revert", async function () {
    let revoking = await SBT.revoke(user1.address, "0xEquity");
    await revoking.wait();

    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken",
      WLegalTokenAddess
    );

    await JUSDC.connect(user1).approve(
      Marketplace.address,
      ethers.utils.parseUnits("399504375000000000000", 0)
    );
    //set Currency to Feed

    await expect(Marketplace.connect(user1).swap([
      JUSDC.address,
      WLegalTokenAddess,
      10
    ])).to.be.revertedWithCustomError(WLegalTokenAddessInstance, "NonKYC");

  });

  it("Should not be able to approve same community against legal  => revert", async function () {
    await expect(SBT.addApprovedCommunity("WXEFR1", "0xEquity")).to.be.revertedWithCustomError(SBTLib, "AlreadyApprovedCommunity");
  });

  

  it("Should be able to buy with approved Community", async function () {
    let addingNewCommunity = await SBT.addApprovedCommunity("WXEFR1", "IdeoFuzion");
    await addingNewCommunity.wait();

    let minting = await SBT.mint(Marketplace.address, "IdeoFuzion");
    await minting.wait();

    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken",
      WLegalTokenAddess
    );

    await JUSDC.connect(user1).approve(
      Marketplace.address,
      ethers.utils.parseUnits("399504375000000000000", 0)
    );
    //set Currency to Feed

    await Marketplace.connect(user1).swap([
      JUSDC.address,
      WLegalTokenAddess,
      10
    ]);
  });

    it("getCommunityToId", async function () {
      let Id = await SBT.getCommunityToId("0xEquity")
      expect(Id).to.be.equals(1);

    });


    it("getCommunityToId wrong community name => revert ", async function () {
      await expect(SBT.getCommunityToId("0xEquity1")).to.be.revertedWithCustomError(SBTLib, "CommunityDoesnotExist");
    });

    it("DoesCommunityExist ", async function () {
      
      let check = await SBT.DoesCommunityExist("0xEquity");
      expect(check).to.equals(true);

      await expect(SBT.connect(user1).DoesCommunityExist("0xEquity")).to.be.revertedWith("AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("removeCommunity => revert CommunityDoesnotExist ", async function () {
      await expect(SBT.removeCommunity("0xEquity1")).to.be.revertedWithCustomError(SBTLib, "CommunityDoesnotExist");
    });

    it("bulkApproveCommunities  ", async function () {
      await SBT.addCommunity("Fins", 3);
      await SBT.addCommunity("Brits", 4);
      await SBT.bulkApproveCommunities("WXEFR1", ["Fins", "Brits"]);
      let finsExist = await SBT.getApprovedSBT("WXEFR1", "Fins");
      let britsExist = await SBT.getApprovedSBT("WXEFR1", "Brits");
      expect(finsExist).to.be.equals(true);
      expect(britsExist).to.be.equals(true);
    });

    it("removeApprovedCommunity  ", async function () {
      await SBT.removeApprovedCommunity("WXEFR1", "Fins");
      let finsExist = await SBT.getApprovedSBT("WXEFR1", "Fins");
      expect(finsExist).to.be.equals(false);
    });

    it("bulkRemoveCommunities  ", async function () {

      await SBT.bulkAddCommunities(["Perssuian", "Sweeds", "Italians", "Scots"], [5, 6, 7, 8]);
      console.log("After dadidng communities....");
      await SBT.bulkApproveCommunities("WXEFR1", ["Perssuian", "Sweeds", "Italians", "Scots"]);
      console.log("After Adding communities");

      let SweedsExist = await SBT.getApprovedSBT("WXEFR1", "Sweeds");
      let ScotsExist = await SBT.getApprovedSBT("WXEFR1", "Scots");
      expect(SweedsExist).to.be.equals(true)
      expect(ScotsExist).to.be.equals(true);
      console.log("After getApprovedSBT");
      await SBT.bulkRemoveCommunities("WXEFR1", ["Perssuian", "Sweeds", "Italians", "Scots"]);
      console.log("After removing communities");
      let SweedsExist2 = await SBT.getApprovedSBT("WXEFR1", "Sweeds");
      let ScotsExist2 = await SBT.getApprovedSBT("WXEFR1", "Scots");
      let ItaliansExist2 = await SBT.getApprovedSBT("WXEFR1", "Italians");
      let PerssuianExist2 = await SBT.getApprovedSBT("WXEFR1", "Italians");
      expect(PerssuianExist2).to.be.equals(false);
      expect(ItaliansExist2).to.be.equals(false);
      expect(SweedsExist2).to.be.equals(false);
      expect(ScotsExist2).to.be.equals(false);

    });

    it("bulkAdding Again for testing to see they are indeed removed in the last test  ", async function () {
      await SBT.bulkAddCommunities(["Perssuian", "Sweeds", "Italians", "Scots"], [5, 6, 7, 8]);
    });

    it("bulkAdding Again for testing to see they are indeed removed in the last test  ", async function () {
      await SBT.mintBatch(Marketplace.address, ["Perssuian", "Sweeds", "Italians"]);
      await SBT.revokeBatch(Marketplace.address, ["Perssuian", "Sweeds", "Italians"]);
      
      let PerssuianBalance = await SBT.getBalanceOf(Marketplace.address, "Perssuian");
      expect(PerssuianBalance).to.be.equals(0);

      let SweedsBalance = await SBT.getBalanceOf(Marketplace.address, "Sweeds");
      expect(SweedsBalance).to.be.equals(0);

      let ItaliansBalance = await SBT.getBalanceOf(Marketplace.address, "Italians");
      expect(ItaliansBalance).to.be.equals(0);

    });

    it("setURI ", async function () {
      await SBT.setURI("https://www.google.com");
    });

    it("supportsInterface ", async function () {
      await SBT.supportsInterface(0x01ffc9a7);
    });

    it("supportsInterface ", async function () {
      await SBT.mint(agent.address, "Perssuian");
      await expect(SBT.connect(agent).safeTransferFrom(agent.address, user2.address, 5 , 1 , "0x")).to.be.revertedWithCustomError(SBT, "TransferNotAllowed");
    });

    //












    

  
  

});
