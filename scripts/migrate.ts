import hre, { ethers, web3 } from "hardhat";
import deployIdentityProxye from "./identityProxy";
import addClaim from "./addClaim";
import addMarketplaceClaim from "./addMarketplaceClaim";

import "@nomiclabs/hardhat-web3";

async function main() {

    //-----------------------------*** TO CHANGE ***-------------------------------------
        const marketplace = "0x477dfFD58D3f5A101DA8494Ea8A9D4c9c5108fDf";
        const marketplace2 = "0xadd834bCa2C4Ec7362D47bCc0BBBB3EEAbd2dAD3";
        const claimIssuerContractAddress = "0xD1fF0bB6570f9204696c0c40d53F155C7aE859eB";
        const finder = "0xF699B19C2eD1a5Ac2D5EaC2402445419692B1DAf";
        const factory = "0x505A89e97a39840f52cc805dD89f4717EF3829FF";
        const Salt = "WyndhamHotels217";
    //-----------------------------------------------------------------------------------

    const accounts = await hre.ethers.getSigners();
    const abiCoder = new ethers.utils.AbiCoder();

    const tokeny = accounts[0];
    const claimIssuer = accounts[1];
    const user1 = accounts[2];
    const user2 = accounts[3];
    const agent = accounts[4];
    const claimTopics = [7];
    const signer: any = web3.eth.accounts.create();
    const signerKey = web3.utils.keccak256(
        web3.eth.abi.encodeParameter("address", signer.address)
    );

    //------------------DEPLOYING CLAIMISSUER CONTRACT----------------------
    //const IssuerIdentity = await ethers.getContractFactory("ClaimIssuer");

    // const claimIssuerContract = await IssuerIdentity.connect(
    //     claimIssuer
    // ).deploy(claimIssuer.address);
    // await claimIssuerContract.deployed();

    const claimIssuerContract = await hre.ethers.getContractAt("ClaimIssuer", claimIssuerContractAddress);

    console.log("claim issuer contract is : ", claimIssuerContract.address);
    const addKey = await claimIssuerContract
        .connect(claimIssuer)
        .addKey(signerKey, 3, 1);
    await addKey.wait();

    //-------------------------ADDING MARKETPLACE CLAIM ----------------------
    const Marketplace2 = await hre.ethers.getContractAt("Marketplace", marketplace2);
    const MarketPlaceIdentity = await addMarketplaceClaim(
        Marketplace2,
        user1,
        signer,
        claimIssuerContract
    );
    console.log("Marketplace Claim Added!");

    //------------------FETCHING TOKEN AND IDENTITY INSTANCE----------------------
    const Factory = await hre.ethers.getContractAt("TREXFactory", factory);
    const TokenAddress = await Factory.getToken(Salt);
    const ERC3643 = await hre.ethers.getContractAt("Token", TokenAddress);
    const identityRegistryAddress = await ERC3643.identityRegistry();
    let identityRegistry = await hre.ethers.getContractAt(
        "IdentityRegistry",
        identityRegistryAddress
    );
    console.log("Identity Registry : ", identityRegistryAddress);
    console.log("Fetching Done!");

    //------------------REGISTER IDENTITY FOR USER1 ----------------------

    const tx18 = await identityRegistry
        .connect(agent)
        .updateIdentity(Marketplace2.address, MarketPlaceIdentity);
    await tx18.wait();
    console.log("Marketplace identity Registered!");

    //------------------------------ MIGRATE -----------------------------
    const Marketplace = await hre.ethers.getContractAt("Marketplace", marketplace);
    const migrating = await Marketplace.connect(user1).migrate(ERC3643.address, marketplace2);
    await migrating.wait();

    console.log("DONE DEPLOY");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
