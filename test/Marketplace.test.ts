import { tracer } from "hardhat";
import "@nomiclabs/hardhat-web3";
import { expect, assert } from "chai";
import { Contract } from "ethers";
import hre, { ethers, web3 } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";

import addClaim from "../scripts/addClaim";
import fetchArtifacts from "./../scripts/artifacts";
import deployArtifacts from "./../scripts/deployArtifacts";
import deployIdentityProxye from "./../scripts/identityProxy";
import addMarketplaceClaim from "../scripts/addMarketplaceClaim";
import fetchOffers from "../scripts/fetchOffers";

import { Console } from "console";

const propertyTokenBytecode =
  require("./../artifacts/contracts/propertyToken.sol/PropertyToken2.json").bytecode;
const identityBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/Identity.sol/Identity.json").bytecode;
const implementationAuthorityBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol/ImplementationAuthority.json").bytecode;
const identityProxyBytecode =
  require("./../artifacts/@onchain-id/solidity/contracts/proxy/IdentityProxy.sol/IdentityProxy.json").bytecode;

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
let tokenDetails: any;
let claimDetails: any;
let claimIssuer: any;
let MP: any;
let mock1: Contract;
let mock2: Contract;
let priceFeed: Contract;
const signer: any = web3.eth.accounts.create();
const signerKey = web3.utils.keccak256(
  web3.eth.abi.encodeParameter("address", signer.address)
);

let TOOOOKENN: Contract;
let initialized: any;

