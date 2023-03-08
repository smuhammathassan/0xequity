import hre, { ethers, web3 } from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";
import { getInstances } from "./getInstances";
import { addingMarketplaceClaim } from "./addingMarketplaceClaim";
import { createERC3643LegalToken } from "./createERC3643LegalToken";
import { addUserClaim } from "./addUserClaim";
import { registerIdentity } from "./registerIdentity";
import { marketplaceConfig } from "./marketplaceConfig";
import { addPropertyToMarketplace } from "./addPropertyToMarketplace";
const signer: any = web3.eth.accounts.privateKeyToAccount(
  "0x5b8ae7e0eb7b239874717a1887b4eca9f21c74eda2584919455cf78abb93e0a8"
);

export async function reDeployMarketplace() {
  const instances = await getInstances();
  const finder = instances.finder;
  const factory = instances.factory;
  const RShareInstance = instances.RShareInstance;
  const claimIssuerContract = instances.claimIssuerContract;
  const jTry = instances.jTry;
  const mock1 = instances.mock1;
  const SBT = instances.SBT;
  const Marketplace = instances.Marketplace;

  const accounts = await hre.ethers.getSigners();
  const user1 = accounts[2];
  const buyFeeReceiver = accounts[4].address; // team multisig address
  const user2 = accounts[3];
  const buyFeePercentage = 25; // 0.25 percentage  (25 / 10000 * 100) = 0.25%
  const sellFeePercentage = 125; // 1.25 percentage  (125 / 10000 * 100) = 1.25%
  const MarketplaceInterface = ethers.utils.formatBytes32String("Marketplace");
  const Maintainer = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("Maintainer")
  );

  // const MarketplaceLib = await _deploy("MarketplaceLib", []);

  // const MP = await hre.ethers.getContractFactory("Marketplace", {
  //   libraries: {
  //     MarketplaceLib: MarketplaceLib.address,
  //   },
  // });

  // const Marketplace = await _deployWithLibrary(
  //   "Marketplace",
  //   MP,
  //   [[finder.address, buyFeePercentage, sellFeePercentage, buyFeeReceiver]],
  //   user1
  // );
  // console.log("After marketplace deployment");
  // const art = await hre.tenderly.persistArtifacts({
  //   name: "Marketplace",
  //   address: Marketplace.address,
  // });
    // return;
  /* ------------------------------ ADDING CLAIMS ----------------------------- */

  // const { userIdentity: user1Identity } = await addUserClaim({
  //   claimIssuerContract,
  //   user: user1,
  //   signer,
  // });
  // console.log("Before addUserClaim2");

  // const { userIdentity: user2Identity } = await addUserClaim({
  //   claimIssuerContract,
  //   user: user2,
  //   signer,
  // });

  // const { MarketPlaceIdentity } = await addingMarketplaceClaim({
  //   Marketplace,
  //   claimIssuerContract,
  //   signer,
  // });

  // now createing legal token

  const tokenName = "XEFR5";

  await createERC3643LegalToken({
    claimIssuerContract,
    factory,
    tokenSalt: tokenName,
    tokenName: tokenName,
    tokenSymbol: tokenName,
  });

  console.log("Afer leagal token creating");

  // register idenditity

  const { LegalToken } = await registerIdentity({
    factory,
    user: user1.address,
    userIdentity: "0x93c7d737434F3307D3627666C44D88B61Fe1916d",
    tokenSymbol: tokenName,
  });
  console.log("Before registerIdentity2");

  await registerIdentity({
    factory,
    user: user2.address,
    userIdentity: "0x4B8E3a2fb0EEEeB73FEA4FC12CDF4B2EBfa57EA1",
    tokenSymbol: tokenName,
  });
  console.log("Before registerIdentity3");

  await registerIdentity({
    factory,
    user: Marketplace.address,
    userIdentity: "0xac7401A951c3Fc9b2164c4CA052da0767E0045F5",
    tokenSymbol: tokenName,
  });

  // now mp config

  // await marketplaceConfig({
  //   RShareInstance,
  //   Maintainer,
  //   Marketplace,
  //   finder,
  //   MarketplaceInterface,
  //   SBT,
  // });

  // adding property to MP

  await addPropertyToMarketplace({
    LegalToken,
    Marketplace,
    RShareInstance,
    Maintainer,
    jTry,
    mock1,
  });

  return { Marketplace };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
reDeployMarketplace().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
