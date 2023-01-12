import hre, { ethers, web3 } from "hardhat";
import deployIdentityProxye from "./identityProxy";
import addClaim from "./addClaim";
import addMarketplaceClaim from "./addMarketplaceClaim";

import "@nomiclabs/hardhat-web3";

async function main() {

    //-----------------------------*** TO CHANGE ***-------------------------------------
        const marketplace = "0x477dfFD58D3f5A101DA8494Ea8A9D4c9c5108fDf";
        const marketplace2 = "0xadd834bCa2C4Ec7362D47bCc0BBBB3EEAbd2dAD3";
        
  

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
    const IssuerIdentity = await ethers.getContractFactory("ClaimIssuer");

    const claimIssuerContract = await IssuerIdentity.connect(
        claimIssuer
    ).deploy(claimIssuer.address);
    await claimIssuerContract.deployed();

    console.log("claim issuer contract is : ", claimIssuerContract.address);
    const addKey = await claimIssuerContract
        .connect(claimIssuer)
        .addKey(signerKey, 3, 1);
    await addKey.wait();

    //---------------------------ADDING USER1 CLAIM---------------------------

    let user1Contract = await deployIdentityProxye(user1);
    await addClaim(user1Contract, user1, signer, claimIssuerContract);
    console.log("User 1 claim added!");

    //-------------------------ADDING MARKETPLACE CLAIM ----------------------
    const Marketplace = await hre.ethers.getContractAt("Marketplace", marktplaceAddress);
    const MarketPlaceIdentity = await addMarketplaceClaim(
        Marketplace,
        user1,
        signer,
        claimIssuerContract
    );
    console.log("Marketplace Claim Added!");
    //---------------------------DEPLOY T-REX SUIT-----------------------------s

    const Factory = await hre.ethers.getContractAt("TREXFactory", TREXFactoryAddress);

    const tokenDetails = {
        owner: tokeny.address,
        name: ERC3643TokenName,
        symbol: ERC3643TokenSymbol,
        decimals: 18,
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

    const tx1 = await Factory.deployTREXSuite(Salt, tokenDetails, claimDetails);
    await tx1.wait();
    console.log("Deployed Token");

    //------------------FETCHING TOKEN AND IDENTITY INSTANCE----------------------

    const TokenAddress = await Factory.getToken(Salt);
    const ERC3643 = await hre.ethers.getContractAt("Token", TokenAddress);

    const identityRegistryAddress = await ERC3643.identityRegistry();
    let identityRegistry = await hre.ethers.getContractAt(
        "IdentityRegistry",
        identityRegistryAddress
    );
    console.log("Fetching Done!");

    //------------------REGISTER IDENTITY FOR USER1 ----------------------

    const tx16 = await identityRegistry
        .connect(agent)
        .registerIdentity(user1.address, user1Contract.address, 91);
    await tx16.wait();
    console.log("user1 identity Registered!");
    const tx18 = await identityRegistry
        .connect(agent)
        .registerIdentity(Marketplace.address, MarketPlaceIdentity, 101);
    await tx18.wait();
    console.log("Marketplace identity Registered!");


    //-----------------------------UNPAUSE----------------------------------

    const unpausing = await ERC3643.connect(agent).unpause();
    await unpausing.wait();
    console.log("Unpaused!");

    //----------------------------MINTED--------------------------------

    const minting = await ERC3643.connect(agent).mint(user1.address, ethers.utils.parseUnits(`${ERC3643TokenToMint}`, 18));
    await minting.wait();
    console.log("Minted");

    const tx1222 = await ERC3643.connect(user1).approve(
        marktplaceAddress,
        ethers.utils.parseUnits(`${ERC3643TokenToMint}`, 18)
    );
    console.log("Approved!");

    const addingProperty = await Marketplace.connect(user1).addProperty(
        TokenAddress, //address of legal token address
        20, //shares to lock and issue wrapped tokens
        100, //raito of legal to wrapped legal 1:100
        ethers.utils.parseUnits(`${ERC3643TokenToMint}`, 18), // total number of legal toens
        [ethers.utils.parseUnits(`${PerSharePrice}`, 18), TRY, TRYUSD], //price in dai/usdt/usdc
        ethers.utils.parseUnits("257", 18), //reward per token.
        { gasLimit: 3e7 }
    );
    await addingProperty.wait();

    console.log("DONE DEPLOY");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