describe.only("ERC3643", function () {
  initialized = false;
  beforeEach("NEWSETUP: Deploying factory ", async function () {
    if (initialized == false) {
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

      accounts = await ethers.getSigners();
      tokeny = accounts[0];
      const abiCoder = new ethers.utils.AbiCoder();

      claimIssuer = accounts[1];
      user1 = accounts[2];
      user2 = accounts[3];
      const claimTopics = [7];
      agent = accounts[8];
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
      await implementationSC.setCTRImplementation(claimTopicsRegistry.address);
      await implementationSC.setTIRImplementation(
        trustedIssuersRegistry.address
      );
      await implementationSC.setIRSImplementation(
        identityRegistryStorage.address
      );
      await implementationSC.setIRImplementation(identityRegistry.address);
      await implementationSC.setTokenImplementation(token.address);
      await implementationSC.setMCImplementation(modularCompliance.address);

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
      addClaim(user1Contract, user1, signer, claimIssuerContract);

      // const kycApproved = await ethers.utils.formatBytes32String(
      //   "kyc approved"
      // );
      // const hashedDataToSign1 = web3.utils.keccak256(
      //   web3.eth.abi.encodeParameters(
      //     ["address", "uint256", "bytes"],
      //     [user1Contract.address, 7, kycApproved]
      //   )
      // );
      // const signature1 = (await signer.sign(hashedDataToSign1)).signature;
      // await user1Contract
      //   .connect(user1)
      //   .addClaim(
      //     7,
      //     1,
      //     claimIssuerContract.address,
      //     signature1,
      //     kycApproved,
      //     ""
      //   );
      console.log("User 1 claim added!");
      //---------------------------ADDING USER2 CLAIM----------------------------

      user2Contract = await deployIdentityProxye(user2);
      //addClaim(userIdentityProxy, user, singer, claimIssuerContract)
      addClaim(user2Contract, user2, signer, claimIssuerContract);

      // const hashedDataToSign2 = ethers.utils.keccak256(
      //   abiCoder.encode(
      //     ["address", "uint256", "bytes"],
      //     [user2Contract.address, 7, kycApproved]
      //   )
      // );
      // //signature of singer key and this signature singer should be same.
      // const signature2 = await signer.sign(hashedDataToSign2).signature;

      // await user2Contract
      //   .connect(user2)
      //   .addClaim(
      //     7,
      //     1,
      //     claimIssuerContract.address,
      //     signature2,
      //     kycApproved,
      //     ""
      //   );
      console.log("User 2 claim added!");

      //---------------DEPLOYING STABLE COIN---------------------------------
      //TODO:change ANERC20
      const SC = await hre.ethers.getContractFactory("ANERC20");
      StableCoin = await SC.deploy();
      await StableCoin.deployed();
      StableCoin.mint(user2.address, ethers.utils.parseUnits("1000", 8));
      StableCoin.mint(user1.address, ethers.utils.parseUnits("10000", 18));

      //---------------DEPLOYING jEURO COIN---------------------------------
      const JE = await hre.ethers.getContractFactory("jEuro");
      JEuro = await JE.deploy();
      await JEuro.deployed();
      JEuro.mint(user2.address, ethers.utils.parseUnits("1000", 8));
      //StableCoin.mint(user1.address, ethers.utils.parseUnits("10000", 18));

      //----------------------DEPLOYING REWARD TOKEN----------------------

      const RT = await hre.ethers.getContractFactory("RewardToken");
      RTInstance = await RT.deploy();
      await RTInstance.deployed();
      console.log("Reward Token Address : ", RTInstance.address);

      //----------------------DEPLOYING STAKING CONTRACTS-------------------

      const RShare = await hre.ethers.getContractFactory("StakingManager");
      RShareInstance = await RShare.deploy(RTInstance.address);
      await RShareInstance.deployed();
      console.log("Staking Manger Address : ", RShareInstance.address);

      //----------------------DEPLOYING PRICEFEED CONTRACTS-------------------

      const PF = await hre.ethers.getContractFactory("priceFeed");
      priceFeed = await PF.deploy();
      await priceFeed.deployed();
      console.log("Price Feed Address : ", priceFeed.address);

      //----------------------DEPLOYING MockAggregatorV3 - 1  CONTRACTS-------------------

      const MA1 = await hre.ethers.getContractFactory(
        "MockAggrigatorV3Interface"
      );
      //mock 1inch
      mock1 = await MA1.deploy();
      await mock1.deployed();
      await mock1.setDecimals(18);
      await mock1.setPriceUpdate(
        ethers.utils.parseUnits("18446744073712949909", 8)
      );
      console.log("mock1 Address : ", mock1.address);
      //----------------------DEPLOYING MockAggregatorV3 - 1  CONTRACTS-------------------

      mock2 = await MA1.deploy();
      await mock2.deployed();
      await mock2.setDecimals(8);
      await mock2.setPriceUpdate(
        ethers.utils.parseUnits("18446744073713465075", 8)
      );
      console.log("mock2 Address : ", mock2.address);

      //---------------------------ADDING MARKETPLACE CLAIM----------------------

      MP = await hre.ethers.getContractFactory("Marketplace");
      console.log("User1 address is :", user1.address);
      Marketplace = await MP.connect(user1).deploy(
        StableCoin.address,
        RShareInstance.address,
        priceFeed.address,
        propertyTokenBytecode,
        identityBytecode,
        implementationAuthorityBytecode,
        identityProxyBytecode
      );
      await Marketplace.deployed();
      console.log("after marketplace deplyment");
      const MarketPlaceIdentity = addMarketplaceClaim(
        Marketplace,
        user1,
        signer,
        claimIssuerContract
      );
      StableCoin.mint(
        Marketplace.address,
        ethers.utils.parseUnits("200000000000000000000", 18)
      );
      // const MarketplaceTx = await Marketplace.connect(user1).createIdentity();
      // const events = await MarketplaceTx.wait();
      // console.log(events.events[1].args[0]);
      // //const MarketPlaceIdentity = 0;
      // const MarketPlaceIdentity = events.events[1].args[0];
      // //console.log("Marketplace Identity contract ", MarketPlaceIdentity);
      // // //user2Contract = await deployIdentityProxye(user2);
      // const kycApproved = await ethers.utils.formatBytes32String(
      //   "kyc approved"
      // );
      // const hashedDataToSign3 = ethers.utils.keccak256(
      //   abiCoder.encode(
      //     ["address", "uint256", "bytes"],
      //     [MarketPlaceIdentity, 7, kycApproved]
      //   )
      // );
      // // //signature of singer key and this signature singer should be same.
      // const signature3 = await signer.sign(hashedDataToSign3).signature;

      // //const Maaaark = await ethers.getContractFactory("Marketplace");
      // const Maaaark = await ethers.getContractFactory("Identity");

      // Marketplace.connect(user1).callIdentity(
      //   MarketPlaceIdentity,
      //   Maaaark.interface.encodeFunctionData(
      //     "addClaim(uint256,uint256,address,bytes,bytes,string)",
      //     [7, 1, claimIssuerContract.address, signature3, kycApproved, ""]
      //   )
      // );

      //await Marketplace.connect(user1).addClaim();
      console.log("before initializable");
      //---------------------------DEPLOY T-REX SUIT-----------------------------

      tokenDetails = {
        owner: tokeny.address,
        name: "TREXDINO",
        symbol: "TREX",
        decimals: 8,
        irs: "0x0000000000000000000000000000000000000000",
        ONCHAINID: "0x0000000000000000000000000000000000000042",
        irAgents: [tokeny.address, agent.address],
        tokenAgents: [tokeny.address, agent.address],
        complianceModules: [],
        complianceSettings: []
      };
      claimDetails = {
        claimTopics: [7],
        issuers: [claimIssuerContract.address],
        issuerClaims: [[7]]
      };
      await factory
        .connect(tokeny)
        .deployTREXSuite("test", tokenDetails, claimDetails);
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

      await identityRegistry
        .connect(agent)
        .registerIdentity(user1.address, user1Contract.address, 91);
      await identityRegistry
        .connect(agent)
        .registerIdentity(user2.address, user2Contract.address, 101);
      await identityRegistry
        .connect(agent)
        .registerIdentity(Marketplace.address, MarketPlaceIdentity, 101);
      console.log("Identity Added!");

      //------------------PRINTING IMPLEMENTATION ADDRESSES-------------------------

      console.log(
        "ClaimTopicsRegistry deployed to:",
        claimTopicsRegistry.address
      );
      console.log("TrustedIssuersRegistry", trustedIssuersRegistry.address);
      console.log("IdentityRegistryStorage", identityRegistryStorage.address);
      console.log("IdentityRegistry", identityRegistry.address);
      console.log("ModularCompliance", modularCompliance.address);
      console.log("Token", token.address);
      console.log("Implementation", implementationSC.address);
      console.log("factory", factory.address);
      console.log("claimIssuerContract", claimIssuerContract.address);
      console.log("claimIssuer : ", claimIssuer.address);
      initialized = true;
    }
  });

  it("NON ADMIN => MP:STABLECOIN ADDR = 0 => REVERT", async () => {
    await expect(
      MP.connect(user1).deploy(
        "0x0000000000000000000000000000000000000000",
        RShareInstance.address,
        priceFeed.address,
        propertyTokenBytecode,
        identityBytecode,
        implementationAuthorityBytecode,
        identityProxyBytecode
      )
    ).to.be.revertedWithCustomError(MP, "ZeroAddress");
  });
  it("EMPTY BYTES => MP:CONSTRUCTOR:PROPERTYBYTECODE => REVERT", async () => {
    await expect(
      MP.connect(user1).deploy(
        TOOOOKENN.address,
        RShareInstance.address,
        priceFeed.address,
        [],
        identityBytecode,
        implementationAuthorityBytecode,
        identityProxyBytecode
      )
    ).to.be.revertedWithCustomError(MP, "EmptyBytecode");
  });
  it("EMPTY BYTES => MP:CONSTRUCTOR:identityBytecode => REVERT", async () => {
    await expect(
      MP.connect(user1).deploy(
        TOOOOKENN.address,
        RShareInstance.address,
        priceFeed.address,
        propertyTokenBytecode,
        [],
        implementationAuthorityBytecode,
        identityProxyBytecode
      )
    ).to.be.revertedWithCustomError(MP, "EmptyBytecode");
  });
  it("EMPTY BYTES => CONSTRUCTOR:implementationAuthorityBytecode => REVERT", async () => {
    await expect(
      MP.connect(user1).deploy(
        TOOOOKENN.address,
        RShareInstance.address,
        priceFeed.address,
        propertyTokenBytecode,
        identityBytecode,
        [],
        identityProxyBytecode
      )
    ).to.be.revertedWithCustomError(MP, "EmptyBytecode");
  });
  it("EMPTY BYTES => CONSTRUCTOR:identityProxyBytecode => REVERT", async () => {
    await expect(
      MP.connect(user1).deploy(
        TOOOOKENN.address,
        RShareInstance.address,
        priceFeed.address,
        propertyTokenBytecode,
        identityBytecode,
        implementationAuthorityBytecode,
        []
      )
    ).to.be.revertedWithCustomError(MP, "EmptyBytecode");
  });
  it(" NON ADMIN => createIdentity => REVERT", async () => {
    await expect(
      Marketplace.connect(user2).createIdentity()
    ).to.be.revertedWithCustomError(MP, "OnlyAdminRole");
  });
  it("REVERT : callIdentity : NON ADMIN", async () => {
    await expect(
      Marketplace.connect(user2).callIdentity(
        "0x0000000000000000000000000000000000000000",
        "0x00"
      )
    ).to.be.revertedWithCustomError(MP, "OnlyAdminRole");
  });
  it("ZER0 ADDR:STAKING CONTRACT ADDR => MP:CONSTURCTOR => REVERT ", async () => {
    await expect(
      MP.connect(user1).deploy(
        TOOOOKENN.address,
        "0x0000000000000000000000000000000000000000",
        priceFeed.address,
        propertyTokenBytecode,
        identityBytecode,
        implementationAuthorityBytecode,
        identityProxyBytecode
      )
    ).to.be.revertedWithCustomError(MP, "ZeroAddress");
  });

  it("ERC3643 => f(MINT) => USER2", async function () {
    await TOOOOKENN.connect(agent).mint(
      user2.address,
      ethers.utils.parseUnits("1000", 18)
    ); // => total minted 1000 user2 = 1000
    console.log("Minting Done!");
  });

  it("ERC3643 => f(MINT) => marketplace", async function () {
    await TOOOOKENN.connect(agent).mint(
      Marketplace.address,
      ethers.utils.parseUnits("1000", 18)
    ); // => total minted 2000 user2 = 1000, marketplace = 1000
    console.log("Minting Done!");
  });

  it("f(transfer) => marketplace", async function () {
    await TOOOOKENN.connect(agent).mint(
      user2.address,
      ethers.utils.parseUnits("1000", 18)
    ); // => total minted 3000 user2 = 1000, marketplace = 2000
    console.log("Minting done!");
    await TOOOOKENN.connect(agent).unpause();
    await TOOOOKENN.connect(user2).transfer(
      Marketplace.address,
      ethers.utils.parseUnits("1000", 18)
    ); // => total minted 3000 user2 = 1000, marketplace = 2000
    console.log("Transfer Done!");
  });

  it("transfer => Verified account", async function () {
    await TOOOOKENN.connect(agent).mint(
      user2.address,
      ethers.utils.parseUnits("1000", 18)
    ); // => total minted 4000 user2 = 2000, marketplace = 2000
    console.log("Minting done!");
    await TOOOOKENN.connect(user2).transfer(
      user1.address,
      ethers.utils.parseUnits("1000", 18)
    ); // => total minted 4000, user1:1000 user2:1000, marketplace:2000
    console.log("Transfer Done!");
  });

  it("transfer => nonVerified account => revert", async function () {
    await TOOOOKENN.connect(agent).mint(
      user2.address,
      ethers.utils.parseUnits("1000", 18)
    ); // => total minted 5000, user1:1000 user2:2000, marketplace:2000
    console.log("Minting done!");
    await expect(
      TOOOOKENN.connect(user2).transfer(
        accounts[12].address,
        ethers.utils.parseUnits("1000", 18)
      )
    ).to.be.revertedWith("Transfer not possible");
  });

  it("_legalSharesToLock = 0 => f(ADDPROPERTY) => REVERT", async function () {
    await expect(
      Marketplace.connect(user1).addProperty(
        TOOOOKENN.address, //address of legal token address
        0, //shares to lock and issue wrapped tokens
        ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
        ethers.utils.parseUnits("1000", 18), // total number of legal toens
        [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
        ethers.utils.parseUnits("100", 18) //reward per token.
      )
    ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThanZero");
  });
  it("_tokensPerLegalShares = 0 => f(addProperty) => REVERT", async function () {
    await expect(
      Marketplace.connect(user1).addProperty(
        TOOOOKENN.address, //address of legal token address
        ethers.utils.parseUnits("100", 18), //shares to lock and issue wrapped tokens
        0, //raito of legal to wrapped legal 1:100
        ethers.utils.parseUnits("1000", 18), // total number of legal toens
        [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
        ethers.utils.parseUnits("100", 18) //reward per token.
      )
    ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThanZero");
  });
  it("_totalLegalShares < _legalSharesToLock => f(addProperty) => REVERT", async function () {
    await expect(
      Marketplace.connect(user1).addProperty(
        TOOOOKENN.address, //address of legal token address
        ethers.utils.parseUnits("1000", 18), //shares to lock and issue wrapped tokens
        ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
        ethers.utils.parseUnits("100", 18), // total number of legal toens
        [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
        ethers.utils.parseUnits("100", 18) //reward per token.
      )
    ).to.be.revertedWithCustomError(
      Marketplace,
      "totalMustBeGreaterThanToLock"
    );
  });
  it("PRICE = 0 => f(ADDPROPERTY) => REVERT", async function () {
    await expect(
      Marketplace.connect(user1).addProperty(
        TOOOOKENN.address, //address of legal token address
        ethers.utils.parseUnits("100", 18), //shares to lock and issue wrapped tokens
        ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
        ethers.utils.parseUnits("1000", 18), // total number of legal toens
        [0, StableCoin.address, mock1.address], //price in dai/usdt/usdc
        ethers.utils.parseUnits("100", 18) //reward per token.
      )
    ).to.be.revertedWithCustomError(Marketplace, "MustBeGreaterThanZero");
  });

  it("ADMIN => f(ADDPROPERTY)", async function () {
    await TOOOOKENN.connect(agent).mint(user1.address, 1000); // => total minted 6000, user1:2000 user2:1000, marketplace:2000

    console.log("Minting Done!");
    console.log("Marketplace contract address : ", Marketplace.address);
    await TOOOOKENN.connect(user1).approve(
      Marketplace.address,
      ethers.utils.parseUnits("100", 18)
    );
    await Marketplace.connect(user1).addProperty(
      TOOOOKENN.address, //address of legal token address
      ethers.utils.parseUnits("100", 18), //shares to lock and issue wrapped tokens
      ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
      ethers.utils.parseUnits("1000", 18), // total number of legal toens
      [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
      ethers.utils.parseUnits("100", 18) //reward per token.
    );
    console.log("Property Added");
  });

  it("USED LEGALTOKEN ADDR => f(ADDPROPERTY) => REVERT", async function () {
    await expect(
      Marketplace.connect(user1).addProperty(
        TOOOOKENN.address, //address of legal token address
        ethers.utils.parseUnits("100", 18), //shares to lock and issue wrapped tokens
        ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
        ethers.utils.parseUnits("1000", 18), // total number of legal toens
        [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
        ethers.utils.parseUnits("100", 18) //reward per token.
      )
    ).to.be.revertedWithCustomError(Marketplace, "PropertyAlreadyExist");
  });
  it("LEGAL TOKEN ADDRESS = 0x00 => f(ADDPROPERTY) => REVERT", async function () {
    await expect(
      Marketplace.connect(user1).addProperty(
        "0x0000000000000000000000000000000000000000", //address of legal token address
        ethers.utils.parseUnits("100", 18), //shares to lock and issue wrapped tokens
        ethers.utils.parseUnits("100", 18), //raito of legal to wrapped legal 1:100
        ethers.utils.parseUnits("1000", 18), // total number of legal toens
        [ethers.utils.parseUnits("2", 8), StableCoin.address, mock1.address], //price in dai/usdt/usdc
        ethers.utils.parseUnits("100", 18) //reward per token.
      )
    ).to.be.revertedWithCustomError(Marketplace, "ZeroAddress");
  });
  it("anyone => f(BUY)", async function () {
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken2",
      WLegalTokenAddess
    );

    await StableCoin.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("20", 8)
    );

    //set Currency to Feed
    await priceFeed.setCurrencyToFeed(StableCoin.address, mock1.address);
    const check = await priceFeed.getCurrencyToFeed(StableCoin.address);
    console.log("price to feed for stablecoin is ", check);

    // await Marketplace.connect(user2).buy(
    //   //user 2 now owns 100 wrapped token
    //   WLegalTokenAddess,
    //   ethers.utils.parseUnits("100", 18)
    // );

    const BeforeStableUserBalance = await StableCoin.balanceOf(user2.address);
    console.log(
      "Before Stable User Tokens  =>",
      BeforeStableUserBalance / 1e18
    );
    await Marketplace.connect(user2).swap(
      StableCoin.address,
      WLegalTokenAddess,
      10
    );

    const AfterStablUsereBalance = await StableCoin.balanceOf(user2.address);
    console.log("After Stable User TOkens  =>", AfterStablUsereBalance / 1e18);

    const AfterStableMarketplaceBalance = await StableCoin.balanceOf(
      Marketplace.address
    );
    console.log(
      "After Stable Marketplace TOkens  =>",
      AfterStableMarketplaceBalance / 1e18
    );

    const PropertyBalance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    console.log("Property TOkens  =>", PropertyBalance);
  });
  it("anyone => f(SELL)", async function () {
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken2",
      WLegalTokenAddess
    );

    await WLegalTokenAddessInstance.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("20", 8)
    );

    //set Currency to Feed
    await priceFeed.setCurrencyToFeed(StableCoin.address, mock1.address);
    const check = await priceFeed.getCurrencyToFeed(StableCoin.address);
    console.log("price to feed for stablecoin is ", check);

    // await Marketplace.connect(user2).buy(
    //   //user 2 now owns 100 wrapped token
    //   WLegalTokenAddess,
    //   ethers.utils.parseUnits("100", 18)
    // );
    await Marketplace.connect(user2).swap(
      WLegalTokenAddess,
      StableCoin.address,
      10
    );
    const StableBalance = await StableCoin.balanceOf(user2.address);
    console.log("Stable TOkens  =>", StableBalance / 1e18);
    const PropertyBalance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    console.log("Property TOkens  =>", PropertyBalance);
  });
  it("anyone => f(BUY) diffrent priceFeeds", async function () {
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken2",
      WLegalTokenAddess
    );

    await JEuro.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("20", 8)
    );

    //set Currency to Feed
    await priceFeed.setCurrencyToFeed(StableCoin.address, mock1.address);
    await priceFeed.setCurrencyToFeed(JEuro.address, mock2.address);

    const check = await priceFeed.getCurrencyToFeed(StableCoin.address);
    console.log("price to feed for stablecoin is ", check);

    // await Marketplace.connect(user2).buy(
    //   //user 2 now owns 100 wrapped token
    //   WLegalTokenAddess,
    //   ethers.utils.parseUnits("100", 18)
    // );

    await Marketplace.connect(user2).swap(JEuro.address, WLegalTokenAddess, 10);
    const JEuroUser2Balance = await JEuro.balanceOf(user2.address);
    console.log("JEuro User Tokens  =>", JEuroUser2Balance);

    const JEuroMarketplaceBalance = await JEuro.balanceOf(Marketplace.address);
    console.log("JEuro Marketplace Tokens  =>", JEuroMarketplaceBalance);

    const PropertyBalance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    console.log("Property TOkens  =>", PropertyBalance);
  });
  it("anyone => f(SELL) diffrent priceFeeds", async function () {
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken2",
      WLegalTokenAddess
    );

    await WLegalTokenAddessInstance.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("10", 8)
    );

    //set Currency to Feed
    await priceFeed.setCurrencyToFeed(StableCoin.address, mock1.address);
    await priceFeed.setCurrencyToFeed(JEuro.address, mock2.address);

    const check = await priceFeed.getCurrencyToFeed(StableCoin.address);
    console.log("price to feed for stablecoin is ", check);

    // await Marketplace.connect(user2).buy(
    //   //user 2 now owns 100 wrapped token
    //   WLegalTokenAddess,
    //   ethers.utils.parseUnits("100", 18)
    // );

    await Marketplace.connect(user2).swap(WLegalTokenAddess, JEuro.address, 10);

    const JEuroUser2Balance = await JEuro.balanceOf(user2.address);
    console.log("JEuro User Tokens  =>", JEuroUser2Balance);

    const JEuroMarketplaceBalance = await JEuro.balanceOf(Marketplace.address);
    console.log("JEuro Marketplace Tokens  =>", JEuroMarketplaceBalance);

    const PropertyBalance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    console.log("Property TOkens  =>", PropertyBalance);
  });
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
