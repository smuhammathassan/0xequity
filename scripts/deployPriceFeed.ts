import hre from "hardhat";
import {
  deployArtifacts,
  _deploy,
  _deployWithLibrary,
} from "../scripts/deployArtifacts";

export async function deployPriceFeed() {
  const PriceFeedLib = await _deploy("PriceFeedLib");

  const PF = await hre.ethers.getContractFactory("PriceFeed", {
    libraries: {
      PriceFeedLib: PriceFeedLib.address,
    },
  });
  const priceFeed = await _deployWithLibrary("PriceFeed", PF, []);

  console.log("PRICE FEED ADDRESS : ", priceFeed.address);
  return { priceFeed };
}
