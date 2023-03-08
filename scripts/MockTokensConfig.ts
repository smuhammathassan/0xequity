import hre, { ethers, web3 } from "hardhat";

export async function MockTokensConfig({ JUSDC, JEuro, jTry }: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const user1 = accounts[2];
  const user2 = accounts[3];

  /* ------------------------------ minting jUSDC ----------------------------- */

  // const tx101 = await JUSDC.connect(tokeny).mint(
  //   user1.address,
  //   ethers.utils.parseUnits("1000000000000000000000000", 6)
  // );
  // await tx101.wait();

  // const tx102 = await JUSDC.connect(tokeny).mint(
  //   user2.address,
  //   ethers.utils.parseUnits("1000000000000000000000000", 6)
  // );
  // await tx102.wait();

  // /* ------------------------------ minting jEuro ----------------------------- */

  // const tx10 = await JEuro.connect(tokeny).mint(
  //   user2.address,
  //   ethers.utils.parseUnits("1000000000", 18)
  // );
  // await tx10.wait();

  // /* ------------------------------ minting jTry ------------------------------ */

  // const tx11110 = await JEuro.connect(tokeny).mint(
  //   "0xF1f6Cc709c961069D33F797575eA966c94C1357B",
  //   ethers.utils.parseUnits("1000000000", 18)
  // );
  // await tx11110.wait();

  // const tx11 = await jTry
  //   .connect(tokeny)
  //   .mint(user2.address, ethers.utils.parseUnits("1000000000", 18));
  // await tx11.wait();
  // const tx11000 = await jTry
  //   .connect(tokeny)
  //   .mint(
  //     "0xF1f6Cc709c961069D33F797575eA966c94C1357B",
  //     ethers.utils.parseUnits("1000000000", 18)
  //   );
  // await tx11000.wait();
}
