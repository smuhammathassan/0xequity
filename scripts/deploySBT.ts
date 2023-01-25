import hre from "hardhat";
import {
  deployArtifacts,
  _deploy,
  _deployWithLibrary,
} from "../scripts/deployArtifacts";

export async function deploySBT() {
  const SBTLib = await _deploy("SBTLib", []);

  const sbt = await hre.ethers.getContractFactory("SBT", {
    libraries: {
      SBTLib: SBTLib.address,
    },
  });
  const SBT = await _deployWithLibrary("SBT", sbt);
  return { SBT };
}
