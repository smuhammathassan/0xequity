import hre, { ethers } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";
import { deployTREXFactory } from "./deployTREXFactory";
import { deployMocksTokens } from "./deployMocksTokens";
import { MockTokensConfig } from "./MockTokensConfig";
import { deployRentShare } from "./deployRentShare";
import { deployPriceFeed } from "./deployPriceFeed";
import { deployFeeManager } from "./deployFeeManager";
import { deployOCLRouter } from "./deployOCLRouter";
import { deployMockAggregator } from "./deployMockAggregator";
import { setCurrencyToFeed } from "./setCurrencyToFeed";
import { deployFinder } from "./deployFinder";
import { deploySwapController } from "./deploySwapController";
import { finderConfig } from "./finderConfig";
import { signMetaTxRequest } from "./MetaTx";
import { deployXEQPlatform } from "./0xXeqPlatformdeploy";
import { any } from "hardhat/internal/core/params/argumentTypes";

export async function deploySwapFlowWithXEQ() {
  const accounts = await hre.ethers.getSigners();
  const admin = accounts[0];
  const user1 = accounts[2];
  const user2 = accounts[3];
  // const vrouterJtry = await ethers.getContractAt(
  //   "VaultRouter",
  //   "0x818774C942f22552d2938b78C3B5F3Ca34DbC67a"
  // );
  // const jtryInstannce = await ethers.getContractAt("MintableBurnableSyntheticTokenPermit","")
  // await jTry.approve(vrouterJtry.address, ethers.utils.parseUnits("10000", 18));

  // const dm = await ethers.getContractAt(
  //   "DepositManager",
  //   "0x7a569481876b9337c0ea58684F5c8AF035E41E3e"
  // );
  // console.log(await dm.RESERVE_POOL(), "reserve pool");

  // const gau = await ethers.getContractAt(
  //   "Gauge",
  //   "0x42CCc99991ab8dF476B01081F8Ee0D4CD66C3479"
  // );

  // await gau.withdrawAll();
  // return;
  /* ------------------------------------------------------------------------- */
  /*                               DEPLOY 0XEQUITY                             */
  /* ------------------------------------------------------------------------- */

  /* ---------------------------- GENERIC CONTRACTS --------------------------- */

  const { JUSDC, JEuro, jTry, vTRY, xJTRY, xUSDC } = await deployMocksTokens();
  const { mock1, mock2, mock3 } = await deployMockAggregator();
  const { finder } = await deployFinder();

  /* --------------------------- PROTOCOL CONTRACTS --------------------------- */

  const { priceFeed } = await deployPriceFeed();
  console.log("Before SBT Config");
  console.log("Before finderConfig");

  const { FeeManager } = await deployFeeManager();

  const [
    ercStakingPool,
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
    buybackVaultUSDC,
    buybackVaultJTRY,
  ] = await deployXEQPlatform(jTry.address, xJTRY, JUSDC.address, xUSDC);

  const { SwapController } = await deploySwapController(
    ercStakingPool.address,
    cJTRY.address,
    cUSDC.address
  );

  const { OCLRouter } = await deployOCLRouter(
    finder.address,
    SwapController.address
  );

  await ercStakingPool
    .connect(admin)
    .setAddressToCTokenPercentage(SwapController.address, 6000); // 60 %

  await ercStakingPool
    .connect(admin)
    .setBuyBackPoolPercentage(buybackVaultJTRY.address, 2000);

  await mainVaultUSDC
    .connect(admin)
    .setAddressToCTokenPercentage(SwapController.address, 6000); // 50 %

  await mainVaultUSDC
    .connect(admin)
    .setBuyBackPoolPercentage(buybackVaultUSDC.address, 2000);

  // console.log("Hellp");
  const { Maintainer, MarketplaceInterface, burnerRole } = await finderConfig({
    finder,
    RShareInstance: any, // make sure to comment this and SBT inside the finder config
    priceFeed,
    vTRY,
    SBT: any,
    FeeManager,
    Xeq,
    OCLRouter,
  });

  await setCurrencyToFeed({
    priceFeed,
    currency: jTry,
    mockAggregator: mock1,
    pairname: "TRYUSD",
  });
  console.log("Setting Currency To Fee1");

  await setCurrencyToFeed({
    priceFeed,
    currency: vTRY,
    mockAggregator: mock1,
    pairname: "vTRYUSD",
  });
  console.log("Setting Currency To Fee1");

  await setCurrencyToFeed({
    priceFeed,
    currency: JEuro,
    mockAggregator: mock2,
    pairname: "EURUSD",
  });
  console.log("Setting Currency To Fee1");

  await setCurrencyToFeed({
    priceFeed,
    currency: JUSDC,
    mockAggregator: mock3,
    pairname: "USDCUSD",
  });
  console.log("Before MockTokensConfig");

  await JUSDC.connect(admin).addMinter(admin.address);
  await JUSDC.connect(admin).mint(
    user2.address,
    ethers.utils.parseUnits("100000000000", 6)
  );

  await MockTokensConfig({ JUSDC, JEuro, jTry });
  console.log("Before marketplaceConfig");

  await jTry
    .connect(admin)
    .mint(user2.address, ethers.utils.parseUnits("100000000000000000", 18));

  // ///// TEST SWAP IN OCL ///////////////////////////////////////////////////////
  await jTry
    .connect(admin)
    .mint(
      OCLRouter.address,
      ethers.utils.parseUnits("1000000000000000000000000000000000000000000")
    );
  await JEuro.connect(admin).addMinter(admin.address);
  await JEuro.connect(admin).mint(
    admin.address,
    ethers.utils.parseUnits("1000000000000000000000000000000")
  );
  await JEuro.connect(admin).approve(
    OCLRouter.address,
    ethers.utils.parseUnits("10000000000000000000000000000000")
  );

  // // first, staking some tokens in Staking pool
  await jTry
    .connect(admin)
    .approve(
      ercStakingPool.address,
      ethers.utils.parseUnits("2000000000000000000000000", 18)
    );
  await jTry
    .connect(admin)
    .mint(admin.address, ethers.utils.parseUnits("6000000000000000", 18));
  console.log("Before the stake");
  console.log(
    await cJTRY.balanceOf(ercStakingPool.address),
    "This is pools cJTRY balance"
  );
  console.log("after 1st stake");

  await SwapController.connect(admin).setXToken(xJTRY.address);
  await SwapController.connect(admin).setCustomVaultJtry(
    customVaultjTry.address
  );
  await SwapController.connect(admin).setJTRY(jTry.address);
  const depositManager = await ercStakingPool.depositManager();
  const depositManagerUSDC = await mainVaultUSDC.depositManager();
  await vaultRouterJtry.updateDepositManager(depositManager);
  await vaultRouterUSDC.updateDepositManager(depositManagerUSDC);
  console.log(depositManager, "this is deposit manager");
  console.log(depositManagerUSDC, "depositManagerUSDC this is deposit manager");
  await customVaultjTry.connect(admin).setDepositManager(depositManager);
  await customVaultUSDC.connect(admin).setDepositManager(depositManagerUSDC);
  // await vaultRouterJtry.updateDepositManager(depositManager);
  // await vaultRouterUSDC.updateDepositManager(depositManagerUSDC);
  await SwapController.connect(admin).setFeeReceiver(accounts[3].address);
  await SwapController.connect(admin).setVaultRouter(vaultRouterUSDC.address);

  await cUSDC.connect(admin).addMinter(mainVaultUSDC.address);
  await cJTRY.connect(admin).addMinter(ercStakingPool.address);

  await xJTRY.connect(admin).addMinter(customVaultjTry.address);
  await xUSDC.connect(admin).addMinter(customVaultUSDC.address);
  await xJTRY.connect(admin).addBurner(customVaultjTry.address);
  await xUSDC.connect(admin).addBurner(customVaultUSDC.address);
  await JUSDC.connect(admin).mint(
    admin.address,
    ethers.utils.parseUnits("700000000000", 6)
  );
  await jTry
    .connect(admin)
    .mint(admin.address, ethers.utils.parseUnits("700000000000", 18));

  await JUSDC.connect(admin).approve(
    vaultRouterUSDC.address,
    ethers.utils.parseUnits("700000000000", 18)
  );

  await jTry
    .connect(admin)
    .approve(
      vaultRouterJtry.address,
      ethers.utils.parseUnits("700000000000", 18)
    );
  console.log("stake--------------------------------------------");
  // stake in usdc vault
  await vaultRouterUSDC
    .connect(admin)
    .stake(
      ethers.utils.parseUnits("500", 6),
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      true
    );
  console.log("after 1st stake");

  console.log(await buybackVaultUSDC.balanceOf(admin.address), "BBY balance");

  await buybackVaultUSDC.approve(
    vaultRouterUSDC.address,
    ethers.utils.parseUnits("1000", 18)
  );
  await vaultRouterUSDC.unstakeBuyBackToken(
    buybackVaultUSDC.address,
    ethers.utils.parseUnits("100", 6),
    JUSDC.address,
    customVaultUSDC.address,
    xUSDC.address
  );

  console.log(
    await buybackVaultUSDC.balanceOf(admin.address),
    "BBY balance after unstake"
  );

  // let dmUSDC = await ethers.getContractAt("DepositManager", depositManagerUSDC);
  // console.log(dmUSDC.address, "DepositManager in script");
  // // console.log(await dmUSDC.RESERVE_POOL(), "this is reserve address");
  // const ammController = await mainVaultUSDC.getAllowedCTokenAddresses();
  // console.log(
  //   await dmUSDC.controllerSupply(ammController[0]),
  //   "this resreve pool"
  // );
  // console.log(await dmUSDC.controllerSupply(ammController[1]), "this amm pool");
  // console.log(
  //   await dmUSDC.userToControllerBalances(admin.address, ammController[1]),
  //   "user to c"
  // );
  // await dmUSDC.borrowFund(ammController[1], ethers.utils.parseUnits("40", 6));
  // console.log(
  //   await dmUSDC.controllerSupply(ammController[1]),
  //   "cSupply after borrow amm pool"
  // );
  // console.log(
  //   await dmUSDC.controllerUtilization(ammController[1]),
  //   "c utilization after borrow amm pool"
  // );

  // console.log(
  //   await dmUSDC.getAmountToWithdrawFromControllers(
  //     admin.address,
  //     ammController
  //   ),
  //   "THis is amount to withdraw from c"
  // );

  // await mainVaultUSDC.approve(
  //   vaultRouterUSDC.address,
  //   ethers.utils.parseUnits("100", 6)
  // );

  // console.log(await JUSDC.balanceOf(admin.address), "Balance before");
  // console.log(await mainVaultUSDC.balanceOf(ammController[0]), "Balance of sTOken before");

  // await vaultRouterUSDC.withdraw(ethers.utils.parseUnits("100", 6));
  // console.log(await mainVaultUSDC.balanceOf(ammController[0]), "Balance of sTOken after");

  // console.log(await JUSDC.balanceOf(admin.address), "Balance after");
  // console.log(ammController[2], "this is controllerss 2");

  // await jTry.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("1000", 18)
  // );

  // // // stake in jtry vault router
  // await vaultRouterJtry
  //   .connect(admin)
  //   .stake(
  //     ethers.utils.parseUnits("500", 18),
  //     ethers.constants.AddressZero,
  //     ethers.constants.AddressZero,
  //     true
  //   );
  // console.log(
  //   await cJTRY.balanceOf(SwapController.address),
  //   "cJTRY balance of controlerr"
  // );

  // console.log(
  //   await cUSDC.balanceOf(SwapController.address),
  //   "cUSDC balance of controlerr"
  // );

  // // now swapping using the oclr USDC to JTRY

  // await JUSDC.connect(admin).approve(
  //   OCLRouter.address,
  //   ethers.utils.parseUnits("99999999999999999999999999", 18)
  // );
  // // console.log(
  // //   await jTry.balanceOf(customVaultjTry.address),
  // //   "This is xtyrysdasdhgsdgasdasd"
  // // );

  // console.log(
  //   await jTry.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap jtry before swap"
  // );
  // await OCLRouter.connect(admin).swapTokensForExactOut(
  //   JUSDC.address, //token in
  //   jTry.address, // token out
  //   ethers.utils.parseUnits("50", 18),
  //   accounts[7].address,
  //   [customVaultjTry.address, vaultRouterUSDC.address]
  // );

  // console.log(
  //   await jTry.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap jtry"
  // );

  // console.log(ammController[1], "ammController[1]");
  // console.log(SwapController.address, "SwapController.address");

  // const dmJtry = await ethers.getContractAt("DepositManager", depositManager);
  // const ammControllerJtry = await ercStakingPool.getAllowedCTokenAddresses();

  // console.log(
  //   await dmJtry.controllerUtilization(ammControllerJtry[0]),
  //   "reserves utilization"
  // );
  // console.log(
  //   await dmJtry.controllerUtilization(ammControllerJtry[1]),
  //   "AMM utilization"
  // );
  // console.log(
  //   await mainVaultUSDC.balanceOf(),
  //   "balance of acccount 7 affter swap jtry"
  // );

  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxUSDC to JTRY swap donexxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // now swapping from JTRY to USDC

  // await jTry
  //   .connect(admin)
  //   .approve(
  //     OCLRouter.address,
  //     ethers.utils.parseUnits("99999999999999999999999999", 18)
  //   );

  // console.log(
  //   await JUSDC.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap jusdc before swap"
  // );
  // await OCLRouter.connect(admin).swapTokensForExactOut(
  //   jTry.address,
  //   JUSDC.address,
  //   ethers.utils.parseUnits("200", 6),
  //   accounts[7].address,
  //   [customVaultUSDC.address, vaultRouterJtry.address]
  // );

  // console.log(
  //   await JUSDC.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap JUSDC"
  // );
  // // console.log(
  // //   await mainVaultUSDC.balanceOf(),
  // //   "balance of acccount 7 affter swap JUSDC"
  // // );
  // console.log(
  //   await dmUSDC.controllerUtilization(ammController[0]),
  //   "reserves utilization"
  // );
  // console.log(
  //   await dmUSDC.controllerUtilization(ammController[1]),
  //   "AMM utilization"
  // );

  console.log("Done!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deploySwapFlowWithXEQ().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
