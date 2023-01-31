import hre, { ethers, web3 } from "hardhat";
import addProperty from "./addProperty";

async function main() {
  //-----------------------------*** TO CHANGE ***-------------------------------------
  const claimIssuerContractAddress =
    "0xF0DA299CC985F05DaCcaF897a3b34fDFF1835bDf";
  const marktplaceAddress = "0x0530A4EAF9fAC0E0670aFF421c90c87656dD61BE";
  const TREXFactoryAddress = "0x396E1e3dD1786ff647724Ea9a36D0143899fEE40";
  const TRY = "0x5bcaac3B1F8b21D9727B6B0541bdf5d5E66B205c";
  const TRYUSD = "0x9ed5C636dDDBcdcdF87D3A29dC386e38e2d9D73C";
  const ERC3643TokenName = ["XEFR15"];
  const ERC3643TokenSymbol = ["XEFR15"];
  const Salt = ["Parsi Society15"];
  const ERC3643TokenToMint = ["100"];
  const PerSharePrice = ["100"];
  const LegalToWLegalToken = [30];
  const tokensTOLock = [100];

  //-----------------------------------------------------------------------------------
  for (let i = 0; i < 1; i++) {
    await addProperty(
      claimIssuerContractAddress,
      marktplaceAddress,
      TREXFactoryAddress,
      TRY,
      TRYUSD,
      ERC3643TokenName[i],
      ERC3643TokenSymbol[i],
      Salt[i],
      ERC3643TokenToMint[i],
      PerSharePrice[i],
      LegalToWLegalToken[i],
      tokensTOLock[i]
    );
    console.log("done!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
