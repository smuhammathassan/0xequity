import { _deploy } from "./deployArtifacts";
import hre, { ethers, web3 } from "hardhat";

export async function deployOCLRouter() {
  const accounts = await hre.ethers.getSigners();
  const claimIssuer = accounts[1];

  const OCLRouter = await _deploy("OCLRouter");

  console.log("OCLRouter is deloyed at : ", OCLRouter.address);

  return { OCLRouter };
}
