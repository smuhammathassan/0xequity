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
import { oclRouterSol } from "../typechain-types/contracts/Router";

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

  const { JUSDC, JEuro, jTry, vTRY } = await deployMocksTokens();
  const { mock1, mock2, mock3 } = await deployMockAggregator();
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

  const [ercStakingPool, stakingPoolGauge, Xeq, cJTRY, cUSDC] =
    await deployXEQPlatform(jTry.address);

  const { SwapController } = await deploySwapController(
    ercStakingPool.address,
    cUSDC.address
  );
  const { OCLRouter } = await deployOCLRouter(
    finder.address,
    SwapController.address
  );

  await ercStakingPool.setAddressToCTokenPercentage(
    SwapController.address,
    5000
  ); // 50 %

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
  await deployRentDistributor({
    finder,
    RShareInstance,
    vTRY,
    jTry,
    burnerRole,
  });

  console.log("Deploying XEQ platform tokens");

  // deploying market place borrower
  const marketplaceBorrower = await deployMarketplaceBorrower(
    ercStakingPool.address
  );

  // Setting up the configs for staking pool and marketplace against marktplace borrower
  await ercStakingPool.setAllowedMarketPlaceBorrower(
    marketplaceBorrower.address
  );
  console.log("Marketplace Borrower set in staking pool");

  // await ercStakingPool.setAddressToCTokenPercentage(cJTRY.address, 5000); // 50%

  await marketplaceBorrower.setAllowedMarketPlace(Marketplace.address);
  console.log("Marketplace set in marketplace Borrower");

  await Marketplace.setMarketplaceBorrower(marketplaceBorrower.address);

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

  // console.log("Testing OCL swap router");
  // await jTry.addMinter(admin.address);
  // await jTry.mint(OCLRouter.address, ethers.utils.parseUnits("1221212121", 18));
  // await JUSDC.addMinter(admin.address);
  // await JUSDC.mint(admin.address, ethers.utils.parseUnits("100000", 18));
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
  let miniting = await jTry.mint(accounts[0].address, value);
  await miniting.wait();

  const WrappedLegal = await Marketplace.LegalToWLegal(LegalToken.address);
  console.log("function call!");

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

  await jTry.mint(
    user2.address,
    ethers.utils.parseUnits("60000000000000000000000", 18)
  );
  await jTry
    .connect(user2)
    .approve(
      Marketplace.address,
      ethers.utils.parseUnits("20000000000000000000", 18)
    );

  ///// TEST SWAP IN OCL ///////////////////////////////////////////////////////
  await jTry.mint(
    OCLRouter.address,
    ethers.utils.parseUnits("1000000000000000000000000000000000000000000")
  );
  // await jTry.transfer(
  //   OCLRouter.address,
  //   ethers.utils.parseUnits("1000000000000000000000000000000000000000000")
  // );
  await JEuro.addMinter(admin.address);
  await JEuro.mint(
    admin.address,
    ethers.utils.parseUnits("1000000000000000000000000000000")
  );
  await JEuro.approve(
    OCLRouter.address,
    ethers.utils.parseUnits("10000000000000000000000000000000")
  );

  // first, staking some tokens in Staking pool
  await jTry.approve(
    ercStakingPool.address,
    ethers.utils.parseUnits("2000000000000000000000000", 18)
  );
  await jTry.mint(
    admin.address,
    ethers.utils.parseUnits("6000000000000000", 18)
  );
  console.log("Before the stake");
  console.log(
    await cJTRY.balanceOf(ercStakingPool.address),
    "This is pools cJTRY balance"
  );
  await ercStakingPool.stake(ethers.utils.parseUnits("100000000000000", 18));
  console.log("After the stake");
  console.log(
    await cJTRY.balanceOf(ercStakingPool.address),
    "This is pools cJTRY balance"
  );

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
  const propertyObj = await priceFeed.getPropertyDetail("WXEFR1");
  console.log(
    "Balance of fee reciever before buy",
    await jTry.balanceOf(accounts[4].address)
  );
  // console.log(propertyObj[2],"property obj array");

  // increasing property to check loss
  // await priceFeed.setPropertyDetails("WXEFR1", [
  //   ethers.utils.parseUnits("1000", 18),
  //   vTRY.address,
  //   propertyObj[2],
  // ]);
  // await priceFeed.setPropertyDetails("WXEFR1",)
  await Xeq.connect(user2).approve(
    Marketplace.address,
    ethers.utils.parseUnits("9999999999", 18)
  );

  // await vTRY.mint(
  //   user2.address,
  //   ethers.utils.parseUnits("999999999999999999999999999", 18)
  // );
  console.log(
    await vTRY.balanceOf(ercStakingPool.address),
    "Pool before balance of vTRY"
  );
  await vTRY
    .connect(user2)
    .approve(
      Marketplace.address,
      ethers.utils.parseUnits("999999999999999999999999999", 18)
    );
  await Marketplace.connect(user2).swap(
    [jTry.address, WrappedLegal, 2000, user2.address],
    false,
    { gasLimit: 210000000000 }
  );
  console.log(
    await vTRY.balanceOf(ercStakingPool.address),
    "Pool after balance of vTRY"
  );
  console.log(
    "Balance of fee reciever after buy",
    await jTry.balanceOf(accounts[4].address)
  );

  console.log(
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxBUY PROPERTY DONE xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  );
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
  // console.log(
  //   await WL.balanceOf(ercStakingPool.address),
  //   "SP legalTokenBalance"
  // );

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
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 1st SELL PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // await WL.connect(user2).approve(
  //   Marketplace.address,
  //   ethers.utils.parseUnits("20000000000000000000000000", 18)
  // );
  // // await Marketplace.connect(user2).swap(
  // //   [WrappedLegal, jTry.address, 2000],
  // //   false
  // // );
  // await Marketplace.connect(user2).swap(
  //   [WrappedLegal, jTry.address, 2000, user2.address],
  //   false,
  //   { gasLimit: 8000000000000 }
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 0),
  //   "this is propetry postiosns 0"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 1st SELL PROPERTY END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
  // //   await WL.balanceOf(ercStakingPool.address),
  // //   "ercStakingPool.address 999999999999999999999999999999999999999999999 before balance ------"
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
  // await Marketplace.connect(user2).swap(
  //   [jTry.address, WrappedLegal, 2000, user2.address],
  //   false,
  //   { gasLimit: 8000000 }
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
  //   await WL.balanceOf(ercStakingPool.address),
  //   "User 2 SP balance after"
  // );
  // console.log(
  //   await vTRY.balanceOf(ercStakingPool.address),
  //   "Pool after balance of vTRY"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 2nd BUY PROPERTY  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );
  // console.log(
  //   await Xeq.balanceOf(accounts[4].address),
  //   "Balance of fee reciever after the buy 2"
  // );
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 2nd SELL PROPERTYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // );
  // console.log(await jTry.balanceOf(ercStakingPool.address), "Pool before 2nd sell jTRY");
  // console.log(await WL.balanceOf(user2.address), "user 2 WL balance");
  // await WL.connect(user2).approve(Marketplace.address, 2000);
  // await Marketplace.connect(user2).swap(
  //   [WrappedLegal, vTRY.address, 2000,user2.address],
  //   false
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToBorrowCursor(WL.address),
  //   "this is browwow cursor"
  // );
  // console.log(
  //   await marketplaceBorrower.propertyToPositions(WL.address, 1),
  //   "this is propetry postiosns 0"
  // );
  // console.log(await jTry.balanceOf(ercStakingPool.address), "Pool after 2nd sell jTRY");
  // console.log(await vTRY.balanceOf(ercStakingPool.address), "Pool after 2nd sell vTRY");
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
  // // increasing property to check loss
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
  // await Marketplace.connect(user2).swap(
  //   [jTry.address, WrappedLegal, 2000],
  //   false
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
  // console.log(
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 3rd BUY PROPERTY  END xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "
  // );

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
// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
