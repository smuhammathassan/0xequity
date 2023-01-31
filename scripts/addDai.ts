import hre, { ethers, web3 } from "hardhat";
import {
  deployArtifacts,
  _deploy,
  _deployWithLibrary,
} from "../scripts/deployArtifacts";
async function main() {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  /* -------------------------------------------------------------------------- */
  /*                             Deploying USDC Mock                            */
  /* -------------------------------------------------------------------------- */
  const jDAI = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "jDAI",
    "jDAI",
    18,
  ]);
  console.log("JUSDC : ", jDAI.address);

  const tx12200 = await jDAI.connect(tokeny).addMinter(tokeny.address);
  await tx12200.wait();

  const DaiAggregator = await _deploy("MockRandomAggregator", [
    ethers.utils.parseUnits("0.99968285", 8),
    1,
  ]);
  console.log("DaiAggregator ", DaiAggregator.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
