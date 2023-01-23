import hre, { ethers, web3 } from "hardhat";
import addProperty from "./addProperty";



async function main() {

    //-----------------------------*** TO CHANGE ***-------------------------------------
    const claimIssuerContractAddress = "0x3BbdA3B2a72f0fBF0613e9D8fa2B151957eE5Bc7";
    const marktplaceAddress = "0xcee15389F5C55A8eF77ee705b8933BBF7DB8af7D";
    const TREXFactoryAddress = "0xAfBa4E38CF0A971d51d005C8a2Cd50489cB58761";
    const TRY = "0x531b95c5C553A6DfedB2f5e46fDD580b0FfFB361";
    const TRYUSD = "0x8Fd23A20fFb7fB0EB51ecd5605737abb6dFb0608";
    const ERC3643TokenName = ["XEFR6", "XEFR5"]
    const ERC3643TokenSymbol = ["XEFR6", "XEFR5"]
    const Salt = ["2+ 1 Flat in Wyndham Hotel", "1 + 1 Flat in Wyndham Hotels"];
    const ERC3643TokenToMint = ["100", "10"];
    const PerSharePrice = ["1166.66", "826.66"];
    const LegalToWLegalToken = [30, 300]
    const tokensTOLock = [100, 10];

    //-----------------------------------------------------------------------------------
    for(let i = 0; i < 2; i++) {
        await addProperty(claimIssuerContractAddress, marktplaceAddress, TREXFactoryAddress, TRY, TRYUSD, ERC3643TokenName[i], ERC3643TokenSymbol[i], Salt[i], ERC3643TokenToMint[i], PerSharePrice[i], LegalToWLegalToken[i], tokensTOLock[i]);
        console.log("done!");
    }
    
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
