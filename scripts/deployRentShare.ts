import hre, { ethers, web3 } from "hardhat";
import {
  deployArtifacts,
  _deploy,
  _deployWithLibrary,
} from "../scripts/deployArtifacts";

export async function deployRentShare({ vTRY }: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  const RSLib = await _deploy("RentShareLib");

  const RShare = await hre.ethers.getContractFactory("RentShare", {
    libraries: {
      RentShareLib: RSLib.address,
    },
  });

  const RShareInstance = await _deployWithLibrary("RentShare", RShare, [
    vTRY.address,
  ]);

  const tx122921 = await vTRY.connect(tokeny).addMinter(RShareInstance.address);
  await tx122921.wait();

  console.log("RENT SHARE : ", RShareInstance.address);

  return { RShareInstance };
}
