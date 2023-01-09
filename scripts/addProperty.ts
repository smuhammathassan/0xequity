import hre, { ethers, web3 } from "hardhat";
import deployIdentityProxye from "./identityProxy";
import addClaim from "./addClaim";
import "@nomiclabs/hardhat-web3";

async function main() {
    const marktplaceAddress = "0x507CF062Bb9eacb273a7D94C783AaBA3FF6d3eD4";
    const claimIssuerContractAddress = "0xd8C4139071b9ddE1eBD1A82B25671507b1534076";
    const TREXFactoryAddress = "0x7B73C53770e46287CaC1e7C4383cC04F0F000Bc3";
    const TRY = "0xC2ac190155e1D817326055BE1E5B0bEEC626A06D";
    const TRYUSD = "0x121F646C6736E202D3b8Ae2c8A4Bc008172f35b8";

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

    //---------------------------DEPLOY T-REX SUIT-----------------------------s

    const Factory = await hre.ethers.getContractAt("TREXFactory", TREXFactoryAddress);
    const Salt = "Beylikd";
    const tokenDetails = {
        owner: tokeny.address,
        name: "XEFR6",
        symbol: "XEFR6",
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
        issuers: [claimIssuerContractAddress],
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
    console.log("identity Registered!");

    //-----------------------------UNPAUSE----------------------------------

    const unpausing = await ERC3643.connect(agent).unpause();
    await unpausing.wait();
    console.log("Unpaused!");

    //---------------------------------------------------------------------

    const minting = await ERC3643.connect(agent).mint(user1.address, ethers.utils.parseUnits('400', 18));
    await minting.wait();
    console.log("Minted");

    const tx1222 = await ERC3643.connect(user1).approve(
        marktplaceAddress,
        ethers.utils.parseUnits("400", 18)
    );
    console.log("Approved!");

    const Marketplace = await hre.ethers.getContractAt("Marketplace", marktplaceAddress);
    const addingProperty = await Marketplace.connect(user1).addProperty(
        TokenAddress, //address of legal token address
        400, //shares to lock and issue wrapped tokens
        5, //raito of legal to wrapped legal 1:100
        ethers.utils.parseUnits("400", 18), // total number of legal toens
        [ethers.utils.parseUnits("700", 18), TRY, TRYUSD], //price in dai/usdt/usdc
        ethers.utils.parseUnits("257", 18) //reward per token.
    );
    await addingProperty.wait();

    console.log("DONE DEPLOY");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
