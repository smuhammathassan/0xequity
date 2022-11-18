import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";

var FactoryInstance;

describe("Greeter", function () {
    beforeEach('SETUP: ASSINGING DEFAULT ADMINS ', async function () {


        const accounts = await ethers.getSigners();
        console.log("Address 1 is ", accounts[0].address);
        const Factory = await ethers.getContractFactory("FactoryMaker");
        var identityRegistry = await ethers.getContractFactory("IdentityRegistry");
        let trustedRegistry =  await ethers.getContractFactory("TrustedIssuersRegistry");
        let claimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
        let IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
        let compilienceRegistry = await ethers.getContractFactory("DefaultCompliance");

        //=> When creating legalToken we need following
            // => address identitiy registry => trusted issuer Registry, claim topics rgistry, identity storage
            // => address complience 
            // => address onchainid

     
        //
        
        const ERC3643Bytecode = require("../../artifacts/contracts/ERC3643/contracts/token/ERC3643.sol/ERC3643.json").bytecode;
        const propetyBytecode = require("../../artifacts/contracts/ERC3643/contracts/token/ERC3643.sol/ERC3643.json").bytecode;
        FactoryInstance = await Factory.deploy(ERC3643Bytecode, propetyBytecode);
        let TIRegistryInstance = await trustedRegistry.deploy();
        let CTRegistryInsstance = await claimTopicsRegistry.deploy();
        let ISRegistry = await IdentityRegistryStorage.deploy();
        let IdentitiyInstance = await identityRegistry.deploy(TIRegistryInstance.address, CTRegistryInsstance.address, ISRegistry.address);
        let CRInstance = await compilienceRegistry.deploy();
        let address = await FactoryInstance.createLegalToken(IdentitiyInstance.address, CRInstance.address, "Texas Benglos", "TB", 18, accounts[10].address);
        console.log("ERC3643 address is ", address );
        console.log("done!");

        
    });

//     it("Should return the new greeting once it's changed", async function () {
//         const Greeter = await ethers.getContractFactory("Greeter");
//         const greeter = await Greeter.deploy("Hello, world!");
//         await greeter.deployed();

//         expect(await greeter.greet()).to.equal("Hello, world!");

//         const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

//         // wait until the transaction is mined
//         await setGreetingTx.wait();

//         expect(await greeter.greet()).to.equal("Hola, mundo!");
//     });

//   // showcase test on how to use the Hardhat network helpers library
//     it("Should mine the given number of blocks", async function () {
//         const blockNumberBefore = await time.latestBlock();

//         await mine(100);

//         assert.equal(await time.latestBlock(), blockNumberBefore + 100);
//     });
});
