import hre, { ethers, web3 } from "hardhat";
import {
  deployArtifacts,
  _deploy,
  _deployWithLibrary,
} from "../scripts/deployArtifacts";
import addClaim from "../scripts/addClaim";
import deployIdentityProxye from "../scripts/identityProxy";
import addMarketplaceClaim from "../scripts/addMarketplaceClaim";

import { bytecode as propertyTokenBytecode } from "../artifacts/contracts/propertyToken.sol/PropertyToken.json";
import { bytecode as identityBytecode } from "../artifacts/@onchain-id/solidity/contracts/Identity.sol/Identity.json";
import { bytecode as implementationAuthorityBytecode } from "../artifacts/@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol/ImplementationAuthority.json";
import { bytecode as identityProxyBytecode } from "../artifacts/@onchain-id/solidity/contracts/proxy/IdentityProxy.sol/IdentityProxy.json";
import { any } from "hardhat/internal/core/params/argumentTypes";
const network = hre.hardhatArguments.network;

const signer: any = web3.eth.accounts.create();
const signerKey = web3.utils.keccak256(
  web3.eth.abi.encodeParameter("address", signer.address)
);

console.log(signerKey);

async function trexFactoryConfig({
  implementationSC,
  tokeny,
  token,
  claimTopicsRegistry,
  trustedIssuersRegistry,
  identityRegistryStorage,
  identityRegistry,
  modularCompliance,
}: any) {
  const tx1 = await implementationSC
    .connect(tokeny)
    .setCTRImplementation(claimTopicsRegistry.address);
  console.log(":AFTER CTRY IMPLEMENTATION:");
  await tx1.wait();
  const tx2 = await implementationSC
    .connect(tokeny)
    .setTIRImplementation(trustedIssuersRegistry.address);
  await tx2.wait();
  const tx3 = await implementationSC
    .connect(tokeny)
    .setIRSImplementation(identityRegistryStorage.address);
  await tx3.wait();
  const tx4 = await implementationSC
    .connect(tokeny)
    .setIRImplementation(identityRegistry.address);
  await tx4.wait();
  const tx5 = await implementationSC
    .connect(tokeny)
    .setTokenImplementation(token.address);
  await tx5.wait();
  const tx6 = await implementationSC
    .connect(tokeny)
    .setMCImplementation(modularCompliance.address);
  await tx6.wait();
}

async function TREXFactory() {
  const accounts = await hre.ethers.getSigners();
  const buyFeeReceiver = accounts[0].address;
  const tokeny = accounts[0];
  const claimIssuer = accounts[1];

  /* -------------------------------------------------------------------------- */
  /*                            Deploy TREX Contracts                           */
  /* -------------------------------------------------------------------------- */
  const claimTopicsRegistry = await _deploy("ClaimTopicsRegistry");
  const trustedIssuersRegistry = await _deploy("TrustedIssuersRegistry");
  const identityRegistryStorage = await _deploy("IdentityRegistryStorage");
  const identityRegistry = await _deploy("IdentityRegistry");
  const modularCompliance = await _deploy("ModularCompliance");
  const token = await _deploy("Token");

  const implementationSC = await _deploy(
    "TREXImplementationAuthority",
    [],
    tokeny
  );

  /* -------------------------------------------------------------------------- */
  /*                              TREX ClaimIssuer                              */
  /* -------------------------------------------------------------------------- */
  const claimIssuerContract = await _deploy(
    "ClaimIssuer",
    [claimIssuer.address],
    claimIssuer
  );

  /* ------------------ TREX Factory Pre-Deployments Configs ------------------ */
  await trexFactoryConfig({
    implementationSC,
    tokeny,
    token,
    claimTopicsRegistry,
    trustedIssuersRegistry,
    identityRegistryStorage,
    identityRegistry,
    modularCompliance,
  });
  /* ------------------------- TREX Factory Deployment ------------------------ */
  const factory = await _deploy(
    "TREXFactory",
    [implementationSC.address],
    tokeny
  );

  return { factory };
}

