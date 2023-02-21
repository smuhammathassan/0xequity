import { _deploy } from "./deployArtifacts";
import hre, { ethers, web3 } from "hardhat";

export async function deployFeeManager() {
  const accounts = await hre.ethers.getSigners();
  const claimIssuer = accounts[1];

  const FeeManager = await _deploy("FeeManager");

  console.log("Fee manager is deloyed at : ", FeeManager.address);

  return { FeeManager };
}
