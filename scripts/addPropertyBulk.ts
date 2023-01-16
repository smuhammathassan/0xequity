import hre, { ethers, web3 } from "hardhat";
import {addProperty} from "./addProperty";



async function main() {

    //-----------------------------*** TO CHANGE ***-------------------------------------
    const claimIssuerContractAddress = "0xD2BCDaaCe28cae8259FfDA7b0f6463979b9f70A8";
    const marktplaceAddress = "0x477dfFD58D3f5A101DA8494Ea8A9D4c9c5108fDf";
    const TREXFactoryAddress = "0x505A89e97a39840f52cc805dD89f4717EF3829FF";
    const TRY = "0x106cAf0A810bC42C96A4F7d6D522C4aCaE7c4313";
    const TRYUSD = "0x5F63D4296E26F0B004cB26d2A1771454500C289f";
    const ERC3643TokenName = "XEFR9"
    const ERC3643TokenSymbol = "XEFR9"
    const Salt = "2 + 1 Flat in Miran Istanbul Ese";
    const ERC3643TokenToMint = "10";
    const PerSharePrice = "600";
    const LegalToWLegalToken = 200
    const tokensTOLock = 10;

    //-----------------------------------------------------------------------------------

    
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
