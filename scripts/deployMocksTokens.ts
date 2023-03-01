import hre, { ethers, web3 } from "hardhat";
import {
  deployArtifacts,
  _deploy,
  _deployWithLibrary,
} from "../scripts/deployArtifacts";
export async function deployMocksTokens() {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  /* -------------------------------------------------------------------------- */
  /*                             Deploying USDC Mock                            */
  /* -------------------------------------------------------------------------- */
  const JUSDC = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "jUSDC",
    "jUSDC",
    6,
  ]);
  console.log("JUSDC : ", JUSDC.address);

  const tx12200 = await JUSDC.connect(tokeny).addMinter(tokeny.address);
  await tx12200.wait();

  /* -------------------------------------------------------------------------- */
  /*                            DEPLOYING JEURO MOCK                            */
  /* -------------------------------------------------------------------------- */

  const JEuro = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "jEUR",
    "jEUR",
    18,
  ]);

  console.log("JEuro : ", JEuro.address);

  const tx122121 = await JEuro.connect(tokeny).addMinter(tokeny.address);
  await tx122121.wait();

  /* -------------------------------------------------------------------------- */
  /*                             DEPLOYING JTRY MOCK                            */
  /* -------------------------------------------------------------------------- */

  const jTry = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "jTRY",
    "jTRY",
    18,
  ]);

  console.log("jTry : ", jTry.address);
  const tx122111 = await jTry.connect(tokeny).addMinter(tokeny.address);
  await tx122111.wait();

  /* -------------------------------------------------------------------------- */
  /*                              DEPLOY VTRY MOCK                              */
  /* -------------------------------------------------------------------------- */

  const vTRY = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "vTRY",
    "vTRY",
    18,
  ]);
  console.log("vTRY : ", vTRY.address);

  const xJTRY = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "xJTRY",
    "xJTRY",
    18,
  ]);
  console.log("xJTRY : ", xJTRY.address);

  const xUSDC = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "xUSDC",
    "xUSDC",
    6,
  ]);
  console.log("xUSDC : ", xUSDC.address);

  return { JUSDC, JEuro, jTry, vTRY, xJTRY, xUSDC };
}
