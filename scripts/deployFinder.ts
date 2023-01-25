import hre, { ethers, web3 } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";

export async function deployFinder() {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const finder = await _deploy("Finder", [[tokeny.address, tokeny.address]]);
  console.log("Finder => ", finder.address);
  return { finder };
}
