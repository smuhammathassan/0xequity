import hre, { ethers } from "hardhat";
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
import { signMetaTxRequest } from "./MetaTx";
import { rsvGen } from "./rsvGenrator";

const network = hre.hardhatArguments.network;

async function executeMetaTx({
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
  await forwarder.safeExecute(request, signature);
}

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
  console.log("Before SBT Config");
  await SBTConfig({ SBT });
  console.log("Before finderConfig");
  const { Maintainer, MarketplaceInterface, burnerRole } = await finderConfig({
    finder,
    RShareInstance,
    priceFeed,
    vTRY,
    SBT,
  });
  console.log("Before deployMarketplace");
  const { Marketplace, TrustedForwarder } = await deployMarketplace({ finder });
  console.log("Before deployRentDistributor");
  await deployRentDistributor({ RShareInstance, vTRY, jTry, burnerRole });

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
  });
  console.log("Setting Currency To Fee1");

  await setCurrencyToFeed({
    priceFeed,
    currency: JEuro,
    mockAggregator: mock2,
  });
  console.log("Setting Currency To Fee1");

  await setCurrencyToFeed({
    priceFeed,
    currency: JUSDC,
    mockAggregator: mock3,
  });
  console.log("Before MockTokensConfig");

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
  let value = ethers.utils.parseUnits("1000", 18);
  let miniting = await jTry.mint(accounts[0].address, value);
  await miniting.wait();

  console.log({ LegalToken });
  const WrappedLegal = await Marketplace.LegalToWLegal(LegalToken.address);
  console.log("function call!");
  // let Symbol = await jTry.Symbol();
  // const { r, s, v } = await rsvGen({
  //   Contract: jTry,
  //   Symbol,
  //   Owner: accounts[0].address,
  //   Spender: Marketplace.address,
  //   Deadline: 1674896484,
  // });

  // await jTry.

  await jTry
    .connect(accounts[0])
    .approve(Marketplace.address, ethers.utils.parseUnits("1000", 18));

  await executeMetaTx({
    TrustedForwarder: TrustedForwarder,
    Contract: Marketplace,
    Signer: accounts[0],
    functionName: "swap",
    args: [[jTry.address, WrappedLegal, 1]],
  });
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
