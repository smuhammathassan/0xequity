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
    await hre.ethers.getSigners();
  // deploying Xeq
  const Xeq = (await _deploy("MintableBurnableSyntheticTokenPermit", [
    "0xEquity",
    "XEQ",
    18,
  ])) as MintableBurnableSyntheticTokenPermit;
  console.log("Xeq deployed to: ", Xeq.address);
  await Xeq.connect(admin).addMinter(admin.address);
  console.log("Minter added");
  await Xeq.connect(admin).mint(
    bob.address,
    ethers.utils.parseUnits("999999999999999", 18)
  );
  await Xeq.connect(admin).mint(
    carol.address,
    ethers.utils.parseUnits("999999999999999", 18)
  );

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
    "xJTRY", // name
    admin.address,
    jTry, // stake token
    xJTRY.address, // xToken
  ]);

  await xJTRY.connect(admin).addMinter(customVaultjTry.address);
  await xJTRY.connect(admin).addBurner(customVaultjTry.address);

  const erc4626StakingPool = (await _deploy("ERC4626StakingPool", [
    "sTRY",
    admin.address,
    xJTRY.address, // jtryAddress,
    cJTRY.address,
  ])) as ERC4626StakingPool;

  await cJTRY.connect(admin).addMinter(erc4626StakingPool.address);
  // creating gauge for staking pool
  const tx = await voter
    .connect(admin)
    .createGaugeForNonpairPool(erc4626StakingPool.address, xJTRY.address);
  await tx.wait();
  const stakingPoolGauge = await voter.gauges(erc4626StakingPool.address);
  // "0x7517f35c79299fb7f167fd78a33fc536794fa16a";
  //
  //{  address: "0x42ccc99991ab8df476b01081f8ee0d4cd66c3479",

  console.log("stakingPoolGauge in scripts", stakingPoolGauge);
  await erc4626StakingPool.connect(admin).setGauge(stakingPoolGauge);
  console.log("before deploying vaiult r1");
  const vaultRouterJtry = await _deploy("VaultRouter", [
    jTry, // stake token
    customVaultjTry.address, // custom vault
    erc4626StakingPool.address, // main vault
    xJTRY.address, // xtoken
    stakingPoolGauge,
  ]);

  console.log("before deploying vaiult r2");

  // for USDC
  const customVaultUSDC = await _deploy("CustomVault", [
    "xUSDC",
    admin.address,
    JUSDC,
    xUSDC.address,
  ]);

  await xUSDC.connect(admin).addMinter(customVaultUSDC.address);
  await xUSDC.connect(admin).addBurner(customVaultUSDC.address);

  const mainVaultUSDC = await _deploy("ERC4626StakingPool", [
    "sUSDC",
    admin.address,
    xUSDC.address,
    cUSDC.address,
  ]);

  const tx2 = await voter
    .connect(admin)
    .createGaugeForNonpairPool(mainVaultUSDC.address, xUSDC.address);
  await tx2.wait();
  const gaugeUSDC = await voter.gauges(mainVaultUSDC.address);
  // ("0x798fe91d2cce9638a49570ed14d1d467e91605fb");

  //  { address: "0x37a04f98dfaf50c17ca4269427d630126638e97c" };
  const vaultRouterUSDC = await _deploy("VaultRouter", [
    JUSDC,
    customVaultUSDC.address,
    mainVaultUSDC.address,
    xUSDC.address,
    gaugeUSDC,
  ]);
  // CONFIGS-------------------------------------------------------

  await minter.connect(admin).setTeam(carol.address);
  await Xeq.connect(admin).addMinter(minter.address);

  await pairFactory.connect(admin).setPauser(teamMultisig.address);

  await escrow.connect(admin).setVoter(voter.address);
  console.log("Voter set");

  await escrow.connect(admin).setTeam(carol.address);
  console.log("Team set for escrow");

  await voter.connect(admin).setGovernor(carol.address);
  console.log("Governor set");

  await voter.connect(admin).setEmergencyCouncil(carol.address);
  console.log("Emergency Council set");

  await distributor.connect(admin).setDepositor(minter.address);
  console.log("Depositor set");

  await voter
    .connect(admin)
    .initialize(
      [
        Xeq.address,
        "0xaEbf6850CeA7142382CAE2d84451bDAaCbBb79F7",
        weth.address,
        "0x5bcaac3B1F8b21D9727B6B0541bdf5d5E66B205c",
      ],
      minter.address
    );
  console.log("Whitelist set");

  await minter
    .connect(admin)
    .initialize(
      [asim1.address, asim2.address],
      [
        ethers.utils.parseUnits("10000", 18),
        ethers.utils.parseUnits("5000", 18),
      ],
      ethers.utils.parseUnits("15000", 18)
    );
  console.log("veXeq distributed");

  // const usdc = await _deploy("Mockerc20", "USDC Stable", "USDC");
  // console.log("WETH is deployed at: ", weth.address);

  return [
    erc4626StakingPool,
    stakingPoolGauge,
    Xeq,
    cJTRY,
    cUSDC,
    voter,
    customVaultjTry,
    vaultRouterJtry,
    customVaultUSDC,
    vaultRouterUSDC,
    mainVaultUSDC,
    gaugeUSDC,
  ];
}

// deployXEQPlatform().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
