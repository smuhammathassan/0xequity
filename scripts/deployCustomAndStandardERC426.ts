import { _deploy } from "./deployArtifacts";
import { deployCTokens } from "./deployCTokens";
import { deployXEQPlatform } from "./0xXeqPlatformdeploy";
import { deploySwapController } from "./deploySwapController";
import { deployOCLRouter } from "./deployOCLRouter";
import hre, { ethers, web3 } from "hardhat";
import { main } from "./0xEquityDeploy";

export async function deployCustomAndStandardERC4626() {
  const accounts = await hre.ethers.getSigners();

  const mockUSDC = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "USDC",
    "USDC",
    6,
  ]);

  const mockjTry = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "jTRY",
    "jTRY",
    18,
  ]);

  await mockjTry.addMinter(accounts[0].address);
  await mockjTry.mint(
    accounts[0].address,
    ethers.utils.parseUnits("10000000", 18)
  );

  await mockUSDC.addMinter(accounts[0].address);
  await mockUSDC.mint(
    accounts[0].address,
    ethers.utils.parseUnits("10000000", 6)
  );
  const mockXUSDC = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "xUSDC",
    "xUSDC",
    6,
  ]);

  const customVault = await _deploy("CustomVault", [
    accounts[0].address,
    mockUSDC.address,
    mockXUSDC.address,
    "xUSDC",
  ]);

    await mockXUSDC.addMinter(customVault.address);
    await mockXUSDC.addBurner(customVault.address);

  const [cUSDC, cJTRY] = await deployCTokens();

  const mainVault = await _deploy("ERC4626StakingPool", [
    accounts[0].address,
    mockXUSDC.address,
    cUSDC.address,
    "sUSDC",
  ]);

  const { SwapController } = await deploySwapController(
    mainVault.address,
    cJTRY.address,
    cUSDC.address
  );

  await mainVault.setAddressToCTokenPercentage(SwapController.address, 8000);

  console.log("Main vault deployed");

  const [__________, __, ___, ____, ______, voter] = await deployXEQPlatform(
    mockjTry.address
  );

  await voter
    .connect(accounts[3])
    .createGaugeForNonpairPool(mainVault.address, mockXUSDC.address);
  const gauge = await voter.gauges(mainVault.address);
  console.log(gauge, "this is gauge address");
  const vaultRouter = await _deploy("VaultRouter", [
    mockUSDC.address,
    customVault.address,
    mainVault.address,
    mockXUSDC.address,
    gauge,
  ]);

  await mockUSDC.approve(
    vaultRouter.address,
    ethers.utils.parseUnits("100000000", 6)
  );

  console.log(
    await mainVault.balanceOf(accounts[0].address),
    "Balance of sUSDC after vault router before stake"
  );

  await cJTRY.addMinter(mainVault.address);
  await cUSDC.addMinter(mainVault.address);

  console.log(mockXUSDC.address, "this is mockxusdc");
  await vaultRouter.stake(
    ethers.utils.parseUnits("10000000", 6),
    ethers.constants.AddressZero,
    true
  );

  console.log(
    await mainVault.balanceOf(accounts[0].address),
    "Balance of sUSDC after vault router after stake"
  );

  const gaugeInstance = await ethers.getContractAt("Gauge", gauge);
  console.log(
    await mainVault.balanceOf(gauge),
    "This is the data from the gauge"
  );

  await gaugeInstance.withdrawAll();

  console.log(
    await mainVault.balanceOf(gauge),
    "This is the data from the gauge after withdrawal"
  );
  console.log(
    await mainVault.balanceOf(accounts[0].address),
    "This is the data from the gauge after withdrawal of users"
  );

  const mockxJTry = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "xjTRY",
    "xjTRY",
    18,
  ]);
  const customVaultjTry = await _deploy("CustomVault", [
    accounts[0].address,
    mockjTry.address, // stake token
    mockxJTry.address, // xToken
    "xJTRY", // name
  ]);

  await mockxJTry.addMinter(customVaultjTry.address);
  await mockxJTry.addBurner(customVaultjTry.address);

  const mainVaultjTRY = await _deploy("ERC4626StakingPool", [
    accounts[0].address,
    mockxJTry.address, // stake token
    cJTRY.address, // cToken
    "sJTRY", // name
  ]);
  await mainVaultjTRY.setAddressToCTokenPercentage(
    SwapController.address,
    8000
  );

  // creating gauge for jtry vault
  await voter
    .connect(accounts[3])
    .createGaugeForNonpairPool(mainVaultjTRY.address, mockxJTry.address);

  const jTryGauge = await voter.gauges(mainVaultjTRY.address);
  const vaultRouterJtry = await _deploy("VaultRouter", [
    mockjTry.address, // stake token
    customVaultjTry.address, // custom vault
    mainVaultjTRY.address, // main vault
    mockxJTry.address, // xtoken
    jTryGauge,
  ]);
  console.log("Vault router for jTry is also deployed");

  await mockjTry.approve(
    vaultRouterJtry.address,
    ethers.utils.parseUnits("500", 18)
  );
  console.log(
    await mainVaultjTRY.balanceOf(accounts[0].address),
    "balance of sJTRY before"
  );

  await cUSDC.addMinter(mainVaultjTRY.address);
  await cJTRY.addMinter(mainVaultjTRY.address);
  await vaultRouterJtry.stake(
    ethers.utils.parseUnits("500", 18),
    ethers.constants.AddressZero,
    false
  );
  console.log(
    await mainVaultjTRY.balanceOf(accounts[0].address),
    "balance of sJTRY before"
  );

  // deploying OCLR

  const { OCLRouter } = await deployOCLRouter(
    finder, // finder
    SwapController.address
  );

  await mockUSDC.addMinter(accounts[0].address);
  await mockUSDC.mint(
    accounts[0].address,
    ethers.utils.parseUnits("100000000000", 8)
  );

  await mockUSDC.approve(
    OCLRouter.address,
    ethers.utils.parseUnits("100000000000", 8)
  );
  await OCLRouter.swapTokensForExactOut(
    mockUSDC.address,
    mockjTry.address,
    ethers.utils.parseUnits("200", 18),
    accounts[1].address
  );

  //   // first deposit in custom vault
  //   await mockUSDC.approve(
  //     customVault.address,
  //     ethers.utils.parseUnits("100000", 6)
  //   );
  //   console.log(
  //     await mockXUSDC.balanceOf(accounts[0].address),
  //     "Balance of caller before"
  //   );
  //   await customVault.stake(ethers.utils.parseUnits("100000", 6));

  //   console.log(
  //     await mockXUSDC.balanceOf(accounts[0].address),
  //     "Balance of caller after"
  //   );
  //   await mockXUSDC.approve(
  //     mainVault.address,
  //     ethers.utils.parseUnits("100000000000000", 6)
  //   );

  //   console.log(
  //     await mainVault.balanceOf(accounts[0].address),
  //     "Balance of sUSDC before"
  //   );
  //   await mainVault.stake(ethers.utils.parseUnits("100000", 6));

  //   console.log(
  //     await mainVault.balanceOf(accounts[0].address),
  //     "Balance of sUSDC after"
  //   );

  //   await mainVault.approve(
  //     mainVault.address,
  //     ethers.utils.parseUnits("100000", 6)
  //   );

  //   await mainVault.exit();

  //   console.log(
  //     await mainVault.balanceOf(accounts[0].address),
  //     "Balance of sUSDC after exit"
  //   );

  //   await mockXUSDC.approve(
  //     customVault.address,
  //     ethers.utils.parseUnits("10000000", 6)
  //   );

  //   console.log(
  //     await mockUSDC.balanceOf(accounts[0].address),
  //     "Balance of USDC before"
  //   );

  //   await customVault.withdraw(
  //     ethers.utils.parseUnits("500", 6),
  //     accounts[0].address,
  //     accounts[0].address
  //   );

  //   console.log(
  //     await mockUSDC.balanceOf(accounts[0].address),
  //     "Balance of USDC after"
  //   );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployCustomAndStandardERC4626().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
