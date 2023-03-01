import hre, { ethers } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";
import { deploySwapController } from "./deploySwapController";

let admin: any,
  alice: any,
  bob: any,
  carol: any,
  teamMultisig: any,
  asim1: any,
  asim2: any;

import {
  RewardsDistributor,
  VotingEscrow,
  VeArtProxy,
  Voter,
  Minter,
} from "../typechain-types/contracts/XEQ";
import { ERC4626StakingPool } from "../typechain-types/contracts/XEQ/ERC4626";
import { MintableBurnableSyntheticTokenPermit } from "../typechain-types/contracts/SyntheticToken";
import {
  BribeFactory,
  GaugeFactory,
  PairFactory,
  WrappedExternalBribeFactory,
} from "../typechain-types/contracts/XEQ/factories";
import { deployCTokens } from "./deployCTokens";

export async function deployXEQPlatform(
  jTry: any,
  xJTRY: any,
  JUSDC: any,
  xUSDC: any
) {
  [admin, alice, bob, carol, teamMultisig, asim1, asim2] =
    await ethers.getSigners();
  // deploying Xeq
  const Xeq = (await _deploy("MintableBurnableSyntheticTokenPermit", [
    "0xEquity",
    "XEQ",
    18,
  ])) as MintableBurnableSyntheticTokenPermit;
  console.log("Xeq deployed to: ", Xeq.address);
  await Xeq.addMinter(admin.address);
  await Xeq.mint(bob.address, ethers.utils.parseUnits("999999999999999", 18));
  await Xeq.mint(carol.address, ethers.utils.parseUnits("999999999999999", 18));

  // deploying GaugeFactory
  const gaugeFactory = (await _deploy("GaugeFactory", [])) as GaugeFactory; // creates gauges (distributes rewards to Liq pools)
  console.log("GaugeFactory deployed to: ", gaugeFactory.address);

  // deploying bribeFactory
  const bribeFactory = (await _deploy("BribeFactory", [])) as BribeFactory;
  console.log("BribeFactory deployed to: ", bribeFactory.address);

  // deploying pairFactory
  const pairFactory = (await _deploy("PairFactory", [])) as PairFactory;
  console.log("PairFactory deployed to: ", pairFactory.address);

  const weth = await _deploy("Mockerc20", ["Wrapped ETH", "WETH"]);
  console.log("WETH is deployed at: ", weth.address);

  const router = await _deploy("Router", [pairFactory.address, weth.address]);
  console.log("Router is deployed at: ", router.address);

  // deploying art Proxy
  const artProxy = (await _deploy("VeArtProxy", [])) as VeArtProxy;
  console.log("VeArtProxy deployed to: ", artProxy.address);

  // deploying Voting Escro
  const escrow = (await _deploy("VotingEscrow", [
    Xeq.address,
    artProxy.address,
  ])) as VotingEscrow;
  console.log("VotingEscrow deployed to: ", escrow.address);
  console.log("Args: ", Xeq.address, artProxy.address, "\n");

  // now deploying reward distribution

  const distributor = (await _deploy("RewardsDistributor", [
    escrow.address,
  ])) as RewardsDistributor;
  console.log("RewardsDistributor deployed to: ", distributor.address);
  console.log("Args: ", escrow.address, "\n");
  // await verifyContract(distributor.address, [escrow.address]);

  // deploying voter
  const voter = (await _deploy("Voter", [
    escrow.address,
    pairFactory.address,
    gaugeFactory.address,
    bribeFactory.address,
  ])) as Voter;

  // await verifyContract(voter.address, [escrow.address,
  //   pairFactory.address,
  //   gaugeFactory.address,
  //   bribeFactory.address
  // ]);

  console.log("Voter deployed to: ", voter.address);
  console.log(
    "Args: ",
    escrow.address,
    pairFactory.address,
    gaugeFactory.address,
    bribeFactory.address,
    "\n"
  );

  // deploying minter
  const minter = (await _deploy("Minter", [
    voter.address,
    escrow.address,
    distributor.address,
  ])) as Minter;

  // await verifyContract(minter.address, [  voter.address,
  //   escrow.address,
  //   distributor.address]);
  console.log("Minter deployed to: ", minter.address);
  console.log(
    "Args: ",
    voter.address,
    escrow.address,
    distributor.address,
    "\n"
  );

  // -------------------------DEPLOYING ERC4626-------------------------------------------------//

  //   const jUSDC = await _deploy("Mockerc20", ["jUSDC", "jUSDC"]); // TODO : to be removed, just for test
  // const jUSDC = "0x5bcaac3B1F8b21D9727B6B0541bdf5d5E66B205c";
  // const jTRY = "0x0699421De83f691cC9A74EEf82a7907efFF282fC";
  const [cUSDC, cJTRY] = await deployCTokens();

  // deploying custom vault for jtry
  const customVaultjTry = await _deploy("CustomVault", [
    admin.address,
    jTry, // stake token
    xJTRY.address, // xToken
    "xJTRY", // name
  ]);

  await xJTRY.addMinter(customVaultjTry.address);
  await xJTRY.addBurner(customVaultjTry.address);

  const erc4626StakingPool = (await _deploy("ERC4626StakingPool", [
    admin.address,
    xJTRY.address, // jtryAddress,
    cJTRY.address,
    "sTRY",
  ])) as ERC4626StakingPool;

  await cJTRY.addMinter(erc4626StakingPool.address);
  // creating gauge for staking pool
  await voter.createGaugeForNonpairPool(
    erc4626StakingPool.address,
    xJTRY.address
  );
  const stakingPoolGauge = await voter.gauges(erc4626StakingPool.address);
  console.log("stakingPoolGauge in scripts", stakingPoolGauge);
  await erc4626StakingPool.setGauge(stakingPoolGauge);

  const vaultRouterJtry = await _deploy("VaultRouter", [
    jTry, // stake token
    customVaultjTry.address, // custom vault
    erc4626StakingPool.address, // main vault
    xJTRY.address, // xtoken
    stakingPoolGauge,
  ]);

  // for USDC
  const customVaultUSDC = await _deploy("CustomVault", [
    admin.address,
    JUSDC,
    xUSDC.address,
    "xUSDC",
  ]);

  await xUSDC.addMinter(customVaultUSDC.address);
  await xUSDC.addBurner(customVaultUSDC.address);

  const mainVaultUSDC = await _deploy("ERC4626StakingPool", [
    admin.address,
    xUSDC.address,
    cUSDC.address,
    "sUSDC",
  ]);

  await voter.createGaugeForNonpairPool(mainVaultUSDC.address, xUSDC.address);
  const gauge = await voter.gauges(mainVaultUSDC.address);

  const vaultRouterUSDC = await _deploy("VaultRouter", [
    JUSDC,
    customVaultUSDC.address,
    mainVaultUSDC.address,
    xUSDC.address,
    gauge,
  ]);
  // CONFIGS-------------------------------------------------------

  await minter.setTeam(carol.address);
  await Xeq.addMinter(minter.address);

  await pairFactory.setPauser(teamMultisig.address);

  await escrow.setVoter(voter.address);
  console.log("Voter set");

  await escrow.setTeam(carol.address);
  console.log("Team set for escrow");

  await voter.setGovernor(carol.address);
  console.log("Governor set");

  await voter.setEmergencyCouncil(carol.address);
  console.log("Emergency Council set");

  await distributor.setDepositor(minter.address);
  console.log("Depositor set");

  await voter.initialize(
    [
      Xeq.address,
      "0xaEbf6850CeA7142382CAE2d84451bDAaCbBb79F7",
      weth.address,
      "0x5bcaac3B1F8b21D9727B6B0541bdf5d5E66B205c",
    ],
    minter.address
  );
  console.log("Whitelist set");

  await minter.initialize(
    [asim1.address, asim2.address],
    [ethers.utils.parseUnits("10000", 18), ethers.utils.parseUnits("5000", 18)],
    ethers.utils.parseUnits("15000", 18)
  );
  console.log("veXeq distributed");

  // const usdc = await _deploy("Mockerc20", "USDC Stable", "USDC");
  // console.log("WETH is deployed at: ", weth.address);

  return [erc4626StakingPool, stakingPoolGauge, Xeq, cJTRY, cUSDC, voter,customVaultjTry,vaultRouterJtry,customVaultUSDC,vaultRouterUSDC,mainVaultUSDC];
}

// deployXEQPlatform().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
