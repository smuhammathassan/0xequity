import { _deploy } from "./deployArtifacts";
import hre, { ethers, web3 } from "hardhat";
import { deployCTokens } from "./deployCTokens";
import { deploySwapController } from "./deploySwapController";
import { deployOCLRouter } from "./deployOCLRouter";
import { deployStakingPool } from "./deployStakingPool";

export async function deployExchangeFlow() {
  const accounts = await hre.ethers.getSigners();

  const [cUSDC, cJTRY] = await deployCTokens();

  const { jtryStakingPool } = await deployStakingPool(
    cJTRY.address,
    cUSDC.address
  );

  const { SwapController } = await deploySwapController(
    jtryStakingPool.address,
    cJTRY.address,
    cUSDC.address
  );
  const { OCLRouter } = await deployOCLRouter(
    "0x26dBFa06ce974466a3bEC0b950c31db224902dc7",
    SwapController.address
  );

  await jtryStakingPool.setAddressToCTokenPercentage(
    SwapController.address,
    5000
  ); // 50 %

  //   await jtryStakingPool.setAddressToCTokenPercentage(
  //     SwapController.address,
  //     5000
  //   ); // 50 %

  //   return [cUSDC, cJTRY];
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployExchangeFlow().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
