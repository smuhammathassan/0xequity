import hre, { ethers } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";
import { deployTREXFactory } from "./deployTREXFactory";
import { deployClaimIssuer, signer, signerKey } from "./deployClaimIssuer";
import { addUserClaim } from "./addUserClaim";
import { deployMocksTokens } from "./deployMocksTokens";
import { MockTokensConfig } from "./MockTokensConfig";
import { deployRentShare } from "./deployRentShare";
import { deployPriceFeed } from "./deployPriceFeed";
import { deployFeeManager } from "./deployFeeManager";
import { deployOCLRouter } from "./deployOCLRouter";
import { deployMockAggregator } from "./deployMockAggregator";
import { setCurrencyToFeed } from "./setCurrencyToFeed";
import { deploySBT } from "./deploySBT";
import { SBTConfig } from "./SBTConfig";
import { deployFinder } from "./deployFinder";
import { deploySwapController } from "./deploySwapController";
import { finderConfig } from "./finderConfig";
import { deployMarketplace } from "./deployMarketplace";
import { marketplaceConfig } from "./marketplaceConfig";
import { addingMarketplaceClaim } from "./addingMarketplaceClaim";
import { deployRentDistributor } from "./deployRentDistributor";
import { createERC3643LegalToken } from "./createERC3643LegalToken";
import { registerIdentity } from "./registerIdentity";
import { addPropertyToMarketplace } from "./addPropertyToMarketplace";
import { signMetaTxRequest } from "./MetaTx";
import { deployXEQPlatform } from "./0xXeqPlatformdeploy";
import { deployMarketplaceBorrower } from "./deployMarketplaceBorrower";
import { xeq } from "../typechain-types/contracts";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const network = hre.hardhatArguments.network;

