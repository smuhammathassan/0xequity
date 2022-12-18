import { expect, assert } from "chai";
import hre, { ethers, web3 } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import deployIdentityProxye from "./../scripts/identityProxy";
import { tracer } from "hardhat";
//import Web3 from 'web3';
import "@nomiclabs/hardhat-web3";

import fetchArtifacts from "./../scripts/artifacts";
import deployArtifacts from "./../scripts/deployArtifacts";
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
let implementationSC: any;
let factory: any;
let user1Contract: any;
let user2Contract: any;
let tokeny: any;
let accounts: any;
let Marketplace: any;
let StableCoin: any;
let RShareInstance: any;
let RTInstance: any;
const signer: any = web3.eth.accounts.create();
const signerKey = web3.utils.keccak256(
  web3.eth.abi.encodeParameter("address", signer.address)
);

let TOOOOKENN: any;

describe.only("ERC3643", function () {
  beforeEach("NEWSETUP: Deploying factory ", async function () {
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

    const claimIssuer = accounts[1];
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
    await implementationSC.setTIRImplementation(trustedIssuersRegistry.address);
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
    const kycApproved = await ethers.utils.formatBytes32String("kyc approved");
    const hashedDataToSign1 = web3.utils.keccak256(
      web3.eth.abi.encodeParameters(
        ["address", "uint256", "bytes"],
        [user1Contract.address, 7, kycApproved]
      )
    );
    const signature1 = (await signer.sign(hashedDataToSign1)).signature;
    await user1Contract
      .connect(user1)
      .addClaim(7, 1, claimIssuerContract.address, signature1, kycApproved, "");

    //---------------------------ADDING USER2 CLAIM----------------------------

    user2Contract = await deployIdentityProxye(user2);

    const hashedDataToSign2 = ethers.utils.keccak256(
      abiCoder.encode(
        ["address", "uint256", "bytes"],
        [user2Contract.address, 7, kycApproved]
      )
    );
    //signature of singer key and this signature singer should be same.
    const signature2 = await signer.sign(hashedDataToSign2).signature;

    await user2Contract
      .connect(user2)
      .addClaim(7, 1, claimIssuerContract.address, signature2, kycApproved, "");

    //---------------DEPLOYING STABLE COIN---------------------------------
    //TODO:change ANERC20
    const SC = await hre.ethers.getContractFactory("ANERC20");
    StableCoin = await SC.deploy();
    await StableCoin.deployed();
    StableCoin.mint(user2.address, 100);

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

    //---------------------------ADDING MARKETPLACE CLAIM----------------------

    const MP = await hre.ethers.getContractFactory("Marketplace");
    console.log("User1 address is :", user1.address);
    Marketplace = await MP.connect(user1).deploy(
      StableCoin.address,
      RShareInstance.address,
      propertyTokenBytecode,
      identityBytecode,
      implementationAuthorityBytecode,
      identityProxyBytecode
    );
    await Marketplace.deployed();

    const MarketplaceTx = await Marketplace.connect(user1).createIdentity();
    const events = await MarketplaceTx.wait();
    const MarketPlaceIdentity = events.events[1].args[0];
    console.log("Marketplace Identity contract ", MarketPlaceIdentity);
    // //user2Contract = await deployIdentityProxye(user2);

    const hashedDataToSign3 = ethers.utils.keccak256(
      abiCoder.encode(
        ["address", "uint256", "bytes"],
        [MarketPlaceIdentity, 7, kycApproved]
      )
    );
    // //signature of singer key and this signature singer should be same.
    const signature3 = await signer.sign(hashedDataToSign3).signature;

    //const Maaaark = await ethers.getContractFactory("Marketplace");
    const Maaaark = await ethers.getContractFactory("Identity");

    Marketplace.connect(user1).callIdentity(
      MarketPlaceIdentity,
      Maaaark.interface.encodeFunctionData(
        "addClaim(uint256,uint256,address,bytes,bytes,string)",
        [7, 1, claimIssuerContract.address, signature3, kycApproved, ""]
      )
    );

    //await Marketplace.connect(user1).addClaim();

    //---------------------------DEPLOY T-REX SUIT-----------------------------

    const tokenDetails = {
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
    const claimDetails = {
      claimTopics: [7],
      issuers: [claimIssuerContract.address],
      issuerClaims: [[7]]
    };
    const tx = await factory
      .connect(tokeny)
      .deployTREXSuite("test", tokenDetails, claimDetails);

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
  });

  it("Should be able to mint", async function () {
    // initial supply minting
    await TOOOOKENN.connect(agent).mint(user2.address, 1000);
    console.log("Minting Done!");
  });

  it("Should be able to mint to Marketplace", async function () {
    // initial supply minting
    await TOOOOKENN.connect(agent).mint(Marketplace.address, 1000);
    console.log("Minting Done!");
  });

  it("Should be able to transfer to a Marketplace account", async function () {
    // initial supply minting
    await TOOOOKENN.connect(agent).mint(user2.address, 1000);
    console.log("Minting done!");
    await TOOOOKENN.connect(agent).unpause();
    await TOOOOKENN.connect(user2).transfer(Marketplace.address, 1000);
    console.log("Transfer Done!");
  });

  it("Should be able to transfer to a verified account", async function () {
    // initial supply minting
    await TOOOOKENN.connect(agent).mint(user2.address, 1000);
    console.log("Minting done!");
    await TOOOOKENN.connect(agent).unpause();
    await TOOOOKENN.connect(user2).transfer(user1.address, 1000);
    console.log("Transfer Done!");
  });

  it("Should not be able to transfer to a non verified account", async function () {
    // initial supply minting
    await TOOOOKENN.connect(agent).mint(user2.address, 1000);
    console.log("Minting done!");
    await TOOOOKENN.connect(agent).unpause();
    await expect(
      TOOOOKENN.connect(user2).transfer(accounts[12].address, 1000)
    ).to.be.revertedWith("Transfer not possible");
  });

  // it("----------------SHOULD BE ABLE TO ADD PROPERTY ----------------", async function () {
  //   await TOOOOKENN.connect(agent).mint(user1.address, 1000);
  //   console.log("Minting Done!");
  //   await TOOOOKENN.connect(agent).unpause();

  //   //----------------------DEPLOYING REWARD TOKEN----------------------

  //   const RT = await hre.ethers.getContractFactory("RewardToken");
  //   const RTInstance = await RT.deploy();
  //   await RTInstance.deployed();
  //   console.log("Reward Token Address : ", RTInstance.address);

  //   //----------------------DEPLOYING STAKING CONTRACTS-------------------

  //   const RShare = await hre.ethers.getContractFactory("StakingManager");
  //   const RShareInstance = await RShare.deploy(RTInstance.address);
  //   await RShareInstance.deployed();
  //   console.log("Staking Manger Address : ", RShareInstance.address);

  //   //----------------------DEPLOYING POOL TOKEN CONTRACTS-----------------
  //   const PT = await hre.ethers.getContractFactory("PropertyToken2");
  //   const PTInstance = await PT.deploy(
  //     Marketplace.address,
  //     RShareInstance.address
  //   );
  //   await PTInstance.deployed();
  //   await PTInstance.mint(Marketplace.address, 10000);
  //   console.log("Pool Token Address : ", PTInstance.address);

  //   //---------------------------------------------------------------------------
  //   console.log("Marketplace contract address : ", Marketplace.address);
  //   await TOOOOKENN.connect(user1).approve(Marketplace.address, 100);
  //   await Marketplace.connect(user1).addProperty(
  //     TOOOOKENN.address,
  //     100,
  //     100,
  //     1000,
  //     1
  //   );
  //   console.log("Property Added");
  // });
  // async function whitelistAddresses(walletProxyAddress, addrToWhitelist) {
  //   const [admin] = await ethers.getSigners();

  //   const addr = await wallet1.isWhitelisted(addrToWhitelist);
  //   console.log(addr, "this is whitelsited");
  // }

  it("---------------- SHOULD BE ABLE TO BUY ----------------", async function () {
    await TOOOOKENN.connect(agent).mint(user1.address, 1000);
    console.log("Minting Done!");
    await TOOOOKENN.connect(agent).unpause();

    // //----------------------DEPLOYING REWARD TOKEN----------------------

    // const RT = await hre.ethers.getContractFactory("RewardToken");
    // const RTInstance = await RT.deploy();
    // await RTInstance.deployed();
    // console.log("Reward Token Address : ", RTInstance.address);

    // //----------------------DEPLOYING STAKING CONTRACTS-------------------

    // const RShare = await hre.ethers.getContractFactory("StakingManager");
    // const RShareInstance = await RShare.deploy(RTInstance.address);
    // await RShareInstance.deployed();
    // console.log("Staking Manger Address : ", RShareInstance.address);

    //----------------------DEPLOYING POOL TOKEN CONTRACTS-----------------
    // const PT = await hre.ethers.getContractFactory("PropertyToken2");
    // console.log("Marketplace.address, ", Marketplace.address);
    // const PTInstance = await PT.deploy(
    //   Marketplace.address,
    //   RShareInstance.address
    // );
    // await PTInstance.deployed();
    // await PTInstance.mint(Marketplace.address, 10000);
    // console.log("Pool Token Address : ", PTInstance.address);

    //---------------------------ADD PROPERTY-----------------------------
    console.log("Marketplace contract address : ", Marketplace.address);
    await TOOOOKENN.connect(user1).approve(Marketplace.address, 100);
    const tx = await Marketplace.connect(user1).addProperty(
      TOOOOKENN.address,
      100, //shares to lock
      ethers.utils.parseUnits("100", 18), // erc20TOkensPershare
      1000, //total erc3643 shares
      1, //price,
      ethers.utils.parseUnits("100", 18)
    );
    console.log("Property Added");

    //---------------------------ADD PROPERTY-----------------------------
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    await StableCoin.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("100", 18)
    );
    await Marketplace.connect(user2).buy(
      WLegalTokenAddess,
      ethers.utils.parseUnits("100", 18)
    );
  });
  it("---------------- SHOULD BE ABLE TO REMOVE PROPERTY ----------------", async function () {
    await TOOOOKENN.connect(agent).mint(user1.address, 1000);
    console.log("Minting Done!");
    await TOOOOKENN.connect(agent).unpause();

    //---------------------------ADD PROPERTY-----------------------------
    console.log("Marketplace contract address : ", Marketplace.address);
    await TOOOOKENN.connect(user1).approve(Marketplace.address, 100);
    const tx = await Marketplace.connect(user1).addProperty(
      TOOOOKENN.address,
      100, //shares to lock
      ethers.utils.parseUnits("100", 18), // erc20TOkensPershare
      1000, //total erc3643 shares
      1, //price,
      ethers.utils.parseUnits("100", 18)
    );
    console.log("Property Added");

    //---------------------------ADD PROPERTY-----------------------------
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken2",
      WLegalTokenAddess
    );
    await WLegalTokenAddessInstance.approve(
      Marketplace.address,
      ethers.utils.parseUnits("10000", 18)
    );
    await Marketplace.connect(user1).removeProperty(TOOOOKENN.address);
  });
  it("---------------- SHOULD BE ABLE TO UNLOCK PARTIAL LEGAL ----------------", async function () {
    await TOOOOKENN.connect(agent).mint(user1.address, 1000);
    console.log("Minting Done!");
    await TOOOOKENN.connect(agent).unpause();

    //---------------------------ADD PROPERTY-----------------------------
    console.log("Marketplace contract address : ", Marketplace.address);
    await TOOOOKENN.connect(user1).approve(Marketplace.address, 100);
    const tx = await Marketplace.connect(user1).addProperty(
      TOOOOKENN.address,
      100, //shares to lock
      ethers.utils.parseUnits("100", 18), // erc20TOkensPershare
      1000, //total erc3643 shares
      1, //price,
      ethers.utils.parseUnits("100", 18)
    );
    console.log("Property Added");

    //---------------------------ADD PROPERTY-----------------------------
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken2",
      WLegalTokenAddess
    );
    await WLegalTokenAddessInstance.approve(
      Marketplace.address,
      ethers.utils.parseUnits("10000", 18)
    );
    await Marketplace.connect(user1).unlockParialLegal(TOOOOKENN.address, 50);
    //await Marketplace.connect(user1).removeProperty(TOOOOKENN.address);
  });
  it("---------------- SHOULD BE ABLE TO ADD MORE LEGAL TOKENS ----------------", async function () {
    await TOOOOKENN.connect(agent).mint(user1.address, 1000);
    console.log("Minting Done!");
    await TOOOOKENN.connect(agent).unpause();

    //---------------------------ADD PROPERTY-----------------------------
    console.log("Marketplace contract address : ", Marketplace.address);
    await TOOOOKENN.connect(user1).approve(Marketplace.address, 100);
    const tx = await Marketplace.connect(user1).addProperty(
      TOOOOKENN.address,
      100, //shares to lock
      ethers.utils.parseUnits("100", 18), // erc20TOkensPershare
      1000, //total erc3643 shares
      1, //price,
      ethers.utils.parseUnits("100", 18)
    );
    console.log("Property Added");

    //---------------------------ADD PROPERTY-----------------------------
    await TOOOOKENN.connect(user1).approve(Marketplace.address, 50);
    await Marketplace.connect(user1).addMoreWLegalTokens(TOOOOKENN.address, 50);
  });
});