async function deployClaimIssuer() {
  const accounts = await hre.ethers.getSigners();
  const claimIssuer = accounts[1];

  const claimIssuerContract = await _deploy(
    "ClaimIssuer",
    [claimIssuer.address],
    claimIssuer
  );

  console.log("claim issuer is : ", claimIssuer.address);
  const addKey = await claimIssuerContract
    .connect(claimIssuer)
    .addKey(signerKey, 3, 1);
  await addKey.wait();

  return { claimIssuerContract };
}
async function addUserClaim({ claimIssuerContract, user }: any) {
  console.log("user => ", user.address);
  const userIdentity = await deployIdentityProxye(user);
  await addClaim(userIdentity, user, signer, claimIssuerContract);
  return { userIdentity };
}

async function deployMocksTokens() {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  /* -------------------------------------------------------------------------- */
  /*                             Deploying USDC Mock                            */
  /* -------------------------------------------------------------------------- */
  const JUSDC = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "jUSDC",
    "jUSDC",
    6,
  ]);
  console.log("JUSDC : ", JUSDC.address);

  const tx12200 = await JUSDC.connect(tokeny).addMinter(tokeny.address);
  await tx12200.wait();

  /* -------------------------------------------------------------------------- */
  /*                            DEPLOYING JEURO MOCK                            */
  /* -------------------------------------------------------------------------- */

  const JEuro = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "jEUR",
    "jEUR",
    18,
  ]);

  console.log("JEuro : ", JEuro.address);

  const tx122121 = await JEuro.connect(tokeny).addMinter(tokeny.address);
  await tx122121.wait();

  /* -------------------------------------------------------------------------- */
  /*                             DEPLOYING JTRY MOCK                            */
  /* -------------------------------------------------------------------------- */

  const jTry = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "jTRY",
    "jTRY",
    18,
  ]);

  console.log("jTry : ", jTry.address);
  const tx122111 = await jTry.connect(tokeny).addMinter(tokeny.address);
  await tx122111.wait();

  /* -------------------------------------------------------------------------- */
  /*                              DEPLOY VTRY MOCK                              */
  /* -------------------------------------------------------------------------- */

  const vTRY = await _deploy("MintableBurnableSyntheticTokenPermit", [
    "vTRY",
    "vTRY",
    18,
  ]);
  console.log("vTRY : ", vTRY.address);

  return { JUSDC, JEuro, jTry, vTRY };
}

async function MockTokensConfig({ JUSDC, JEuro, jTry }: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const user1 = accounts[2];
  const user2 = accounts[3];

  /* ------------------------------ minting jUSDC ----------------------------- */

  const tx101 = await JUSDC.connect(tokeny).mint(
    user1.address,
    ethers.utils.parseUnits("1000000000000000000000000", 6)
  );
  await tx101.wait();

  const tx102 = await JUSDC.connect(tokeny).mint(
    user2.address,
    ethers.utils.parseUnits("1000000000000000000000000", 6)
  );
  await tx102.wait();

  /* ------------------------------ minting jEuro ----------------------------- */

  const tx10 = await JEuro.connect(tokeny).mint(
    user2.address,
    ethers.utils.parseUnits("1000000000", 18)
  );
  await tx10.wait();

  /* ------------------------------ minting jTry ------------------------------ */

  const tx11110 = await JEuro.connect(tokeny).mint(
    "0xF1f6Cc709c961069D33F797575eA966c94C1357B",
    ethers.utils.parseUnits("1000000000", 18)
  );
  await tx11110.wait();

  const tx11 = await jTry
    .connect(tokeny)
    .mint(user2.address, ethers.utils.parseUnits("1000000000", 18));
  await tx11.wait();
  const tx11000 = await jTry
    .connect(tokeny)
    .mint(
      "0xF1f6Cc709c961069D33F797575eA966c94C1357B",
      ethers.utils.parseUnits("1000000000", 18)
    );
  await tx11000.wait();
}

