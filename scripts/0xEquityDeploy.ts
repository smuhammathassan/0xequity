import hre from "hardhat";
import { _deploy, _deployWithLibrary } from "../scripts/deployArtifacts";
import { deployTREXFactory } from "./deployTREXFactory";
import { deployClaimIssuer, signer, signerKey } from "./deployClaimIssuer";
import { addUserClaim } from "./addUserClaim";
import { deployMocksTokens } from "./deployMocksTokens";
import { MockTokensConfig } from "./MockTokensConfig";
import { deployRentShare } from "./deployRentShare";
import { deployPriceFeed } from "./deployPriceFeed";
import { deployMockAggregator } from "./deployMockAggregator";
import { setCurrencyToFeed } from "./setCurrencyToFeed";
import { deploySBT } from "./deploySBT";
import { SBTConfig } from "./SBTConfig";
import { deployFinder } from "./deployFinder";
import { finderConfig } from "./finderConfig";
import { deployMarketplace } from "./deployMarketplace";
import { marketplaceConfig } from "./marketplaceConfig";
import { addingMarketplaceClaim } from "./addingMarketplaceClaim";
import { deployRentDistributor } from "./deployRentDistributor";
import { createERC3643LegalToken } from "./createERC3643LegalToken";
import { registerIdentity } from "./registerIdentity";
import { addPropertyToMarketplace } from "./addPropertyToMarketplace";

const network = hre.hardhatArguments.network;

async function main() {
  const accounts = await hre.ethers.getSigners();
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

  const { RShareInstance } = await deployRentShare({ vTRY });
  const { priceFeed } = await deployPriceFeed();
  const { SBT } = await deploySBT();
  await SBTConfig({ SBT });
  const { Maintainer, MarketplaceInterface, burnerRole } = await finderConfig({
    finder,
    RShareInstance,
    priceFeed,
    vTRY,
    SBT,
  });
  const { Marketplace } = await deployMarketplace({ finder });
  await deployRentDistributor({ RShareInstance, vTRY, jTry, burnerRole });

  /* -------------------------------------------------------------------------- */
  /*                                     END                                    */
  /* -------------------------------------------------------------------------- */

  /* ------------------------------ ADDING CLAIMS ----------------------------- */

  const { userIdentity: user1Identity } = await addUserClaim({
    claimIssuerContract,
    user: user1,
    signer,
  });
  const { userIdentity: user2Identity } = await addUserClaim({
    claimIssuerContract,
    user: user2,
    signer,
  });
  const { MarketPlaceIdentity } = await addingMarketplaceClaim({
    Marketplace,
    claimIssuerContract,
    signer,
  });

  /* ---------------------------- Creating ERC3643 ---------------------------- */

  await createERC3643LegalToken({
    claimIssuerContract,
    factory,
    tokenSalt: "XEFR1",
    tokenName: "XEFR1",
    tokenSymbol: "XEFR1",
  });
  console.log("Registering Identiy");
  console.log("user1Identity.address", user1Identity.address);

  const { LegalToken } = await registerIdentity({
    factory,
    user: user1.address,
    userIdentity: user1Identity.address,
    tokenSymbol: "XEFR1",
  });
  console.log("Before crearting erc3643 legal token");

  await registerIdentity({
    factory,
    user: user2.address,
    userIdentity: user2Identity.address,
    tokenSymbol: "XEFR1",
  });
  await registerIdentity({
    factory,
    user: Marketplace.address,
    userIdentity: MarketPlaceIdentity,
    tokenSymbol: "XEFR1",
  });
  console.log("Setting Currency To Feed");

  await setCurrencyToFeed({
    priceFeed,
    currency: jTry,
    mockAggregator: mock1,
  });

  await setCurrencyToFeed({
    priceFeed,
    currency: JEuro,
    mockAggregator: mock2,
  });

  await setCurrencyToFeed({
    priceFeed,
    currency: JUSDC,
    mockAggregator: mock3,
  });

  await MockTokensConfig({ JUSDC, JEuro, jTry });

  await marketplaceConfig({
    RShareInstance,
    Maintainer,
    Marketplace,
    finder,
    MarketplaceInterface,
    SBT,
  });

  await addPropertyToMarketplace({
    LegalToken,
    Marketplace,
    RShareInstance,
    Maintainer,
    jTry,
    mock1,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
