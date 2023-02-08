import hre, { ethers } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";

let admin: any,
  alice: any,
  bob: any,
  carol: any,
  teamMultisig: any,
  asim1: any,
  asim2: any;

import { MarketPlaceBorrower } from "../typechain-types/contracts/FeeManager/MarketPlaceBorrower";

export async function deployMarketplaceBorrower(poolToBorrowFrom: any) {
  [admin, alice, bob, carol, teamMultisig, asim1, asim2] =
    await ethers.getSigners();

  const mpBorrrower = (await _deploy("MarketPlaceBorrower", [
    poolToBorrowFrom,
  ])) as MarketPlaceBorrower;

  return mpBorrrower;
}

// deployXEQPlatform().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
