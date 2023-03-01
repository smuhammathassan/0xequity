import hre, { ethers, web3 } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";

export async function deployStakingPool(cJTRY, cUSDC, jTry, jUSDC) {
  const accounts = await ethers.getSigners();
  console.log("Deploying jtry pool");
  const jtryStakingPool = await (
    await (
      await ethers.getContractFactory("ERC4626StakingPool")
    ).deploy(
      accounts[0].address, // owner
      jTry, // jTry
      cJTRY,
      "sTRY"
    )
  ).deployed();
  console.log(" jtry pool deployed");

  const usdcStakingPool = await (
    await (
      await ethers.getContractFactory("ERC4626StakingPool")
    ).deploy(
      accounts[0].address, // owner
      jUSDC, // jUSDC
      cUSDC,
      "sUSDC"
    )
  ).deployed();
  console.log("deployed usdc pool");
  return { jtryStakingPool, usdcStakingPool };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
// deployStakingPool().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