async function deployRentShare({ vTRY }: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  const RSLib = await _deploy("RentShareLib");

  const RShare = await hre.ethers.getContractFactory("RentShare", {
    libraries: {
      RentShareLib: RSLib.address,
    },
  });

  const RShareInstance = await _deployWithLibrary("RentShare", RShare, [
    vTRY.address,
  ]);

  const tx122921 = await vTRY.connect(tokeny).addMinter(RShareInstance.address);
  await tx122921.wait();

  console.log("RENT SHARE : ", RShareInstance.address);

  return { RShareInstance };
}

async function deployPriceFeed() {
  const PriceFeedLib = await _deploy("PriceFeedLib");

  const PF = await hre.ethers.getContractFactory("PriceFeed", {
    libraries: {
      PriceFeedLib: PriceFeedLib.address,
    },
  });
  const priceFeed = await _deployWithLibrary("PriceFeed", PF, []);

  console.log("PRICE FEED ADDRESS : ", priceFeed.address);
  return { priceFeed };
}

async function deployMockAggregator() {
  const mock1 = await _deploy("MockRandomAggregator", [
    ethers.utils.parseUnits("0.05332091", 8),
    1,
  ]);
  console.log("mock1 Address : ", mock1.address);

  const mock2 = await _deploy("MockRandomAggregator", [
    ethers.utils.parseUnits("1.07194", 8),
    1,
  ]);

  console.log("mock2 Address : ", mock2.address);

  const mock3 = await _deploy("MockRandomAggregator", [
    ethers.utils.parseUnits("0.99997503", 8),
    1,
  ]);

  console.log("mock3 Address : ", mock3.address);
  return { mock1, mock2, mock3 };
}

