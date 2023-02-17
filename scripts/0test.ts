import hre, { ethers } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";

let admin: any,
  alice: any,
  bob: any,
  carol: any,
  teamMultisig: any,
  asim1: any,
  asim2: any;

import { MintableBurnableSyntheticTokenPermit } from "../typechain-types/contracts/SyntheticToken";

import { ERC4626StakingPool } from "../typechain-types/contracts/XEQ/ERC4626";
import { MarketPlaceBorrower } from "../typechain-types/contracts/FeeManager/MarketPlaceBorrower";
import { xeq } from "../typechain-types/contracts";

export async function test() {
  [admin, alice, bob, carol, teamMultisig, asim1, asim2] =
    await ethers.getSigners();

  // const Xeq = (await (
  //   await (
  //     await ethers.getContractFactory("MintableBurnableSyntheticTokenPermit")
  //   ).deploy("0xEquity", "Xeq", 18)
  // ).deployed()) as MintableBurnableSyntheticTokenPermit;

  // const jTry = (await (
  //   await (
  //     await ethers.getContractFactory("MintableBurnableSyntheticTokenPermit")
  //   ).deploy("Jtry", "jtry", 6)
  // ).deployed()) as MintableBurnableSyntheticTokenPermit;

  // const stakingPool: ERC4626StakingPool = (await (
  //   await (
  //     await ethers.getContractFactory("ERC4626StakingPool")
  //   ).deploy(
  //     admin.address,
  //     "0x9163F555ABedad4Da501d6009759F6e755341e9F",
  //     "0x0699421De83f691cC9A74EEf82a7907efFF282fC"
  //   )
  // ).deployed()) as ERC4626StakingPool;

  const stakingPool = (await _deploy("ERC4626StakingPool", [
    admin.address,
    "0x9163F555ABedad4Da501d6009759F6e755341e9F",
    "0x0699421De83f691cC9A74EEf82a7907efFF282fC", // jtryAddress
  ])) as ERC4626StakingPool;
  console.log("SP deployed--------------------------------");

  // await jTry.addMinter(admin.address);
  // await jTry.mint(admin.address, ethers.utils.parseUnits("500000", 18));

  // await jTry.transfer(
  //   stakingPool.address,
  //   ethers.utils.parseUnits("500000", 18)
  // );

  // deploying marketPlace borrower

  // const mpBorrrower = (await _deploy("MarketPlaceBorrower", [
  //   stakingPool.address,
  // ])) as MarketPlaceBorrower;

  // // const mpBorrrower = await (
  // //   await (
  // //     await ethers.getContractFactory("MarketPlaceBorrower")
  // //   ).deploy(stakingPool.address)
  // // ).deployed();
  // // console.log("mp borrower deployed--------------------------------");

  // await stakingPool.setAllowedMarketPlaceBorrower(mpBorrrower.address);

  // await mpBorrrower.setAllowedMarketPlace(
  //   "0x15094004C83788B4415Fd4428362058F241984ac"
  // );

  // const Mp = await ethers.getContractAt(
  //   "Marketplace",
  //   "0x15094004C83788B4415Fd4428362058F241984ac"
  // );

  // await Mp.setMarketplaceBorrower(mpBorrrower.address);

  // console.log(
  //   await jTry.balanceOf(carol.address),
  //   "this is carol balande before"
  // );

  // await mpBorrrower
  //   .connect(carol)
  //   .borrowTokens(ethers.utils.parseUnits("500", 18));

  // console.log(
  //   await jTry.balanceOf(carol.address),
  //   "this is carol balande after"
  // );
}

test().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
