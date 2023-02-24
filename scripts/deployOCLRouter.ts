import { _deploy } from "./deployArtifacts";
import hre, { ethers, web3 } from "hardhat";

export async function deployOCLRouter(finder: any, SwapController: any) {
  const accounts = await hre.ethers.getSigners();
  const claimIssuer = accounts[1];

  const OCLRouter = await _deploy("OCLRouter", [finder,SwapController]);

  console.log("OCLRouter is deloyed at : ", OCLRouter.address);

  return { OCLRouter };
}