async function setCurrencyToFeed({
  priceFeed,
  jTry,
  JEuro,
  JUSDC,
  mock1,
  mock2,
  mock3,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  await priceFeed
    .connect(tokeny)
    .setCurrencyToFeed("TRYUSD", jTry.address, mock1.address);
  await priceFeed
    .connect(tokeny)
    .setCurrencyToFeed("EURUSD", JEuro.address, mock2.address);
  await priceFeed
    .connect(tokeny)
    .setCurrencyToFeed("USDCUSD", JUSDC.address, mock3.address);
}

async function deploySBT() {
  const SBTLib = await _deploy("SBTLib", []);

  const sbt = await hre.ethers.getContractFactory("SBT", {
    libraries: {
      SBTLib: SBTLib.address,
    },
  });
  const SBT = await _deployWithLibrary("SBT", sbt);
  return { SBT };
}

async function SBTConfig({ SBT }: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  let txAddCommunity1 = await SBT.connect(tokeny).addCommunity("0xEquity", 1);
  await txAddCommunity1.wait();

  console.log("Community Added!");

  let approvedCommunity1 = await SBT.connect(tokeny).addApprovedCommunity(
    "WXEFR1",
    "0xEquity"
  );
  await approvedCommunity1.wait();

  console.log("Community Approved!");
}

async function deployFinder() {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const finder = await _deploy("Finder", [[tokeny.address, tokeny.address]]);
  console.log("Finder => ", finder.address);
  return { finder };
}

async function finderConfig({
  finder,
  RShareInstance,
  priceFeed,
  vTRY,
  SBT,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  const RentshareInterface = ethers.utils.formatBytes32String("RentShare");
  const PriceFeedInterface = ethers.utils.formatBytes32String("PriceFeed");
  const PropertyTokenInterface =
    ethers.utils.formatBytes32String("PropertyToken");
  const IndentityInterface = ethers.utils.formatBytes32String("Identity");
  const ImplementationAuthorityInterface = ethers.utils.formatBytes32String(
    "ImplementationAuthority"
  );
  const IdentityProxyInterface =
    ethers.utils.formatBytes32String("IdentityProxy");
  const Maintainer = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("Maintainer")
  );
  const MarketplaceInterface = ethers.utils.formatBytes32String("Marketplace");
  const burnerRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Burner"));
  const RewardTokenInterface = ethers.utils.formatBytes32String("RewardToken");
  const SBTInterface = ethers.utils.formatBytes32String("SBT");

  let tx0000011 = await finder
    .connect(tokeny)
    .changeImplementationAddress(RentshareInterface, RShareInstance.address);
  await tx0000011.wait();
  let tx0000012 = await finder
    .connect(tokeny)
    .changeImplementationAddress(PriceFeedInterface, priceFeed.address);
  await tx0000012.wait();
  let tx0000013 = await finder
    .connect(tokeny)
    .changeImplementationBytecode(
      PropertyTokenInterface,
      propertyTokenBytecode
    );
  await tx0000013.wait();
  let tx0000014 = await finder
    .connect(tokeny)
    .changeImplementationBytecode(IndentityInterface, identityBytecode);
  await tx0000014.wait();
  let tx0000015 = await finder
    .connect(tokeny)
    .changeImplementationBytecode(
      ImplementationAuthorityInterface,
      implementationAuthorityBytecode
    );
  await tx0000015.wait();
  let tx0000016 = await finder
    .connect(tokeny)
    .changeImplementationBytecode(
      IdentityProxyInterface,
      identityProxyBytecode
    );
  await tx0000016.wait();
  let tx0000017 = await finder
    .connect(tokeny)
    .changeImplementationAddress(RewardTokenInterface, vTRY.address);
  await tx0000017.wait();
  let tx0000020 = await finder
    .connect(tokeny)
    .changeImplementationAddress(SBTInterface, SBT.address);
  await tx0000020.wait();
  console.log("Finder Configuration added!");

  return { Maintainer, MarketplaceInterface, burnerRole };
}

async function deployMarketplace({ finder }: any) {
  const accounts = await hre.ethers.getSigners();
  const buyFeeReceiver = accounts[0].address;
  const user1 = accounts[2];
  const buyFeePercentage = 25; // 5 percentage  (500 / 10000 * 100) = 5%

  const MarketplaceLib = await _deploy("MarketplaceLib", []);

  const MP = await hre.ethers.getContractFactory("Marketplace", {
    libraries: {
      MarketplaceLib: MarketplaceLib.address,
    },
  });
  console.log("User1 address is :", user1.address);

  const Marketplace = await _deployWithLibrary(
    "Marketplace",
    MP,
    [[finder.address, buyFeePercentage, buyFeeReceiver]],
    user1
  );

  return { Marketplace };
}

async function marketplaceConfig({
  RShareInstance,
  Maintainer,
  Marketplace,
  finder,
  MarketplaceInterface,
  SBT,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  let tx000 = await RShareInstance.connect(tokeny).grantRole(
    Maintainer,
    Marketplace.address
  );
  await tx000.wait();
  let tx0000019 = await finder
    .connect(tokeny)
    .changeImplementationAddress(MarketplaceInterface, Marketplace.address);
  await tx0000019.wait();
  let MarketplaceSBT = await SBT.connect(tokeny).mint(
    Marketplace.address,
    "0xEquity"
  );
  await MarketplaceSBT.wait();
}

async function addingMarketplaceClaim({
  Marketplace,
  claimIssuerContract,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const user1 = accounts[2];
  console.log("Marketplace => ", Marketplace.address);
  console.log("ClaimIssuerContract => ", claimIssuerContract.address);
  const MarketPlaceIdentity = await addMarketplaceClaim(
    Marketplace,
    user1,
    signer,
    claimIssuerContract
  );

  return { MarketPlaceIdentity };
}

async function deployRentDistributor({
  RShareInstance,
  vTRY,
  jTry,
  burnerRole,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];

  const rentDistributor = await _deploy("RentDistributor", [
    vTRY.address,
    jTry.address,
  ]);

  console.log("RentDistributor => ", rentDistributor.address);

  const tx22222 = await RShareInstance.connect(tokeny).grantRole(
    burnerRole,
    rentDistributor.address
  );
  await tx22222.wait();

  return { rentDistributor };
}

async function createERC3643LegalToken({
  claimIssuerContract,
  factory,
  tokenSalt,
  tokenName,
  tokenSymbol,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const agent = accounts[4];

  const tokenDetails = {
    owner: tokeny.address,
    name: tokenName,
    symbol: tokenSymbol,
    decimals: 18,
    irs: "0x0000000000000000000000000000000000000000",
    ONCHAINID: "0x0000000000000000000000000000000000000042",
    irAgents: [tokeny.address, agent.address],
    tokenAgents: [tokeny.address, agent.address],
    complianceModules: [],
    complianceSettings: [],
  };
  //TODO: WHAT 7 IS DOING?
  const claimDetails = {
    claimTopics: [7],
    issuers: [claimIssuerContract.address],
    issuerClaims: [[7]],
  };

  const tx15 = await factory
    .connect(tokeny)
    .deployTREXSuite(tokenSalt, tokenDetails, claimDetails);
  await tx15.wait();
  console.log("TREX SUIT DEPLOYED!");
}

async function registerIdentity({
  factory,
  user,
  userIdentity,
  tokenSymbol,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const agent = accounts[4];

  const tokenAddress = await factory.connect(tokeny).getToken(tokenSymbol);
  console.log("tokenAddress", tokenAddress);

  const LegalToken = await hre.ethers.getContractAt("Token", tokenAddress);
  const identityRegistryAddress = await LegalToken.connect(
    tokeny
  ).identityRegistry();

  console.log("identityRegistryAddress", identityRegistryAddress);

  const identityRegistry = await hre.ethers.getContractAt(
    "IdentityRegistry",
    identityRegistryAddress
  );

  const tx16 = await identityRegistry
    .connect(agent)
    .registerIdentity(user, userIdentity, 91);
  await tx16.wait();
  console.log("Identity Registerd!");

  return { LegalToken };
}

async function addPropertyToMarketplace({
  LegalToken,
  Marketplace,
  RShareInstance,
  Maintainer,
  jTry,
  mock1,
}: any) {
  const accounts = await hre.ethers.getSigners();
  const tokeny = accounts[0];
  const user1 = accounts[2];
  const agent = accounts[4];

  const tx1199 = await LegalToken.connect(agent).unpause();
  await tx1199.wait();
  const tx1221 = await LegalToken.connect(agent).mint(
    user1.address,
    ethers.utils.parseUnits("100", 18)
  );
  await tx1221.wait();
  console.log("Minting Done!");
  console.log("Marketplace Address => ", Marketplace.address);
  let hasMaintainerROle = await RShareInstance.connect(tokeny).hasRole(
    Maintainer,
    Marketplace.address
  );
  console.log("hasMaintainerROle? : ", hasMaintainerROle);
  console.log("RShareInstance => ", RShareInstance.address);

  const tx1222 = await LegalToken.connect(user1).approve(
    Marketplace.address,
    ethers.utils.parseUnits("200", 18)
  );
  await tx1222.wait();
  const tx111 = await Marketplace.connect(user1).addProperty(
    [
      LegalToken.address, //address of legal token address
      100, //shares to lock and issue wrapped tokens
      20, //raito of legal to wrapped legal 1:100
      ethers.utils.parseUnits("100", 18), // total number of legal toens
      [ethers.utils.parseUnits("2", 18), jTry.address, mock1.address],
    ] //price in dai/usdt/usdc, *jTry* currency in property details
    // ethers.utils.parseUnits("100", 18) //reward per token.
  );
  await tx111.wait();
  console.log("Property Added");
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
  const { factory } = await TREXFactory();
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
  });
  const { userIdentity: user2Identity } = await addUserClaim({
    claimIssuerContract,
    user: user2,
  });
  const { MarketPlaceIdentity } = await addingMarketplaceClaim({
    Marketplace,
    claimIssuerContract,
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
    jTry,
    JEuro,
    JUSDC,
    mock1,
    mock2,
    mock3,
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
