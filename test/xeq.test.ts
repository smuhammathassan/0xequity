/* eslint-disable prefer-const */
import { tracer } from "hardhat";
import "@nomiclabs/hardhat-web3";
import { expect, assert } from "chai";
import { createHash } from "crypto";

import { Contract } from "ethers";
import hre, { ethers, web3 } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { AlchemyProvider } from "@ethersproject/providers";
let velo,
  gaugeFactory,
  artProxy,
  escrow,
  bribeFactory,
  voter,
  pairFactory,
  distributor,
  minter,
  usdc,
  xeq,
  WETH,
  jTRY,
  vTRY,
  router,
  xequsdPair,
  pairUSDC,
  pairJTRY,
  stakingPoolErc4626;
let admin, alice, bob, carol, teamMultisig, asim1, asim2;
const WEEK = 604800;
const valueToTransfer = ethers.utils.parseUnits("3000", 18);

describe.only("XEQ Platform", function () {
  before("Setting up accounts and stuff", async function () {
    // getting signers
    [admin, alice, bob, carol, teamMultisig, asim1, asim2] =
      await ethers.getSigners();
  });
  async function deployContracts() {
    // Load
    const [
      Xeq,
      GaugeFactory,
      BribeFactory,
      PairFactory,
      VeArtProxy,
      VotingEscrow,
      RewardsDistributor,
      Voter,
      Minter,
    ] = await Promise.all([
      ethers.getContractFactory("MintableBurnableSyntheticTokenPermit"),
      ethers.getContractFactory("GaugeFactory"),
      ethers.getContractFactory("BribeFactory"),
      ethers.getContractFactory("PairFactory"),
      ethers.getContractFactory("VeArtProxy"),
      ethers.getContractFactory("VotingEscrow"),
      ethers.getContractFactory("RewardsDistributor"),
      ethers.getContractFactory("Voter"),
      ethers.getContractFactory("Minter"),
    ]);

    // deploying VELO
    xeq = await Xeq.deploy("0xEquity", "XEQ", 18);
    await xeq.deployed();
    console.log("XEQ deployed to: ", xeq.address);

    // deploying GaugeFactory
    gaugeFactory = await GaugeFactory.deploy(); // creates gauges (distributes rewards to Liq pools)
    await gaugeFactory.deployed();
    console.log("GaugeFactory deployed to: ", gaugeFactory.address);

    //deploying bribeFactory
    bribeFactory = await BribeFactory.deploy();
    console.log("BribeFactory deployed to: ", bribeFactory.address);

    // deploying Pair Factory
    pairFactory = await PairFactory.deploy();
    console.log("pairFactory deployed to: ", pairFactory.address);

    // deploying WETH
    WETH = await (
      await (
        await ethers.getContractFactory("Mockerc20")
      ).deploy("Wrapped ETH", "WETH")
    ).deployed();
    console.log(WETH.address, "WETH is deployed at: ");

    // deploying router
    router = await (
      await (
        await ethers.getContractFactory("Router")
      ).deploy(pairFactory.address, WETH.address)
    ).deployed();
    console.log(router.address, "Router is deployed at: ");

    // deploying art Proxy
    artProxy = await VeArtProxy.deploy();
    await artProxy.deployed();
    console.log("VeArtProxy deployed to: ", artProxy.address);

    // deploying Voting Escro
    escrow = await VotingEscrow.deploy(xeq.address, artProxy.address);
    await escrow.deployed();
    console.log("VotingEscrow deployed to: ", escrow.address);
    // console.log("Args: ", velo.address, artProxy.address, "\n");

    // now deploying reward distribution
    distributor = await RewardsDistributor.deploy(escrow.address);
    console.log("RewardsDistributor deployed to: ", distributor.address);

    // deploying voter
    voter = await Voter.deploy(
      escrow.address,
      pairFactory.address,
      gaugeFactory.address,
      bribeFactory.address
    );
    console.log("Voter deployed to: ", voter.address);

    // deploying the minter
    minter = await Minter.deploy(
      voter.address,
      escrow.address,
      distributor.address
    );
    console.log("Minter deployed to: ", minter.address);

    // deploying USDC
    usdc = await (
      await (
        await ethers.getContractFactory("Mockerc20")
      ).deploy("USDC Stable", "USDC")
    ).deployed();

    console.log(usdc.address, "USDC is deployed at: ");

    jTRY = await (
      await (
        await ethers.getContractFactory("Mockerc20")
      ).deploy("JTRY", "JTRY")
    ).deployed();

    console.log(jTRY.address, "jTRY is deployed at: ");

    vTRY = await (
      await (
        await ethers.getContractFactory("Mockerc20")
      ).deploy("vTRY", "vTRY")
    ).deployed();

    console.log(vTRY.address, "vTRY is deployed at: ");

    stakingPoolErc4626 = await (
      await (
        await ethers.getContractFactory("ERC4626StakingPool")
      ).deploy(admin.address, xeq.address, jTRY.address)
    ).deployed();

    // await verifyContract(velo.address, []);
    // await verifyContract(gaugeFactory.address, []);
    // await verifyContract(bribeFactory.address, []);
    // await verifyContract(pairFactory.address, []);
    // await verifyContract(WETH.address, ["Wrapped ETH", "WETH"]);
    // await verifyContract(router.address, [pairFactory.address, WETH.address]);
    // await verifyContract(artProxy.address, []);
    // await verifyContract(escrow.address, [velo.address, artProxy.address]);
    // await verifyContract(distributor.address, [escrow.address]);
    // await verifyContract(voter.address, [
    //   escrow.address,
    //   pairFactory.address,
    //   gaugeFactory.address,
    //   bribeFactory.address,
    // ]);
    // await verifyContract(minter.address, [
    //   voter.address,
    //   escrow.address,
    //   distributor.address,
    // ]);
    // await verifyContract(usdc.address, ["USDC Stable", "USDC"]);
    // await verifyContract(xeq.address, ["0xEquity", "XEQ"]);

    // CONFIGS-------------------------------------------------------

    await minter.setTeam(carol.address);

    await xeq.addMinter(minter.address);

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
      [xeq.address, usdc.address, WETH.address, jTRY.address],
      minter.address
    );
    console.log("Whitelist set");

    await minter.initialize(
      [asim1.address, asim2.address],
      [
        ethers.utils.parseUnits("10000", 18),
        ethers.utils.parseUnits("5000", 18),
      ],
      ethers.utils.parseUnits("15000", 18)
    );
    console.log("veVELO distributed");
  }

  async function distributeJTRY() {
    const valueToTransfer = ethers.utils.parseUnits("100000", 18);
    await jTRY.transfer(alice.address, valueToTransfer);
    await jTRY.transfer(bob.address, valueToTransfer);
    await jTRY.transfer(carol.address, valueToTransfer);
    await jTRY.transfer(teamMultisig.address, valueToTransfer);
    await jTRY.transfer(asim1.address, valueToTransfer);
    await jTRY.transfer(asim2.address, valueToTransfer);

    console.log(
      "END OF JTRY DISTRIBUTION -----------------------------------------------------"
    );
  }

  async function stakejTRY(amount, signer) {
    await jTRY.connect(signer).approve(stakingPoolErc4626.address, amount);
    await stakingPoolErc4626.connect(signer).stake(amount);
  }

  async function distributeXeq() {
    await xeq.addMinter(admin.address);
    await xeq.mint(admin.address, ethers.utils.parseUnits("9000000000", 18));
    const valueToTransfer = ethers.utils.parseUnits("10000", 18);
    await xeq.transfer(alice.address, valueToTransfer);
    await xeq.transfer(bob.address, valueToTransfer);
    await xeq.transfer(carol.address, valueToTransfer);
    await xeq.transfer(teamMultisig.address, valueToTransfer);
    await xeq.transfer(asim1.address, valueToTransfer);
    await xeq.transfer(asim2.address, valueToTransfer);

    console.log(
      "END OF XEQ DISTRIBUTION -----------------------------------------------------"
    );
  }

  async function createLockForUser(amount, duration, signer) {
    await xeq.connect(signer).approve(escrow.address, amount);
    await escrow
      .connect(signer)
      .create_lock(amount, duration, { gasLimit: 210000000 });
    console.log("Lock created------------------------------------------");
  }

  async function voteAgainstNft(id, gaugeAddress, signer) {
    await voter.connect(signer).vote(id, [gaugeAddress], [9900]);
  }

  async function depositsTRY(gauge, amount, signer) {
    await stakingPoolErc4626.connect(signer).approve(gauge.address, amount);
    await gauge.connect(signer).deposit(amount, 0);
  }

  it("Pre-req", async function () {
    await deployContracts();
    await distributeJTRY();
    await distributeXeq();
  });

  it("Deploy staking pool", async function () {
    stakingPoolErc4626 = await (
      await (
        await ethers.getContractFactory("ERC4626StakingPool")
      ).deploy(admin.address, xeq.address, jTRY.address)
    ).deployed();

    console.log("Pool deloyed at: ", stakingPoolErc4626.address);
  });

  it("Create staking pool guage", async function () {
    await voter
      .connect(carol)
      .createGaugeForNonpairPool(stakingPoolErc4626.address, vTRY.address);

    console.log(
      await voter.gauges(stakingPoolErc4626.address),
      "THis is gauge for staking pool"
    );
  });

  it("User deposit in pool and then deposit sTry in gauge", async function () {
    const value = ethers.utils.parseUnits("10000", 18);

    await stakejTRY(value, admin);
    await stakejTRY(value, alice);
    await stakejTRY(value, bob);
    await stakejTRY(value, carol);

    let stakingPoolGauge = await voter.gauges(stakingPoolErc4626.address);
    stakingPoolGauge = await ethers.getContractAt("Gauge", stakingPoolGauge);

    // create lock for user

    await xeq.approve(escrow.address, value);
    await createLockForUser(value, WEEK, admin);
    await createLockForUser(value, WEEK, alice);
    await createLockForUser(value, WEEK, bob);
    await createLockForUser(value, WEEK, carol);

    // vote

    await voteAgainstNft(1, stakingPoolErc4626.address, admin);
    await voteAgainstNft(2, stakingPoolErc4626.address, alice);
    await voteAgainstNft(3, stakingPoolErc4626.address, bob);
    await voteAgainstNft(4, stakingPoolErc4626.address, carol);

    // now users depositing sTry into the gauge
    await depositsTRY(stakingPoolGauge, value, admin);
    await depositsTRY(stakingPoolGauge, value, alice);
    await depositsTRY(stakingPoolGauge, value, bob);
    await depositsTRY(stakingPoolGauge, value, carol);

    await vTRY.transfer(asim1.address, value);
    await vTRY.connect(asim1).approve(stakingPoolGauge.address, value);
    await stakingPoolGauge
      .connect(asim1)
      .notifyRewardAmount(vTRY.address, ethers.utils.parseUnits("5000", 18));
    // await stakingPoolGauge
    //   .connect(asim1)
    //   .notifyPoolReward(vTRY.address, ethers.utils.parseUnits("500", 18));

    // now prank to 1 week
    await time.increase(WEEK);

    console.log(await vTRY.balanceOf(alice.address), "vtry Before dist");
    console.log(await vTRY.balanceOf(bob.address), "vtry Before dist");
    console.log(await vTRY.balanceOf(carol.address), "vtry Before dist");
    console.log(
      await xeq.balanceOf(stakingPoolGauge.address),
      "Gaauge balance before"
    );

    console.log(await xeq.balanceOf(alice.address), "xeq beofre dist");
    console.log(await xeq.balanceOf(bob.address), "xeq bf dist");
    console.log(await xeq.balanceOf(carol.address), "xeq bf dist");
    await voter.distribute1(stakingPoolGauge.address);
    await time.increase(WEEK);
    await stakingPoolGauge
    .connect(asim1)
    .notifyRewardAmount(vTRY.address, ethers.utils.parseUnits("5000", 18));
    await voter.distribute1(stakingPoolGauge.address);
    await time.increase(WEEK);
    await voter.distribute1(stakingPoolGauge.address);


    await voter
      .connect(admin)
      .claimRewards([stakingPoolGauge.address], [[xeq.address, vTRY.address]]);

    await voter
      .connect(alice)
      .claimRewards([stakingPoolGauge.address], [[xeq.address, vTRY.address]]);
    await voter
      .connect(bob)
      .claimRewards([stakingPoolGauge.address], [[xeq.address, vTRY.address]]);
    await voter
      .connect(carol)
      .claimRewards([stakingPoolGauge.address], [[xeq.address, vTRY.address]]);

    console.log(await xeq.balanceOf(alice.address), "xeq After dist");
    console.log(await xeq.balanceOf(bob.address), "xeq After dist");
    console.log(await xeq.balanceOf(carol.address), "xeq After dist");

    console.log(
      await xeq.balanceOf(stakingPoolGauge.address),
      "Gaauge balance after"
    );

    console.log(await vTRY.balanceOf(alice.address), "vtry After dist");
    console.log(await vTRY.balanceOf(bob.address), "vtry After dist");
    console.log(await vTRY.balanceOf(carol.address), "vtryAfter dist");
    
  });
});
