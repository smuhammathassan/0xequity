import { ethers } from "hardhat";
import {
  deployArtifacts,
  _deploy,
  _deployWithLibrary,
} from "../scripts/deployArtifacts";

export async function deployMockAggregator() {
  const mock1 = await _deploy("MockRandomAggregator", [
    ethers.utils.parseUnits("0.05332091", 8),
    1,
  ]);
  console.log("mock1 Address : ", mock1.address);

  const mock2 = await _deploy("MockRandomAggregator", [
    ethers.utils.parseUnits("1.07194", 8),
    1,
  ]);

  console.log("mock2 Address : ", mock2.address);

  const mock3 = await _deploy("MockRandomAggregator", [
    ethers.utils.parseUnits("0.99997503", 8),
    1,
  ]);

  console.log("mock3 Address : ", mock3.address);
  return { mock1, mock2, mock3 };
}
