import hre, { ethers, web3 } from "hardhat";
import deployIdentityProxye from "./identityProxy";
import addClaim from "./addClaim";
import addMarketplaceClaim from "./addMarketplaceClaim";

import "@nomiclabs/hardhat-web3";

async function main() {


    //----------------------------*** TO CHANGE ***-----------------------------

    const finderAddress = "0x48ae3baa9297cc15bf8e90b4d7ce893b826634ec"

    //--------------------------------------------------------------------------

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

    const MP = await hre.ethers.getContractFactory("Marketplace");
    const Marketplace = await MP.deploy(finderAddress);
    await Marketplace.deployed();
    console.log("Marketplace Address is => ", Marketplace.address);

    console.log("DONE DEPLOY");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
