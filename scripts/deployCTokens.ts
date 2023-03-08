import { _deploy } from "./deployArtifacts";
import hre, { ethers, web3 } from "hardhat";

export async function deployCTokens() {
  const accounts = await hre.ethers.getSigners();

  const cUSDC = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "cUSDC",
    "cUSDC",
    6,
  ]);
  console.log("cUSDC : ", cUSDC.address);

  const cJTRY = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "cJTRY",
    "cJTRY",
    18,
  ]);
  console.log("cJTRY : ", cJTRY.address);
  // console.log(await cJTRY.balanceOf(cJTRY.address), "Testing cjtry");

  return [cUSDC, cJTRY];
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
// deployCTokens().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
