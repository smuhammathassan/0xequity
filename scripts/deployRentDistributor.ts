import hre from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";

export async function deployRentDistributor({
  finder,
  RShareInstance,
  vTRY,
  jTry,
  burnerRole,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  const rentDistributor = await _deploy("RentDistributor", [
    vTRY.address,
    jTry.address,
    finder.address,
  ]);

  console.log("RentDistributor => ", rentDistributor.address);

  const tx22222 = await RShareInstance.connect(tokeny).grantRole(
    burnerRole,
    rentDistributor.address
  );
  await tx22222.wait();

  return { rentDistributor };
}
