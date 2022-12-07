import { expect, assert } from "chai";
import hre,  { ethers, web3 } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import deployIdentityProxye from "./../scripts/identityProxy";
import { tracer } from "hardhat";
//import Web3 from 'web3';
import "@nomiclabs/hardhat-web3";

//import deployIdentityProxye from "./identityProxy";



var FactoryInstance;
var tokenAddress: any;
let user1: any;
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
const signer : any = web3.eth.accounts.create();
const signerKey = web3.utils.keccak256(web3.eth.abi.encodeParameter('address', signer.address));
let TOOOOKENN : any;


describe.only("ERC3643", function () {
    beforeEach('NEWSETUP: Deploying factory ', async function () {
       

        const accounts = await ethers.getSigners();
        tokeny = accounts[0];
        const abiCoder = new ethers.utils.AbiCoder();

        // const signerKey1 = ethers.utils.keccak256(
        //     abiCoder.encode(["address"], [tokeny.address])
        // );
        //const signerKey = web3.utils.keccak256(web3.eth.abi.encodeParameter('address', tokeny.address));
        // if(signerKey1 == signerKey) {
        //     console.log("PPPEEEEPPPEEEp");
        // }

        const claimIssuer = accounts[1];
        user1 = accounts[2];
        const user2 = accounts[3];
        const claimTopics = [7];
        agent = accounts[8];
        console.log("agent :", agent.address);
        

        // Fetching Artifacts
        const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
        const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
        const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
        const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
        const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
        const Token = await ethers.getContractFactory("Token");
        const IssuerIdentity = await ethers.getContractFactory("ClaimIssuer");
        const Implementation = await ethers.getContractFactory("TREXImplementationAuthority");
        const TREXFactory = await ethers.getContractFactory("TREXFactory");


        // Tokeny deploying all implementations
        claimTopicsRegistry = await ClaimTopicsRegistry.connect(tokeny).deploy();
        await claimTopicsRegistry.deployed();
        trustedIssuersRegistry = await TrustedIssuersRegistry.connect(tokeny).deploy();
        await trustedIssuersRegistry.deployed();
        identityRegistryStorage = await IdentityRegistryStorage.connect(tokeny).deploy();
        await identityRegistryStorage.deployed();
        identityRegistry = await IdentityRegistry.connect(tokeny).deploy();
        await identityRegistry.deployed();
        modularCompliance = await ModularCompliance.connect(tokeny).deploy();
        await modularCompliance.deployed();
        token = await Token.connect(tokeny).deploy();
        await token.deployed();
        
        

        // setting the implementation authority
        implementationSC = await Implementation.connect(tokeny).deploy();
        await implementationSC.deployed();
        await implementationSC.setCTRImplementation(claimTopicsRegistry.address);
        await implementationSC.setTIRImplementation(trustedIssuersRegistry.address);
        await implementationSC.setIRSImplementation(identityRegistryStorage.address);
        await implementationSC.setIRImplementation(identityRegistry.address);
        await implementationSC.setTokenImplementation(token.address);
        await implementationSC.setMCImplementation(modularCompliance.address);

        
        // deploy Factory
        factory = await TREXFactory.connect(tokeny).deploy(implementationSC.address);
        await factory.deployed();
        
        // deploy Claim Issuer contract
        const claimIssuerContract = await IssuerIdentity.connect(claimIssuer).deploy(claimIssuer.address);
        await claimIssuerContract.deployed();

        /*
            addKey(key, purpose, type) 
                key: keccak256 representation of eth addr. 
                purpose: 1 = MANAGEMENT, 2 = ACTION, 3 = CLAIM, 4 = ENCRYPTION
                type: 1.ECDSA, 2. RSA etc. 

        */
        console.log("claim issuer is : ", claimIssuer.address);
        const addKey = await claimIssuerContract.connect(claimIssuer).addKey(signerKey, 3, 1);
        await addKey.wait();
        

        // users deploy their identity contracts
        user1Contract = await deployIdentityProxye(user1);
        user2Contract = await deployIdentityProxye(user2);
        
        // user1 gets signature from claim issuer
        const hexedData1 = await ethers.utils.formatBytes32String("kyc approved");
        // const hashedDataToSign1 = ethers.utils.keccak256(
        //     abiCoder.encode(
        //       ["address", "uint256", "bytes"],
        //       [user1Contract.address, 7, hexedData1]
        //     )
        //   );

          const hashedDataToSign1=   web3.utils.keccak256(
            web3.eth.abi.encodeParameters(['address', 'uint256', 'bytes'], [user1Contract.address, 7, hexedData1]),
          );

        const signature1 = (await signer.sign(hashedDataToSign1)).signature;

        // const signature1 = await tokeny.signMessage(hashedDataToSign1);
        

        /**
        * @notice Implementation of the addClaim function from the ERC-735 standard
        *  Require that the msg.sender has claim signer key.
        *
        * @param _topic The type of claim
        * @param _scheme The scheme with which this claim SHOULD be verified or how it should be processed.
        * @param _issuer The issuers identity contract address, or the address used to sign the above signature.
        * @param _signature Signature which is the proof that the claim issuer issued a claim of topic for this identity.
        * it MUST be a signed message of the following structure: keccak256(abi.encode(address identityHolder_address, uint256 _ topic, bytes data))
        * @param _data The hash of the claim data, sitting in another location, a bit-mask, call data, or actual data based on the claim scheme.
        * @param _uri The location of the claim, this can be HTTP links, swarm hashes, IPFS hashes, and such.
        *
        * @return claimRequestId Returns claimRequestId: COULD be send to the approve function, to approve or reject this claim.
        * triggers ClaimAdded event.
        */

        // user1 adds claim to identity contract
        await user1Contract.connect(user1).addClaim(7, 1, claimIssuerContract.address, signature1, hexedData1, "");
        
        console.log("----------++++++++++++++++++++++++++++++-----------------");
        console.log("----------++++++++++++++++++++++++++++++-----------------");
        console.log("----------++++++++++++++++++++++++++++++-----------------");

        // user2 gets signature from claim issuer
        const hexedData2 = await ethers.utils.formatBytes32String("kyc approved");
        const hashedDataToSign2 = ethers.utils.keccak256(
              abiCoder.encode(
                ["address", "uint256", "bytes"],
                [user2Contract.address, 7, hexedData2]
              )
            );
        const signature2 = await tokeny.signMessage(hashedDataToSign2);

        // user2 adds claim to identity contract
        await user2Contract
        .connect(user2)
        .addClaim(7, 1, claimIssuerContract.address, signature2, hexedData2, "");


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
            complianceSettings: [],
        };

        const claimDetails = {
            claimTopics: [7],
            issuers: [claimIssuerContract.address], //TODO change claim issuer address to claimIssuerContract.address
            issuerClaims: [[7]],
        };

        // deploy token on Factory
        console.log("--------------------------------------------------------");
        var tx  = await factory.connect(tokeny).deployTREXSuite("test", tokenDetails, claimDetails);
    

        // var newTx = await tx.wait();
        // console.log(newTx.events[33].args[0]);
        // var tokenAddress = newTx.events[33].args[0];
        
        // load contracts for testing purpose
        const tokenAddress = await factory.getToken('test');
        console.log("tokenAddress", tokenAddress);
        TOOOOKENN = await hre.ethers.getContractAt("Token", tokenAddress);

        const identityRegistryAddressA = await TOOOOKENN.identityRegistry();
      

        console.log("identityRegistryAddress", identityRegistryAddressA);
        identityRegistry = await hre.ethers.getContractAt("IdentityRegistry", identityRegistryAddressA);

        // const modularComplianceAddress = await token.compliance();
        // modularCompliance = await hre.ethers.getContractAt("ModularCompliance", modularComplianceAddress);

        // const claimTopicsRegistryAddress = await identityRegistry.topicsRegistry();
        // console.log("claimTopicsRegistryAddress", claimTopicsRegistryAddress);
        // claimTopicsRegistry = await hre.ethers.getContractAt("ClaimTopicsRegistry", claimTopicsRegistryAddress);

        // const trustedIssuersRegistryAddress = await identityRegistry.issuersRegistry();
        // trustedIssuersRegistry = await hre.ethers.getContractAt("TrustedIssuersRegistry", trustedIssuersRegistryAddress);

        // const identityRegistryStorageAddress = await identityRegistry.identityStorage();
        // identityRegistryStorage = await hre.ethers.getContractAt("IdentityRegistryStorage", identityRegistryStorageAddress);


        // register identities of users
        await identityRegistry.connect(agent).registerIdentity(user1.address, user1Contract.address, 91);
        await identityRegistry.connect(agent).registerIdentity(user2.address, user2Contract.address, 101);

           //printing all implementation addresses
           console.log("ClaimTopicsRegistry deployed to:", claimTopicsRegistry.address);
           console.log("TrustedIssuersRegistry", trustedIssuersRegistry.address);
           console.log("IdentityRegistryStorage", identityRegistryStorage.address);
           console.log("IdentityRegistry", identityRegistry.address);
           console.log("ModularCompliance", modularCompliance.address);
           console.log("Token", token.address);
           console.log("Implementation", implementationSC.address);
           console.log("factory", factory.address);
           console.log("claimIssuerContract", claimIssuerContract.address);
           console.log("claimIssuer : ", claimIssuer.address);



        var owner = await TOOOOKENN.owner();
        console.log("Owner :", owner);
        //await token.connect(tokeny).setIdentityRegistry(identityRegistry.address);
        console.log("EEEEEEEEEEEEE HAAAAAAAAAA");

        
        console.log("Minting Done!");

        
     


    });

    it("Should be able to mint", async function () {
        // initial supply minting
        await TOOOOKENN.connect(agent).mint(user1.address, 1000);
    });

//   // showcase test on how to use the Hardhat network helpers library
//     it("Should mine the given number of blocks", async function () {
//         const blockNumberBefore = await time.latestBlock();

//         await mine(100);

//         assert.equal(await time.latestBlock(), blockNumberBefore + 100);
//     });
});
