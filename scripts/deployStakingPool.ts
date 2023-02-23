import hre, { ethers, web3 } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";

export async function deployStakingPool() {
  console.log("Deploying jtry pool");
  await (
    await (
      await ethers.getContractFactory("ERC4626StakingPool")
    ).deploy(
      "0x5BBB883564d0F038D3bBa190028F0250Da57C1dA", // owner
      "0xEC01655267Bc72C385F0D2059B60d88B357a949A", // jTry
      "sTRY"
    )
  ).deployed();
  console.log(" jtry pool deployed");

  await (
    await (
      await ethers.getContractFactory("ERC4626StakingPool")
    ).deploy(
      "0x5BBB883564d0F038D3bBa190028F0250Da57C1dA", // owner
      "0xdD34D1F9bf3AB9E05537D81dCF0Bb93B49C132F7", // jUSDC
      "sUSDC"
    )
  ).deployed();
  console.log("deployed usdc pool");
    
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
// deployStakingPool().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
