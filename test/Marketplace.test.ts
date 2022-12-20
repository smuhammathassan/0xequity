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
      const kycApproved = await ethers.utils.formatBytes32String(
        "kyc approved"
      );
      const hashedDataToSign1 = web3.utils.keccak256(
        web3.eth.abi.encodeParameters(
          ["address", "uint256", "bytes"],
          [user1Contract.address, 7, kycApproved]
        )
      );
      const signature1 = (await signer.sign(hashedDataToSign1)).signature;
      await user1Contract
        .connect(user1)
        .addClaim(
          7,
          1,
          claimIssuerContract.address,
          signature1,
          kycApproved,
          ""
        );
      console.log("User 1 claim added!");
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
        .addClaim(
          7,
          1,
          claimIssuerContract.address,
          signature2,
          kycApproved,
          ""
        );
      console.log("User 2 claim added!");

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
      console.log("after marketplace deplyment");
      const MarketplaceTx = await Marketplace.connect(user1).createIdentity();
      const events = await MarketplaceTx.wait();
      console.log(events.events[1].args[0]);
      //const MarketPlaceIdentity = 0;
      const MarketPlaceIdentity = events.events[1].args[0];
      //console.log("Marketplace Identity contract ", MarketPlaceIdentity);
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
      console.log("before initializable");
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

  it("Should be able to mint", async function () {
    await TOOOOKENN.connect(agent).mint(
      user2.address,
      ethers.utils.parseUnits("1000", 18)
    ); // => total minted 1000 user2 = 1000
    console.log("Minting Done!");
  });

  it("Should be able to mint to Marketplace", async function () {
    await TOOOOKENN.connect(agent).mint(
      Marketplace.address,
      ethers.utils.parseUnits("1000", 18)
    ); // => total minted 2000 user2 = 1000, marketplace = 1000
    console.log("Minting Done!");
  });

  it("Should be able to transfer to a Marketplace account", async function () {
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

  it("Should be able to transfer to a verified account", async function () {
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

  it("Should not be able to transfer to a non verified account", async function () {
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

  it("----------------SHOULD BE ABLE TO ADD PROPERTY ----------------", async function () {
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
      1, //price in dai/usdt/usdc
      ethers.utils.parseUnits("100", 18) //reward per token.
    );
    console.log("Property Added");
  });

  it("---------------- SHOULD BE ABLE TO BUY ----------------", async function () {
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    await StableCoin.connect(user2).approve(
      Marketplace.address,
      ethers.utils.parseUnits("100", 18)
    );
    await Marketplace.connect(user2).buy(
      //user 2 now owns 100 wrapped token
      WLegalTokenAddess,
      ethers.utils.parseUnits("100", 18)
    );
  });

  it("---------------- SHOULD BE ABLE TO UNLOCK PARTIAL LEGAL ----------------", async function () {
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
    await Marketplace.connect(user1).unlockParialLegal(TOOOOKENN.address, 50); //now user1 has 50 tokens left.
    //await Marketplace.connect(user1).removeProperty(TOOOOKENN.address);
  });
  it("---------------- SHOULD BE ABLE TO ADD MORE LEGAL TOKENS ----------------", async function () {
    await TOOOOKENN.connect(user1).approve(
      Marketplace.address,
      ethers.utils.parseUnits("50", 18)
    );
    await Marketplace.connect(user1).addMoreWLegalTokens(
      TOOOOKENN.address,
      ethers.utils.parseUnits("50", 18)
    ); //now back to 100
  });

  it("---------------- SHOULD BE ABLE TO REMOVE PROPERTY ----------------", async function () {
    const WLegalTokenAddess = await Marketplace.LegalToWLegal(
      TOOOOKENN.address
    );
    const WLegalTokenAddessInstance = await ethers.getContractAt(
      "PropertyToken2",
      WLegalTokenAddess
    );
    const balance = await WLegalTokenAddessInstance.totalSupply();
    const user1Balance = await WLegalTokenAddessInstance.balanceOf(
      user1.address
    );
    const user2Balance = await WLegalTokenAddessInstance.balanceOf(
      user2.address
    );
    const marketplaceBalance = await WLegalTokenAddessInstance.balanceOf(
      Marketplace.address
    );
    console.log(balance);
    console.log("user1 balance: ", user1Balance);
    console.log("user2 balance: ", user2Balance);
    console.log("Market balance: ", marketplaceBalance);

    // await Marketplace.connect(user2).buy(
    //   //user 2 now owns 100 wrapped token
    //   WLegalTokenAddess,
    //   ethers.utils.parseUnits("100", 18)
    // );
    await WLegalTokenAddessInstance.connect(user2).approve(
      Marketplace.address,
      user2Balance
    );
    await Marketplace.connect(user2).sell(
      WLegalTokenAddessInstance.address,
      user2Balance
    );

    const totalSupply = await WLegalTokenAddessInstance.totalSupply();
    await WLegalTokenAddessInstance.approve(
      Marketplace.address,
      ethers.utils.parseUnits(`${totalSupply}`, 18)
    );
    await Marketplace.connect(user1).removeProperty(TOOOOKENN.address);
  });
});