async function executeMetaTx({
  Marketplace,
  TrustedForwarder,
  Contract,
  Signer,
  functionName,
  args,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const relayer = accounts[5]; // trusted forwarder
  let forwarder = TrustedForwarder.connect(relayer);
  console.log("Before MetaTxReq");
  // construct the signed payload for the relayer to accept on the end user's behalf
  const { request, signature } = await signMetaTxRequest(
    Signer.provider,
    TrustedForwarder,
    {
      from: Signer.address,
      to: Contract.address,
      data: Contract.interface.encodeFunctionData(functionName, args),
    }
  );
  console.log("Just before Safe Execute.");
  //await forwarder.safeExecute(request, signature);

  let op2 = await forwarder.interface.encodeFunctionData("safeExecute", [
    request,
    signature,
  ]);

  return { op2 };
}

export async function main() {
  const accounts = await hre.ethers.getSigners();
  const admin = accounts[0];
  const user1 = accounts[2];
  const user2 = accounts[3];
  /* ------------------------------------------------------------------------- */
  /*                               DEPLOY 0XEQUITY                             */
  /* ------------------------------------------------------------------------- */

  /* ---------------------------- GENERIC CONTRACTS --------------------------- */

  const { JUSDC, JEuro, jTry, vTRY, xJTRY, xUSDC, XAU, TryB } =
    await deployMocksTokens();
  const { mock1, mock2, mock3, mockGold } = await deployMockAggregator();
  const { finder } = await deployFinder();
  const { factory } = await deployTREXFactory();
  const { claimIssuerContract } = await deployClaimIssuer();

  /* --------------------------- PROTOCOL CONTRACTS --------------------------- */

  const { RShareInstance } = await deployRentShare({ vTRY, finder });
  const { priceFeed } = await deployPriceFeed();
  const { SBT } = await deploySBT();
  console.log("Before SBT Config");
  await SBTConfig({ SBT });
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

  let txToWait;
  txToWait = await ercStakingPool
    .connect(admin)
    .setAddressToCTokenPercentage(SwapController.address, 3000); // 30 %
  await txToWait.wait();

  txToWait = await mainVaultUSDC
    .connect(admin)
    .setAddressToCTokenPercentage(SwapController.address, 3000); // 30 %
  await txToWait.wait();

  txToWait = await ercStakingPool
    .connect(admin)
    .setPassOnPoolPercentage(buybackVaultJTRY.address, 5000);
  await txToWait.wait();

  txToWait = await mainVaultUSDC
    .connect(admin)
    .setPassOnPoolPercentage(buybackVaultUSDC.address, 5000); // 20 %
  await txToWait.wait();

  const { Maintainer, MarketplaceInterface, burnerRole } = await finderConfig({
    finder,
    RShareInstance,
    priceFeed,
    vTRY,
    SBT,
    FeeManager,
    Xeq,
    OCLRouter,
  });

  console.log("Before deployMarketplace");
  const { Marketplace, TrustedForwarder } = await deployMarketplace({ finder });
  console.log("Before deployRentDistributor");
  const rentDistributor = await deployRentDistributor({
    finder,
    RShareInstance,
    vTRY,
    JUSDC,
    burnerRole,
  });

  console.log("Deploying XEQ platform tokens");

  // deploying market place borrower
  const marketplaceBorrower = await deployMarketplaceBorrower(
    buybackVaultJTRY.address
  );
  txToWait = await marketplaceBorrower
    .connect(admin)
    .setCustomVault(customVaultjTry.address);
  await txToWait.wait();
  // Setting up the configs for staking pool and marketplace against marktplace borrower
  txToWait = await buybackVaultJTRY
    .connect(admin)
    .setAllowedMarketPlaceBorrower(marketplaceBorrower.address);
  await txToWait.wait();

  console.log("Marketplace Borrower set in staking pool");

  // await ercStakingPool.setAddressToCTokenPercentage(cJTRY.address, 5000); // 50%

  txToWait = await marketplaceBorrower
    .connect(admin)
    .setAllowedMarketPlace(Marketplace.address);
  await txToWait.wait();

  console.log("Marketplace set in marketplace Borrower");

  txToWait = await Marketplace.connect(accounts[2]).setMarketplaceBorrower(
    marketplaceBorrower.address
  );
  await txToWait.wait();
  /* -------------------------------------------------------------------------- */
  /*                                     END                                    */
  /* -------------------------------------------------------------------------- */

  /* ------------------------------ ADDING CLAIMS ----------------------------- */
  console.log("Before addUserClaim1");
  const { userIdentity: user1Identity } = await addUserClaim({
    claimIssuerContract,
    user: user1,
    signer,
  });
  console.log("Before addUserClaim2");

  const { userIdentity: user2Identity } = await addUserClaim({
    claimIssuerContract,
    user: user2,
    signer,
  });
  console.log("Before addingMarketplaceClaim");

  const { MarketPlaceIdentity } = await addingMarketplaceClaim({
    Marketplace,
    claimIssuerContract,
    signer,
  });

  /* ---------------------------- Creating ERC3643 ---------------------------- */
  console.log("Before createERC3643LegalToken");

  await createERC3643LegalToken({
    claimIssuerContract,
    factory,
    tokenSalt: "XEFR1",
    tokenName: "XEFR1",
    tokenSymbol: "XEFR1",
  });
  console.log("Registering Identiy");
  console.log("user1Identity.address", user1Identity.address);

  console.log("Before registerIdentity1");

  const { LegalToken } = await registerIdentity({
    factory,
    user: user1.address,
    userIdentity: user1Identity.address,
    tokenSymbol: "XEFR1",
  });
  console.log("Before registerIdentity2");

  await registerIdentity({
    factory,
    user: user2.address,
    userIdentity: user2Identity.address,
    tokenSymbol: "XEFR1",
  });
  console.log("Before registerIdentity3");

  await registerIdentity({
    factory,
    user: Marketplace.address,
    userIdentity: MarketPlaceIdentity,
    tokenSymbol: "XEFR1",
  });
  console.log("Setting Currency To Fee1");

  await setCurrencyToFeed({
    priceFeed,
    currency: jTry,
    mockAggregator: mock1,
    pairname: "TRYUSD",
  });

  await setCurrencyToFeed({
    priceFeed,
    currency: TryB,
    mockAggregator: mock1,
    pairname: "TRYBUSD",
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

  await setCurrencyToFeed({
    priceFeed,
    currency: XAU,
    mockAggregator: mockGold,
    pairname: "XAUUSD",
  });
  // console.log("Before MockTokensConfig");
  // console.log(
  //   await priceFeed.feedPriceChainlink(
  //     await priceFeed.getCurrencyToFeed(XAU.address)
  //   ),
  //   "GOLD currnet price"
  // );

  // console.log("Testing OCL swap router");
  // await jTry.addMinter(admin.address);
  // await jTry.mint(OCLRouter.address, ethers.utils.parseUnits("1221212121", 18));
  // await JUSDC.addMinter(admin.address);
  // await JUSDC.mint(
  //   user2.address,
  //   ethers.utils.parseUnits("99999999999999999999999", 6)
  // );
  // ethers.utils.parseUnits("615", 18);
  // await JUSDC.approve(
  //   OCLRouter.address,
  //   ethers.utils.parseUnits("1000000", 18)
  // );
  // await OCLRouter.swapTokensForExactOut(
  //   JUSDC.address,
  //   jTry.address,
  //   ethers.utils.parseUnits("615", 18)
  // );
  // console.log("Testing OCL swap router done");

  // console.log("OCLR function tested");
  await MockTokensConfig({ JUSDC, JEuro, jTry });
  console.log("Before marketplaceConfig");

  await marketplaceConfig({
    RShareInstance,
    Maintainer,
    Marketplace,
    finder,
    MarketplaceInterface,
    SBT,
  });
  console.log("Before addPropertyToMarketplace");

  await addPropertyToMarketplace({
    LegalToken,
    Marketplace,
    RShareInstance,
    Maintainer,
    jTry,
    mock1,
  });

  let value = ethers.utils.parseUnits("100000000000", 18);
  // let miniting = await jTry.mint(accounts[0].address, value);
  // await miniting.wait();

  const WrappedLegal = await Marketplace.LegalToWLegal(LegalToken.address);
  console.log("function call!");

  // await OCLRouter.getOutputAmount(
  //   JUSDC.address,
  //   jTry.address,
  //   ethers.utils.parseUnits("10.664182", 6)
  // );

  // //////////////////////////// trying a BUY property swap/////////////////////////////////////////////////////////
  const WL = await ethers.getContractAt("jEuro", WrappedLegal);
  // console.log(await WL.balanceOf(accounts[0].address), "admin 999999999999999999999999999999999999999999999 before balance ------");
  // console.log(await WL.balanceOf(accounts[1].address), "admin 999999999999999999999999999999999999999999999 before balance ------");
  // console.log(await WL.balanceOf(accounts[2].address), "admin 999999999999999999999999999999999999999999999 before balance ------");
  // console.log(await WL.balanceOf(accounts[3].address), "admin 999999999999999999999999999999999999999999999 before balance ------");
  // console.log(await WL.balanceOf(accounts[4].address), "admin 999999999999999999999999999999999999999999999 before balance ------");

  // console.log(await WL.balanceOf(accounts[4].address), "before balance ------");
  // console.log(
  //   await jTry.balanceOf(accounts[4].address),
  //   "jTry before balance ------"
  // );

  // await jTry.mint(user2.address, ethers.utils.parseUnits("10000000000", 18));
  // await jTry
  //   .connect(user2)
  //   .approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("20000000000000000000", 18)
  //   );

  ///// TEST SWAP IN OCL ///////////////////////////////////////////////////////
  // await jTry.mint(
  //   OCLRouter.address,
  //   ethers.utils.parseUnits("1000000000000000000000000000000000000000000")
  // );
  // await jTry.transfer(
  //   OCLRouter.address,
  //   ethers.utils.parseUnits("1000000000000000000000000000000000000000000")
  // );
  // await JEuro.addMinter(admin.address);
  // await JEuro.mint(
  //   admin.address,
  //   ethers.utils.parseUnits("1000000000000000000000000000000")
  // );
  // await JEuro.approve(
  //   OCLRouter.address,
  //   ethers.utils.parseUnits("10000000000000000000000000000000")
  // );

  // first, staking some tokens in Staking pool
  // await jTry.approve(
  //   ercStakingPool.address,
  //   ethers.utils.parseUnits("2000000000000000000000000", 18)
  // );
  // await jTry.mint(
  //   admin.address,
  //   ethers.utils.parseUnits("6000000000000000", 18)
  // );
  // console.log("Before the stake");
  console.log(
    await cJTRY.balanceOf(ercStakingPool.address),
    "This is pools cJTRY balance"
  );
  console.log("after 1st stake");

  txToWait = await SwapController.connect(admin).setXToken(xJTRY.address);
  await txToWait.wait();
  txToWait = await SwapController.connect(admin).setCustomVaultJtry(
    customVaultjTry.address
  );
  await txToWait.wait();

  txToWait = await SwapController.connect(admin).setJTRY(jTry.address);
  await txToWait.wait();

  const depositManager = await ercStakingPool.depositManager();
  const depositManagerUSDC = await mainVaultUSDC.depositManager();
  txToWait = await vaultRouterJtry
    .connect(admin)
    .updateDepositManager(depositManager);
  await txToWait.wait();

  txToWait = await vaultRouterUSDC
    .connect(admin)
    .updateDepositManager(depositManagerUSDC);
  await txToWait.wait();

  console.log(depositManager, "this is deposit manager");
  console.log(depositManagerUSDC, "depositManagerUSDC this is deposit manager");
  txToWait = await customVaultjTry
    .connect(admin)
    .setDepositManager(depositManager);
  await txToWait.wait();

  txToWait = await customVaultUSDC
    .connect(admin)
    .setDepositManager(depositManagerUSDC);
  await txToWait.wait();

  txToWait = await SwapController.connect(admin).setFeeReceiver(
    accounts[3].address
  );
  await txToWait.wait();

  txToWait = await SwapController.connect(admin).setVaultRouter(
    vaultRouterUSDC.address
  );
  await txToWait.wait();

  txToWait = await cUSDC.connect(admin).addMinter(mainVaultUSDC.address);
  await txToWait.wait();

  txToWait = await cJTRY.connect(admin).addMinter(ercStakingPool.address);
  await txToWait.wait();

  txToWait = await xJTRY.connect(admin).addMinter(customVaultjTry.address);
  await txToWait.wait();

  txToWait = await xUSDC.connect(admin).addMinter(customVaultUSDC.address);
  await txToWait.wait();

  txToWait = await xJTRY.connect(admin).addBurner(customVaultjTry.address);
  await txToWait.wait();

  txToWait = await xUSDC.connect(admin).addBurner(customVaultUSDC.address);
  await txToWait.wait();

  // txToWait = await jTry.addMinter(admin.address);
  // await txToWait.wait();

  // txToWait = await vTRY.addMinter(admin.address);
  // await txToWait.wait();

  // txToWait = await XAU.addMinter(admin.address);
  // await txToWait.wait();

  // txToWait = await TryB.addMinter(admin.address);
  // await txToWait.wait();

  // txToWait = await JUSDC.mint(admin.address, ethers.utils.parseUnits("500000", 6));
  // await txToWait.wait();
  // txToWait = await jTry.mint(admin.address, ethers.utils.parseUnits("500000", 18));
  // await txToWait.wait();
  // txToWait = await vTRY.mint(admin.address, ethers.utils.parseUnits("500000", 18));
  // await txToWait.wait();
  // txToWait = await JUSDC.mint(admin.address, ethers.utils.parseUnits("500000", 6));
  // await txToWait.wait();
  // txToWait = await JUSDC.mint(admin.address, ethers.utils.parseUnits("500000", 6));
  // await txToWait.wait();

  // first staking JTRY throgh router

  // console.log(
  //   "Staking JTRY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // await jTry.addMinter(admin.address);
  // await jTry.mint(
  //   admin.address,
  //   ethers.utils.parseUnits("10000000000000000000", 18)
  // );
  // await jTry.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("10000000000000000000", 18)
  // );
  // const dmInstance = await ethers.getContractAt(
  //   "DepositManager",
  //   depositManager
  // );
  // console.log(
  //   await xJTRY.balanceOf(await dmInstance.RESERVE_POOL()),
  //   "DM xJTRY balance before"
  // );
  // await vaultRouterJtry.stake(
  //   ethers.utils.parseUnits("10000000000000000000", 18),
  //   ethers.constants.AddressZero,
  //   ethers.constants.AddressZero,
  //   false, //depositsTokenToGauge
  //   true, //skipPassOnPoolTransfer
  //   false // depositToPassOnPoolGauge
  // );
  // console.log(
  //   await xJTRY.balanceOf(await dmInstance.RESERVE_POOL()),
  //   "DM xJTRY balance after"
  // );

  // console.log(
  //   await xJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BB xJTRY balance after"
  // );

  // console.log(
  //   await ercStakingPool.balanceOf(admin.address),
  //   "admin s token balannce"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(admin.address),
  //   "BBV balance of user"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BBV balance of BBVault"
  // );

  // console.log(
  //   "ENDDDDDDDDDDDDD Staking JTRY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(
  //   "UNSTAKE JTRY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(await ercStakingPool.balanceOf(admin.address), "Admin sJTRY balance");
  // console.log(await ercStakingPool.balanceOf(stakingPoolGauge), "gauge sJTRY balance");

  // await ercStakingPool.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("10000000000000000000", 18)
  // );
  // await vaultRouterJtry.withdraw(
  //   ethers.utils.parseUnits("10000000000000000000", 18)
  // );

  // console.log(
  //   "END UNSTAKE JTRY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // // // first staking usdc throgh router

  // console.log(
  //   "Staking USDC XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // await JUSDC.addMinter(admin.address);
  // await JUSDC.mint(admin.address, ethers.utils.parseUnits("10000050000", 6));
  // await JUSDC.approve(
  //   vaultRouterUSDC.address,
  //   ethers.utils.parseUnits("100000", 6)
  // );
  // await vaultRouterUSDC.stake(
  //   ethers.utils.parseUnits("100000", 6),
  //   ethers.constants.AddressZero,
  //   ethers.constants.AddressZero,
  //   false,
  //   false,
  //   false
  // );

  // console.log(
  //   await mainVaultUSDC.balanceOf(admin.address),
  //   "admin s token balannce"
  // );

  // console.log(
  //   await buybackVaultUSDC.balanceOf(admin.address),
  //   "BBV balance of user"
  // );

  // console.log(
  //   await buybackVaultUSDC.balanceOf(buybackVaultUSDC.address),
  //   "BBV balance of BBVault"
  // );

  // console.log(
  //   "ENDDDDDDDDDDDDD Staking USDC XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(
  //   "TESING RENT DISTRIBUTOR XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );
  // await JUSDC.transfer(
  //   rentDistributor.address,
  //   ethers.utils.parseUnits("10000", 6)
  // );

  // await vTRY.addMinter(admin.address);
  // await vTRY.mint(admin.address, ethers.utils.parseUnits("10000", 18));

  // await vTRY.approve(
  //   rentDistributor.address,
  //   ethers.utils.parseUnits("10000", 18)
  // );
  // // now redeeming in rent distributor
  // await rentDistributor.redeem(
  //   ethers.utils.parseUnits("10000", 18),
  //   jTry.address,
  //   accounts[5].address,
  //   [customVaultjTry.address, vaultRouterUSDC.address]
  // );

  // console.log(
  //   await jTry.balanceOf(accounts[5].address),
  //   "Account 5 usdc balance"
  // );

  // console.log(
  //   "TESING RENT DISTRIBUTOR END XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(
  //   " Un-Staking USDC XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // await mainVaultUSDC.approve(
  //   vaultRouterUSDC.address,
  //   ethers.utils.parseUnits("100000", 6)
  // );
  // console.log(
  //   await JUSDC.balanceOf(admin.address),
  //   "before balance usdc unstake"
  // );

  // await vaultRouterUSDC.withdraw(ethers.utils.parseUnits("60000", 6));

  // console.log(
  //   await JUSDC.balanceOf(admin.address),
  //   "after balance usdc unstake"
  // );

  // console.log(
  //   " ENDDDDDDDDDDD Un-Staking USDC XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );
  // await JUSDC.mint(admin.address, ethers.utils.parseUnits("700000000000", 6));
  // await jTry.mint(admin.address, ethers.utils.parseUnits("700000000000", 18));

  // await JUSDC.approve(
  //   vaultRouterUSDC.address,
  //   ethers.utils.parseUnits("700000000000", 18)
  // );

  // await jTry.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("700000000000", 18)
  // );
  // console.log("stake--------------------------------------------");
  // console.log(await vaultRouterUSDC.gauge(), "This is gague my frns");
  // // stake in usdc vault
  // await vaultRouterUSDC.stake(
  //   ethers.utils.parseUnits("10000000", 6),
  //   ethers.constants.AddressZero,
  //   true,
  //   { gasLimit: 210000000 }
  // );
  // console.log("after 1st stake");

  // console.log(gaugeUSDC, "gauge addresssss----------------------------");
  // const gaugeU = await ethers.getContractAt("Gauge", gaugeUSDC);
  // console.log(
  //   await mainVaultUSDC.balanceOf(admin.address),
  //   "Balance before withdraw"
  // );
  // await gaugeU.withdrawAll();

  // console.log(
  //   await mainVaultUSDC.balanceOf(admin.address),
  //   "Balance after withdraw"
  // );

  // await mainVaultUSDC.approve(
  //   vaultRouterUSDC.address,
  //   ethers.utils.parseUnits("10000000", 6)
  // );

  // console.log(
  //   await JUSDC.balanceOf(admin.address),
  //   "USDC balance before unstake"
  // );

  // await vaultRouterUSDC.withdraw(ethers.utils.parseUnits("10000000", 6));

  // console.log(
  //   await JUSDC.balanceOf(admin.address),
  //   "USDC balance aftr unstake"
  // );

  // // stake in jtry vault router
  // await vaultRouterJtry.stake(
  //   ethers.utils.parseUnits("500", 18),
  //   ethers.constants.AddressZero,
  //   false
  // );

  // console.log(
  //   await cJTRY.balanceOf(SwapController.address),
  //   "cJTRY balance of controlerr"
  // );

  // console.log(
  //   await cUSDC.balanceOf(SwapController.address),
  //   "cUSDC balance of controlerr"
  // );

  // // now swapping using the oclr USDC to JTRY

  // await JUSDC.approve(
  //   OCLRouter.address,
  //   ethers.utils.parseUnits("99999999999999999999999999", 18)
  // );
  // console.log(
  //   await jTry.balanceOf(customVaultjTry.address),
  //   "This is xtyrysdasdhgsdgasdasd"
  // );

  // console.log(
  //   await jTry.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap jtry before swap"
  // );
  // await OCLRouter.swapTokensForExactOut(
  //   JUSDC.address, //0xdD34D1F9bf3AB9E05537D81dCF0Bb93B49C132F7
  //   jTry.address, //0xEC01655267Bc72C385F0D2059B60d88B357a949A
  //   ethers.utils.parseUnits("200", 18),
  //   accounts[7].address,
  //   [cJTRY.address, customVaultjTry.address, vaultRouterUSDC.address] // [0x27846471A47e78Be44C10BdB169A70EfB1a72f2A,0x5d436f5104f25c54EA285207ce23B35b287811e7,0x8C1F362911aA529892d1DFed0CCeBDe305A77Eca]
  // );

  // console.log(
  //   await jTry.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap jtry"
  // );

  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxUSDC to JTRY swap done"
  // );

  // // now swapping from JTRY to USDC

  // await jTry.approve(
  //   OCLRouter.address,
  //   ethers.utils.parseUnits("99999999999999999999999999", 18)
  // );

  // console.log(
  //   await JUSDC.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap jusdc before swap"
  // );
  // await OCLRouter.swapTokensForExactOut(
  //   jTry.address,
  //   JUSDC.address,
  //   ethers.utils.parseUnits("200", 6),
  //   accounts[7].address,
  //   [cUSDC.address, customVaultUSDC.address, vaultRouterJtry.address]
  // );

  // console.log(
  //   await JUSDC.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap JUSDC"
  // );

  // console.log(
  //   await JUSDC.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap jusdc"
  // );

  // console.log(
  //   await xJTRY.balanceOf(accounts[7].address),
  //   "balance of acccount 7 affter swap xJtry"
  // );

  // await ercStakingPool.stake(
  //   ethers.utils.parseUnits("100000000000000", 18),
  //   ethers.constants.AddressZero
  // );
  // console.log("After the stake");
  // console.log(
  //   await cJTRY.balanceOf(ercStakingPool.address),
  //   "This is pools cJTRY balance"
  // );

  // await OCLRouter.swapTokensForExactOut(vTRY.address, jTry.address, ethers.utils.parseUnits("1000000"));
  // console.log("Swap done");
  // console.log(await WL.balanceOf(admin.address), "beofre balacnce");
  // / Buy property test using OCL
  // await OCLRouter.buyProperty(
  //   JEuro.address,
  //   jTry.address,
  //   WrappedLegal,
  //   Marketplace.address,
  //   10
  // );
  // // console.log(await WL.balanceOf(admin.address), "after balacnce");

  // // console.log(await jTry.balanceOf(OCLRouter.address), "before balacnce");

  // await WL.approve(OCLRouter.address, 10);
  // /// Buy property test using OCL
  // await OCLRouter.sellProperty(
  //   jTry.address,
  //   vTRY.address,
  //   WrappedLegal,
  //   Marketplace.address,
  //   10,
  //   { gasLimit: 2100000000000 }
  // );

  // await OCLRouter.buyProperty(
  //   JEuro.address,
  //   jTry.address,
  //   WrappedLegal,
  //   Marketplace.address,
  //   10
  // );
  // console.log(await jTry.balanceOf(OCLRouter.address), "after balacnce");
  // console.log(await WL.balanceOf(admin.address), "after sell balacnce");

  console.log(
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxBUY PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  );
  // const propertyObj = await priceFeed.getPropertyDetail("WXEFR1");
  // console.log(
  //   "Balance of fee reciever before buy",
  //   await jTry.balanceOf(accounts[4].address)
  // );
  // console.log(propertyObj[2],"property obj array");

  // // increasing property to check loss
  // await priceFeed.setPropertyDetails("WXEFR1", [
  //   ethers.utils.parseUnits("1000", 18),
  //   vTRY.address,
  //   propertyObj[2],
  // ]);
  // await priceFeed.setPropertyDetails("WXEFR1",)
  // await Xeq.connect(user2).approve(
  //   Marketplace.address,
  //   ethers.utils.parseUnits("9999999999", 18)
  // );

  // await vTRY.mint(
  //   user2.address,
  //   ethers.utils.parseUnits("999999999999999999999999999", 18)
  // );
  // console.log(
  //   await vTRY.balanceOf(ercStakingPool.address),
  //   "Pool before balance of vTRY"
  // );
  // await vTRY
  //   .connect(user2)
  //   .approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("999999999999999999999999999", 18)
  //   );
  // await jTry.addMinter(admin.address);
  // await jTry.mint(
  //   user2.address,
  //   ethers.utils.parseUnits("999999999999999999999999999", 18)
  // );
  // await jTry
  //   .connect(user2)
  //   .approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("9999999999999999999999999", 6)
  //   );
  // await Marketplace.connect(user2).swap(
  //   [jTry.address, WrappedLegal, 500, user2.address],
  //   false,
  //   { gasLimit: 210000000000 }
  // );
  // // console.log(
  // //   await vTRY.balanceOf(ercStakingPool.address),
  // //   "Pool after balance of vTRY"
  // // );
  // console.log(
  //   "Balance of fee reciever after buy",
  //   await jTry.balanceOf(user2.address)
  // );

  // console.log(await WL.balanceOf(user2.address), "SP legalTokenBalance");
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxBUY PROPERTY DONE xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxSELL PROPERTY using OCLR xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // await WL.connect(user2).approve(OCLRouter.address, 12456);
  // console.log(await WL.balanceOf(user2.address), "UUser balance before");
  // await OCLRouter.connect(user2).sellProperty(
  //   jTry.address,
  //   JUSDC.address,
  //   WL.address,
  //   Marketplace.address,
  //   10,
  //   user2.address,
  //   [customVaultUSDC.address, vaultRouterJtry.address]
  // );
  // console.log(await WL.balanceOf(user2.address), "UUser balance after");

  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxSELL PROPERTY END using OCLR xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // console.log(
  //   "Staking after buy 1 JTRYUSDC XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "Self balance before"
  // );

  // await jTry.addMinter(admin.address);
  // await jTry.mint(admin.address, ethers.utils.parseUnits("500", 18));
  // await jTry.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("500", 18)
  // );
  // await vaultRouterJtry.stake(
  //   ethers.utils.parseUnits("500", 18),
  //   ethers.constants.AddressZero,
  //   ethers.constants.AddressZero,
  //   true,
  //   false,
  //   true
  // );
  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "Self balance after"
  // );

  // console.log(
  //   await ercStakingPool.balanceOf(admin.address),
  //   "admin s token balannce"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(admin.address),
  //   "BBV balance of user"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BBV balance of BBVault"
  // );

  // console.log(
  //   "ENDDDDDDDDDDDDD Staking after buy 1  JTRY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the buy 1"
  // );
  // // console.log(await WL.balanceOf(accounts[4].address), "after balance ------");
  // // console.log(
  // //   await jTry.balanceOf(ercStakingPool.address),
  // //   "jTry after balance ------"
  // // );

  // console.log(await WL.balanceOf(Marketplace.address), "MP legalTokenBalance");

  // // console.log(await priceFeed.getPropertyDetail("WXEFR1"), "This is propertry detail");

  // // console.log(await priceFeed.getPropertyDetail("WXEFR1"), "This is propertry detail");

  // // //////////////////////////// trying a SELL property swap/////////////////////////////////////////////////////////

  // // console.log(
  // //   await jTry.balanceOf(user2.address),
  // //   "jtry user2 before balance ------"
  // // );
  // await jTry.addMinter(admin.address);
  // await jTry.mint(admin.address, ethers.utils.parseUnits("99999999999999", 18));
  // await jTry.transfer(
  //   OCLRouter.address,
  //   ethers.utils.parseUnits("99999999999999", 18)
  // );

  // console.log(
  //   "Now staking in Jtry pool through routerxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // await jTry.addMinter(admin.address);
  // await jTry.mint(admin.address, ethers.utils.parseUnits("1000000000000", 18));
  // await jTry.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("1000000000000", 18)
  // );

  // await vaultRouterJtry.stake(
  //   ethers.utils.parseUnits("1000000000000", 18),
  //   ethers.constants.AddressZero,
  //   ethers.constants.AddressZero,
  //   true
  // );

  // console.log(
  //   await xJTRY.balanceOf(buybackVaultJTRY.address),
  //   "buyback pool balance of xJtry"
  // );
  // console.log(
  //   "Staking done in JTRY poolxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 1st SELL PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // await WL.connect(user2).approve(
  //   Marketplace.address,
  //   ethers.utils.parseUnits("200000000000000", 18)
  // );
  // // await Marketplace.connect(user2).swap(
  // //   [WrappedLegal, jTry.address, 2, user2.address],
  // //   false,
  // //   {gasLimit: 2100000}
  // // );
  // await jTry
  //   .connect(user2)
  //   .transfer(
  //     accounts[9].address,
  //     ethers.utils.parseUnits("100000000000000000000000", 18)
  //   );
  // console.log(
  //   "User 2 before balance jTRY",
  //   await jTry.balanceOf(user2.address)
  // );
  // console.log(
  //   await xJTRY.balanceOf(buybackVaultJTRY.address),
  //   "before balance of xtry in bbtry vault"
  // );
  // console.log(
  //   await xJTRY.balanceOf(customVaultjTry.address),
  //   "Custom XJTRY balance before"
  // );
  // console.log(
  //   await jTry.balanceOf(customVaultjTry.address),
  //   "Custom jtry balance before"
  // );
  // await Marketplace.connect(user2).swap(
  //   [WrappedLegal, jTry.address, 10, user2.address],
  //   false,
  //   { gasLimit: 8000000000000 }
  // );
  // console.log(
  //   await xJTRY.balanceOf(customVaultjTry.address),
  //   "Custom XJTRY balance before"
  // );
  // console.log(
  //   await jTry.balanceOf(customVaultjTry.address),
  //   "Custom jtry balance after"
  // );

  // console.log(
  //   await xJTRY.balanceOf(buybackVaultJTRY.address),
  //   "after balance of xtry in bbtry vault"
  // );

  // console.log("User 2 after balance jTRY", await jTry.balanceOf(user2.address));
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 0),
  //   "this is propetry postiosns 0"
  // );
  // console.log(
  //   await WL.balanceOf(buybackVaultJTRY.address),
  //   "ercStakingPool.address 999999999999999999999999999999999999999999999 before balance ------"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 1st SELL PROPERTY END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // console.log(
  //   "Staking after sell 1 JTRYUSDC XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "Self balance before"
  // );

  // await jTry.addMinter(admin.address);
  // await jTry.mint(admin.address, ethers.utils.parseUnits("500", 18));
  // await jTry.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("500", 18)
  // );
  // await vaultRouterJtry.stake(
  //   ethers.utils.parseUnits("500", 18),
  //   ethers.constants.AddressZero,
  //   ethers.constants.AddressZero,
  //   true,
  //   false,
  //   true
  // );
  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "Self balance after"
  // );

  // console.log(
  //   await ercStakingPool.balanceOf(admin.address),
  //   "admin s token balannce"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(admin.address),
  //   "BBV balance of user"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BBV balance of BBVault"
  // );

  // console.log(
  //   "ENDDDDDDDDDDDDD Staking after sell 1  JTRY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );
  // console.log(12 / 0);

  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the sell 1"
  // );

  // console.log(
  //   await jTry.balanceOf(user2.address),
  //   "Balance of user2 after the sell 1"
  // );
  // // console.log(
  // //   await jTry.balanceOf(user2.address),
  // //   "jtry user2 after balance ------"
  // // );

  // // console.log(
  // //   await WL.balanceOf(Marketplace.address),
  // //   "Marketplace.address.address 999999999999999999999999999999999999999999999 before balance ------"
  // // );

  // // ////// 2nd buy

  // const propertyObj = await priceFeed.getPropertyDetail("WXEFR1");
  // // console.log(propertyObj[2],"property obj array");

  // // increasing property to check loss
  // await priceFeed.setPropertyDetails("WXEFR1", [
  //   ethers.utils.parseUnits("3", 18),
  //   jTry.address,
  //   propertyObj[2],
  // ]);

  // // console.log(await WL.balanceOf(user2.address), "bf balance ------");
  // // console.log(await jTry.balanceOf(user2.address), "jTry bf balance ------");
  // // console.log(
  // //   await WL.balanceOf(ercStakingPool.address),
  // //   "ercStakingPool.address before balance ------"
  // // );

  // await jTry.mint(user2.address, ethers.utils.parseUnits("60000000000000", 18));
  // await jTry
  //   .connect(user2)
  //   .approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("20000000000000000000", 18)
  //   );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 2nd BUY PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance before"
  // );
  // console.log(
  //   await jTry.balanceOf(ercStakingPool.address),
  //   "Pool before balance of vTRY"
  // );
  // console.log(user2.address, "User 2 address");

  // await XAU.addMinter(admin.address);
  // await XAU.mint(user2.address, ethers.utils.parseUnits("10000", 18));
  // await XAU.connect(user2).approve(
  //   Marketplace.address,
  //   ethers.utils.parseUnits("10000", 18)
  // );

  // console.log(
  //   await WL.balanceOf(buybackVaultJTRY.address),
  //   "BB PROPERTY BALANXE BEFOFRE"
  // );
  // console.log(
  //   await WL.balanceOf(Marketplace.address),
  //   "MP PROPERTY BALANXE BEFOFRE"
  // );
  // await Marketplace.connect(user2).swap(
  //   [XAU.address, WrappedLegal, 20, user2.address],
  //   false,
  //   { gasLimit: 8000000 }
  // );
  // console.log(
  //   await WL.balanceOf(buybackVaultJTRY.address),
  //   "BB PROPERTY BALANXE AFTER"
  // );
  // console.log(
  //   await WL.balanceOf(Marketplace.address),
  //   "MP PROPERTY BALANXE AFTER"
  // );

  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 0),
  //   "this is propetry postiosns 0"
  // );
  // console.log(await WL.balanceOf(user2.address), "User 2 WL balance");
  // console.log(
  //   await WL.balanceOf(buybackVaultJTRY.address),
  //   "User 2 SP balance after"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 2nd BUY PROPERTY  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );

  // console.log(
  //   "Staking JTRYUSDC XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "Self balance before"
  // );

  // await jTry.addMinter(admin.address);
  // await jTry.mint(admin.address, ethers.utils.parseUnits("500", 18));
  // await jTry.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("500", 18)
  // );
  // await vaultRouterJtry.stake(
  //   ethers.utils.parseUnits("500", 18),
  //   ethers.constants.AddressZero,
  //   ethers.constants.AddressZero,
  //   true,
  //   false,
  //   true
  // );
  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "Self balance after"
  // );

  // console.log(
  //   await ercStakingPool.balanceOf(admin.address),
  //   "admin s token balannce"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(admin.address),
  //   "BBV balance of user"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BBV balance of BBVault"
  // );

  // console.log(
  //   "ENDDDDDDDDDDDDD Staking JTRY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(
  //   "ANOTHER BUY xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // await jTry.addMinter(admin.address);
  // await jTry.mint(
  //   user2.address,
  //   ethers.utils.parseUnits("999999999999999999999999999", 18)
  // );
  // await jTry
  //   .connect(user2)
  //   .approve(
  //     Marketplace.address,
  //     ethers.utils.parseUnits("9999999999999999999999999", 6)
  //   );
  // console.log(
  //   await WL.balanceOf(buybackVaultJTRY.address),
  //   "BB PROPERTY BALANXE Before"
  // );
  // console.log(
  //   await WL.balanceOf(Marketplace.address),
  //   "MP PROPERTY BALANXE Before"
  // );

  // await Marketplace.connect(user2).swap(
  //   [jTry.address, WrappedLegal, 5, user2.address],
  //   false,
  //   { gasLimit: 210000000000 }
  // );
  // console.log(
  //   await WL.balanceOf(buybackVaultJTRY.address),
  //   "BB PROPERTY BALANXE AFTER"
  // );
  // console.log(
  //   await WL.balanceOf(Marketplace.address),
  //   "MP PROPERTY BALANXE AFTER"
  // );
  // // console.log(
  // //   await vTRY.balanceOf(ercStakingPool.address),
  // //   "Pool after balance of vTRY"
  // // );
  // console.log(
  //   "Balance of fee reciever after buy",
  //   await jTry.balanceOf(user2.address)
  // );

  // console.log(await WL.balanceOf(user2.address), "SP legalTokenBalance");
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxBUY PROPERTY DONE xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // console.log(
  //   "WITHDRAWING Xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // console.log(
  //   await ercStakingPool.balanceOf(admin.address),
  //   "admin s before balannce"
  // );
  // await ercStakingPool.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("1000", 18)
  // );
  // await vaultRouterJtry.withdraw(ethers.utils.parseUnits("1000", 18));
  // console.log(
  //   await ercStakingPool.balanceOf(admin.address),
  //   "admin s after balannce"
  // );
  // console.log(
  //   "WITHDRAWING END Xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );

  // console.log(
  //   "Staking JTRYUSDC XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "Self balance before"
  // );

  // await jTry.addMinter(admin.address);
  // await jTry.mint(admin.address, ethers.utils.parseUnits("1000", 18));
  // await jTry.approve(
  //   vaultRouterJtry.address,
  //   ethers.utils.parseUnits("500", 18)
  // );
  // await vaultRouterJtry.stake(
  //   ethers.utils.parseUnits("500", 18),
  //   ethers.constants.AddressZero,
  //   ethers.constants.AddressZero,
  //   true,
  //   false,
  //   true
  // );
  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "Self balance after"
  // );

  // console.log(
  //   await ercStakingPool.balanceOf(admin.address),
  //   "admin s token balannce"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(admin.address),
  //   "BBV balance of user"
  // );

  // console.log(
  //   await buybackVaultJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BBV balance of BBVault"
  // );

  // console.log(
  //   "ENDDDDDDDDDDDDD Staking JTRY XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  // );

  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the buy 2"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 2nd SELL PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // console.log(
  //   await jTry.balanceOf(ercStakingPool.address),
  //   "Pool before 2nd sell jTRY"
  // );
  // console.log(await WL.balanceOf(user2.address), "user 2 WL balance");
  // await WL.connect(user2).approve(Marketplace.address, 2000);
  // console.log(
  //   await jTry.balanceOf(customVaultjTry.address),
  //   "BB jjtry before sell"
  // );
  // console.log(
  //   await xJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BB XJTRY before sell"
  // );

  // console.log(jTry.address, "jTry.address");
  // console.log(buybackVaultJTRY.address, "buybackVaultJTRY.address");

  // await Marketplace.connect(user2).swap(
  //   [WrappedLegal, jTry.address, 10, user2.address],
  //   false
  // );

  // console.log(
  //   await jTry.balanceOf(customVaultjTry.address),
  //   "BB jjtry afteer sell"
  // );
  // console.log(
  //   await xJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BB XJTRY after sell"
  // );

  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 1),
  //   "this is propetry postiosns 0"
  // );
  // console.log(
  //   await jTry.balanceOf(ercStakingPool.address),
  //   "Pool after 2nd sell jTRY"
  // );
  // console.log(
  //   await vTRY.balanceOf(ercStakingPool.address),
  //   "Pool after 2nd sell vTRY"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 2nd SELL PROPERTY  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the sell 2"
  // );
  // console.log(
  //   await jTry.balanceOf(user2.address),
  //   "Balance of user2 after the sell 2"
  // );

  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 3rd BUY PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // increasing property to check loss
  // await priceFeed.setPropertyDetails("WXEFR1", [
  //   ethers.utils.parseUnits("2", 18),
  //   jTry.address,
  //   propertyObj[2],
  // ]);
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance before"
  // );
  // console.log(user2.address, "User 2 address");
  // console.log(
  //   await jTry.balanceOf(customVaultjTry.address),
  //   "BB jjtry before sell"
  // );
  // console.log(
  //   await xJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BB XJTRY before sell"
  // );
  // await Marketplace.connect(user2).swap(
  //   [jTry.address, WrappedLegal, 10, user2.address],
  //   false,
  //   { gasLimit: 2100000 }
  // );

  // console.log(
  //   await jTry.balanceOf(customVaultjTry.address),
  //   "BB jjtry afteer sell"
  // );
  // console.log(
  //   await xJTRY.balanceOf(buybackVaultJTRY.address),
  //   "BB XJTRY after sell"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 1),
  //   "this is propetry postiosns 0"
  // );
  // console.log(await WL.balanceOf(user2.address), "User 2 WL balance");
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance after"
  // );
  console.log(
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 3rd BUY PROPERTY  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  );

  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 3rd SELL PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // console.log(await WL.balanceOf(user2.address), "user 2 WL balance");
  // await WL.connect(user2).approve(Marketplace.address, 2000);
  // await Marketplace.connect(user2).swap(
  //   [WrappedLegal, jTry.address, 2000],
  //   false
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 2),
  //   "this is propetry postiosns 0"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 3rd SELL PROPERTY  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the sell 3"
  // );
  // console.log(
  //   await jTry.balanceOf(user2.address),
  //   "Balance of user2 after the sell 3"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx BUY PROPERTY in LOSS xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // // increasing property to check loss
  // await priceFeed.setPropertyDetails("WXEFR1", [
  //   ethers.utils.parseUnits("1.5", 18),
  //   jTry.address,
  //   propertyObj[2],
  // ]);
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance before"
  // );
  // console.log(user2.address, "User 2 address");
  // await Marketplace.connect(user2).swap(
  //   [jTry.address, WrappedLegal, 1000],
  //   false
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 2),
  //   "this is propetry postiosns 0"
  // );
  // console.log(await WL.balanceOf(user2.address), "User 2 WL balance");
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance after"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx BUY PROPERTY in LOSS  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the buy 3"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx BUY PROPERTY in PROFIT xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // // increasing property to check loss
  // await priceFeed.setPropertyDetails("WXEFR1", [
  //   ethers.utils.parseUnits("3", 18),
  //   jTry.address,
  //   propertyObj[2],
  // ]);
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance before"
  // );
  // console.log(user2.address, "User 2 address");
  // await Marketplace.connect(user2).swap(
  //   [jTry.address, WrappedLegal, 1000],
  //   false
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 2),
  //   "this is propetry postiosns 0"
  // );
  // console.log(await WL.balanceOf(user2.address), "User 2 WL balance");
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance after"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx BUY PROPERTY in PROFIT  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the buy 4"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 4th SELL PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // console.log(await WL.balanceOf(user2.address), "user 2 WL balance");
  // await WL.connect(user2).approve(Marketplace.address, 1000);
  // await Marketplace.connect(user2).swap(
  //   [WrappedLegal, jTry.address, 1000],
  //   false
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 3),
  //   "this is propetry postiosns 0"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 4th SELL PROPERTY  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the sell 4"
  // );
  // console.log(
  //   await jTry.balanceOf(user2.address),
  //   "Balance of user2 after the sell 4"
  // );

  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 5th SELL PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // console.log(await WL.balanceOf(user2.address), "user 2 WL balance");
  // await WL.connect(user2).approve(Marketplace.address, 500);
  // await Marketplace.connect(user2).swap(
  //   [WrappedLegal, jTry.address, 500],
  //   false
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 4),
  //   "this is propetry postiosns 0"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 5th SELL PROPERTY  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the sell 5"
  // );
  // console.log(
  //   await jTry.balanceOf(user2.address),
  //   "Balance of user2 after the sell 5"
  // );

  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 6th SELL PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // console.log(await WL.balanceOf(user2.address), "user 2 WL balance");
  // await WL.connect(user2).approve(Marketplace.address, 500);
  // await Marketplace.connect(user2).swap(
  //   [WrappedLegal, jTry.address, 500],
  //   false
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 5),
  //   "this is propetry postiosns 0"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 6th SELL PROPERTY  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the sell 6"
  // );

  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx BUY PROPERTY in PROFIT xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance before"
  // );
  // console.log(user2.address, "User 2 address");
  // await Marketplace.connect(user2).swap(
  //   [jTry.address, WrappedLegal, 1700],
  //   false
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 3),
  //   "this is propetry postions 3"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 4),
  //   "this is propetry postions 4"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 5),
  //   "this is propetry postions 5"
  // );
  // console.log(await WL.balanceOf(user2.address), "User 2 WL balance");
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance after"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx BUY PROPERTY in PROFIT  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the buy 5"
  // );
  // console.log(
  //   await jTry.balanceOf(stakingPoolGauge),
  //   "Staking pool gauge jTRY balance"
  // );
  // // console.log("Swap done");
  // console.log(await WL.balanceOf(user2.address), "after balance ------");
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "ercStakingPool.address after balance ------"
  // );
  // console.log(await jTry.balanceOf(user2.address), "jTry after balance ------");

  // let Symbol = await jTry.symbol();
  // const exp = ((Date.now() / 1000) | 0) + 1200000;
  // const { r, s, v } = await rsvGen({
  //   Contract: jTry,
  //   Symbol,
  //   Owner: accounts[0].address.toLowerCase(),
  //   Spender: Marketplace.address.toLowerCase(),
  //   Value: value.toString(),
  //   Deadline: exp,
  // });

  // await Marketplace.connect(accounts[0]).selfPermit(
  //   jTry.address.toLowerCase(),
  //   value.toString(),
  //   exp,
  //   v,
  //   r,
  //   s
  // );

  // let multicallV2 = await _deploy("MulticallV2");

  // let op1 = await jTry.interface.encodeFunctionData("permit", [
  //   accounts[0].address.toLowerCase(),
  //   Marketplace.address.toLowerCase(),
  //   value.toString(),
  //   exp,
  //   v,
  //   r,
  //   s,
  // ]);

  // let op4 = await Marketplace.interface.encodeFunctionData("selfPermit", [
  //   jTry.address.toLowerCase(),
  //   value.toString(),
  //   exp,
  //   v,
  //   r,
  //   s,
  // ]);

  // console.log({ op1 });

  // let op3 = await Marketplace.interface.encodeFunctionData("swap", [
  //   [jTry.address, WrappedLegal, 1],
  // ]);
  // console.log({ op3 });

  //await Marketplace.connect(accounts[0]).multicall([op4, op3]);

  // await jTry
  //   .connect(accounts[0])
  //   .approve(Marketplace.address, ethers.utils.parseUnits("1000", 18));
  // let { op2 } = await executeMetaTx({
  //   Marketplace,
  //   TrustedForwarder: TrustedForwarder,
  //   Contract: Marketplace,
  //   Signer: accounts[0],
  //   functionName: "swap",
  //   args: [[jTry.address, WrappedLegal, 1]],
  // });

  // await multicallV2.multicall(
  //   [jTry.address, TrustedForwarder.address],
  //   [op1, op2]
  // );

  // await Marketplace.connect(accounts[0]).approveSwap(
  //   jTry.address,
  //   WrappedLegal,
  //   1
  // );

  // metaTx(multicall)

  // await multicallV2.multiDelegaltecall(
  //   [Marketplace.address, TrustedForwarder.address],
  //   [op1, op2]
  // );

  //await Marketplace.connect(accounts[0]).multicall([op3]);

  //await Marketplace.connect(accounts[0]).multicall([op1]);

  /* -------------------------------- MULTICALL ------------------------------- */

  console.log("Done!");
  // let buyFeeBefore = await Marketplace.getBuyFeePercentage();
  // console.log({ buyFeeBefore });
  // await executeMetaTx({
  //   TrustedForwarder: TrustedForwarder,
  //   Contract: Marketplace,
  //   Signer: user1,
  //   functionName: "updateBuyFeePercentage",
  //   args: [2],
  // });
  // let buyFeeAfter = await Marketplace.getBuyFeePercentage();
  // console.log({ buyFeeAfter });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/*
 // await ercStakingPool
  //   .connect(admin)
  //   .setAddressToCTokenPercentage(SwapController.address, 6000); // 60 %

  await ercStakingPool
    .connect(admin)
    .setPassOnPoolPercentage(buybackVaultJTRY.address, 2000);

  // await mainVaultUSDC
  //   .connect(admin)
  //   .setAddressToCTokenPercentage(SwapController.address, 6000); // 50 %

  await mainVaultUSDC
    .connect(admin)
    .setPassOnPoolPercentage(buybackVaultUSDC.address, 2000);

  await jTry.addMinter(admin.address);
  await jTry.mint(admin.address, ethers.utils.parseUnits("70000000", 18));
  await jTry
    .connect(admin)
    .approve(vaultRouterJtry.address, ethers.utils.parseUnits("700000", 18));
  await vaultRouterJtry
    .connect(admin)
    .stake(
      ethers.utils.parseUnits("500", 18),
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      true
    );
  console.log("after 1st stake");
  console.log(
    await xJTRY.balanceOf(buybackVaultJTRY.address),
    "This is babay balance"
  );

  await buybackVaultJTRY.setAllowedMarketPlaceBorrower(
    marketplaceBorrower.address
  );
  // await buybackVaultJTRY.s
  await marketplaceBorrower.setCustomVault(customVaultjTry.address);

  console.log(await jTry.balanceOf(admin.address), "before balance borrow");
  await marketplaceBorrower.borrowTokens(
    ethers.utils.parseUnits("20", 18),
    admin.address,
    2
  );
  console.log(await jTry.balanceOf(admin.address), "after balance borrow");

  return;
  */
