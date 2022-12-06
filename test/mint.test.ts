import { expect, assert } from "chai";
import hre, { ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import {deployIdentityProxy} from "./../scripts/deployIdentityProxy";


var FactoryInstance;
var tokenAddress: any;
let user1: any;
let agent: any;


describe("ERC3643", function () {
    beforeEach('SETUP: Deploying factory ', async function () {
       

        const accounts = await ethers.getSigners();

        const tokeny = accounts[0];
        const claimIssuer = accounts[1];
        const user1 = accounts[2];
        const user2 = accounts[3];
        const claimTopics = [7];
        const agent = accounts[1];

        const abiCoder = new ethers.utils.AbiCoder();

        const signerKey = ethers.utils.keccak256(
            abiCoder.encode(["address"], [tokeny.address])
        );
        // const {TREXFactory, IdentityRegistry, TrustedIssuersRegistry, ClaimTopicsRegistry, IdentityRegistryStorage, ModularCompliance, Token, ImplementationAuthority, IssuerIdentity} = await artifacts;

        //TrexFactory only needs one thing, i.e implementation Authority. 

        const TREXFactory = await ethers.getContractFactory("TREXFactory");
        const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
        const TrustedIssuersRegistry = await ethers.getContractFactory(
            "TrustedIssuersRegistry"
        );
        const ClaimTopicsRegistry = await ethers.getContractFactory(
            "ClaimTopicsRegistry"
        );
        const IdentityRegistryStorage = await ethers.getContractFactory(
            "IdentityRegistryStorage"
        );
        const ModularCompliance = await ethers.getContractFactory(
            "ModularCompliance"
        );
        const Token = await ethers.getContractFactory("Token");
        const ImplementationAuthority = await ethers.getContractFactory(
            "TREXImplementationAuthority"
        );
        const IssuerIdentity = await ethers.getContractFactory("ClaimIssuer");

        //------------------------------------------------------------------------

        let claimTopicsRegistry = await ClaimTopicsRegistry.deploy();
        await claimTopicsRegistry.deployed();

        let trustedIssuersRegistry = await TrustedIssuersRegistry.deploy();
        await trustedIssuersRegistry.deployed();

        let identityRegistryStorage = await IdentityRegistryStorage.deploy();
        await identityRegistryStorage.deployed();

        let identityRegistry = await IdentityRegistry.connect(user1).deploy();
        await identityRegistry.deployed();

        let modularCompliance = await ModularCompliance.deploy();
        await modularCompliance.deployed();

        let token = await Token.deploy();
        await token.deployed();

        // setting the implementation authority
        const implementationSC = await ImplementationAuthority.deploy();
        await implementationSC.deployed();


        console.log("ClaimTopicsRegistry deployed to:", claimTopicsRegistry.address);
        console.log("TrustedIssuersRegistry", trustedIssuersRegistry.address);
        console.log("IdentityRegistryStorage", identityRegistryStorage.address);
        console.log("IdentityRegistry", identityRegistry.address);
        console.log("ModularCompliance", modularCompliance.address);
        console.log("Token", token.address);
        console.log("Implementation Authority", implementationSC.address);



        await implementationSC.setCTRImplementation(claimTopicsRegistry.address);
        await implementationSC.setTIRImplementation(trustedIssuersRegistry.address);
        await implementationSC.setIRSImplementation(identityRegistryStorage.address);
        await implementationSC.setIRImplementation(identityRegistry.address);
        await implementationSC.setTokenImplementation(token.address);
        await implementationSC.setMCImplementation(modularCompliance.address);

        // deploy Factory
        const factory = await TREXFactory.deploy(implementationSC.address);
        await factory.deployed();
        console.log("factory", factory.address);

        // deploy Claim Issuer contract
        // const claimIssuerContract = await IssuerIdentity.deploy(claimIssuer.address);
        // await claimIssuerContract.deployed();
        // console.log("claimIssuerContract", claimIssuerContract.address);

        

        // // users deploy their identity contracts
        // const user1Contract = await deployIdentityProxy(user1);
        // console.log("user1 identity", user1Contract.address);

        // const user2Contract = await deployIdentityProxy(user2);
        // console.log("user2 identity", user2Contract.address);

        // // user1 gets signature from claim issuer
        // const hexedData1 = await ethers.utils.formatBytes32String("kyc approved");

        // const hashedDataToSign1 = ethers.utils.keccak256(
        //   abiCoder.encode(
        //     ["address", "uint256", "bytes"],
        //     [user1Contract.address, 7, hexedData1]
        //   )
        // );

        // const signature1 = await tokeny.signMessage(hashedDataToSign1);

        // // user1 adds claim to identity contract
        // await user1Contract
        //   .connect(user1)
        //   .addClaim(7, 1, claimIssuerContract.address, signature1, hexedData1, "");
        // console.log("addClaim by user1");

        // // user2 gets signature from claim issuer
        // const hexedData2 = await ethers.utils.formatBytes32String("kyc approved");
        // const hashedDataToSign2 = ethers.utils.keccak256(
        //   abiCoder.encode(
        //     ["address", "uint256", "bytes"],
        //     [user2Contract.address, 7, hexedData2]
        //   )
        // );
        // const signature2 = await tokeny.signMessage(hashedDataToSign2);

        // // user2 adds claim to identity contract
        // await user2Contract
        //   .connect(user2)
        //   .addClaim(7, 1, claimIssuerContract.address, signature2, hexedData2, "");

        // console.log("addClaim by user2");

        
        //console.log("TokenProxy", TokenProxy);

        // in orde to register the identity you have to go through the process 
        // 1. You have to deploy the identity registery. 
        //      1. in order to do so you first have to deploy @onchain-id's Identity.sol as a logic contract
        //      2. deploy @onchain-id's ImplementationAuthority add the deployed logic contract to it in the contructor.
        //      3. deploy identity proxy, with implementation authority address and itentity issuer address
        // 2. add claim to it 
        // 3. and then you can do register identity and pass the contract address. 


        // users deploy their identity contracts
        const user1Contract = await deployIdentityProxy(user1);

        var IssuerIdentityInstance = await IssuerIdentity.deploy(user1.address);
        const hexedData1 = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("kyc approved"));

        const addKey = await IssuerIdentityInstance
            .connect(claimIssuer)
            .addKey(signerKey, 3, 1);
        await addKey.wait();
        console.log("addKey by claimissuer");


        var IdentityProxyInstance = await hre.ethers.getContractAt("Identity", user1Contract.address);

        var hashedDataToSign1 = ethers.utils.solidityKeccak256(["address", "uint256", "bytes"], [IssuerIdentityInstance.address, 7, hexedData1]);

        var signature1 = user1.signMessage(hashedDataToSign1);


        await IdentityProxyInstance.connect(user1).addClaim(7, 1, IssuerIdentityInstance.address,signature1, hashedDataToSign1 , '');

        const tokenDetails = {
            owner: tokeny.address,
            name: "TREXDINO",
            symbol: "TREX",
            decimals: 8,
            irs: "0x0000000000000000000000000000000000000000",
            ONCHAINID: "0x0000000000000000000000000000000000000042",
            irAgents: [user1.address, agent.address],
            tokenAgents: [user1.address, agent.address],
            complianceModules: [],
            complianceSettings: [],
        };

        const claimDetails = {
            claimTopics: claimTopics,
            issuers: [IdentityProxyInstance.address], //TODO change claim issuer address to claimIssuerContract.address
            issuerClaims: [claimTopics],
        };

        //const factory = await await ethers.getContractAt("TREXFactory","0xd299c3bf7Aad4d0854487547f42f66AE49D452C4", tokeny);

        // deploy token on Factory
        var tx  = await factory.deployTREXSuite("test", tokenDetails, claimDetails);
        var newTx = await tx.wait();
        console.log(newTx.events[33].args[0]);
        var tokenAddress = newTx.events[33].args[0];

        const TokenProxy = await hre.ethers.getContractAt("Token", tokenAddress);

        var isAgent = await TokenProxy.isAgent(user1.address);
        console.log("is Agent: ", isAgent);


        const tokenInstance = await hre.ethers.getContractAt("Token", tokenAddress);

        const identityRegistryAddress = await tokenInstance.identityRegistry();

        const IdentityRegistryInstance = await hre.ethers.getContractAt("IdentityRegistry", identityRegistryAddress);

        await IdentityRegistryInstance.connect(user1).registerIdentity(user1.address, user1Contract.address, 91);
        console.log("IdentityRegistryInstance is : ", identityRegistryAddress);

        const isVerified = await IdentityRegistryInstance.isVerified(user1.address);
        console.log("is verified? : ", isVerified)


    });

    it("Should be able to mint", async function () {
        console.log("inside -----------------------------------------------------");
        console.log("agent address : ", agent.address);
        const tokenInstance = await hre.ethers.getContractAt("Token", tokenAddress);

        await tokenInstance.connect(agent).mint(user1.address, 100);

    });

//   // showcase test on how to use the Hardhat network helpers library
//     it("Should mine the given number of blocks", async function () {
//         const blockNumberBefore = await time.latestBlock();

//         await mine(100);

//         assert.equal(await time.latestBlock(), blockNumberBefore + 100);
//     });
});
