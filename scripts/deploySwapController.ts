import { _deploy } from "./deployArtifacts";
import hre, { ethers, web3 } from "hardhat";

export async function deploySwapController(
  poolToSawpFrom: any,
  underlyingCTokenjtry: any,
  underlyingCTokenusdc: any
) {
  const accounts = await hre.ethers.getSigners();
  const claimIssuer = accounts[1];

  const SwapController = await _deploy("SwapController", [
    poolToSawpFrom,
    underlyingCTokenjtry,
    underlyingCTokenusdc,
  ]);

  console.log("SwapController is deloyed at : ", SwapController.address);

  return { SwapController };
}
