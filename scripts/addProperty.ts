import hre, { ethers, web3 } from "hardhat";
import deployIdentityProxye from "./identityProxy";
import { addClaim } from "./addClaim";
import addMarketplaceClaim from "./addMarketplaceClaim";

import "@nomiclabs/hardhat-web3";

const addProperty = async (
  claimIssuerContractAddress: any,
  marktplaceAddress: any,
  TREXFactoryAddress: any,
  TRY: any,
  TRYUSD: any,
  ERC3643TokenName: any,
  ERC3643TokenSymbol: any,
  Salt: any,
  ERC3643TokenToMint: any,
  PerSharePrice: any,
  LegalToWLegalToken: any,
  tokensTOLock: any
) => {
  //-----------------------------*** TO CHANGE ***-------------------------------------
  //const claimIssuerContractAddress = "0xD2BCDaaCe28cae8259FfDA7b0f6463979b9f70A8";
  //const marktplaceAddress = "0x477dfFD58D3f5A101DA8494Ea8A9D4c9c5108fDf";
  //const TREXFactoryAddress = "0x505A89e97a39840f52cc805dD89f4717EF3829FF";
  //const TRY = "0x106cAf0A810bC42C96A4F7d6D522C4aCaE7c4313";
  //const TRYUSD = "0x5F63D4296E26F0B004cB26d2A1771454500C289f";
  //const ERC3643TokenName = "XEFR9"
  //const ERC3643TokenSymbol = "XEFR9"
  //const Salt = "2 + 1 Flat in Miran Istanbul Ese";
  //const ERC3643TokenToMint = "10";
  //const PerSharePrice = "600";
  //const LegalToWLegalToken = 200
  //const tokensTOLock = 10;

  //-----------------------------------------------------------------------------------

  const accounts = await hre.ethers.getSigners();
  const abiCoder = new ethers.utils.AbiCoder();

  const tokeny = accounts[0];
  const claimIssuer = accounts[1];
  const user1 = accounts[2];
  const user2 = accounts[3];
  const agent = accounts[4];
  const claimTopics = [7];
  const signer: any = web3.eth.accounts.create();
  const signerKey = web3.utils.keccak256(
    web3.eth.abi.encodeParameter("address", signer.address)
  );

  //------------------DEPLOYING CLAIMISSUER CONTRACT----------------------
  const claimIssuerContract = await ethers.getContractAt(
    "ClaimIssuer",
    claimIssuerContractAddress
  );

  // const claimIssuerContract = await IssuerIdentity.connect(
  //     claimIssuer
  // ).deploy(claimIssuer.address);
  // await claimIssuerContract.deployed();

  console.log("claim issuer contract is : ", claimIssuerContract.address);
  const addKey = await claimIssuerContract
    .connect(claimIssuer)
    .addKey(signerKey, 3, 1);
  await addKey.wait();

  //---------------------------ADDING USER1 CLAIM---------------------------

  let user1Contract = await deployIdentityProxye(user1);
  await addClaim(user1Contract, user1, signer, claimIssuerContract);
  console.log("User 1 claim added!");

  //-------------------------ADDING MARKETPLACE CLAIM ----------------------
  const Marketplace = await hre.ethers.getContractAt(
    "Marketplace",
    marktplaceAddress
  );
  const MarketPlaceIdentity = await addMarketplaceClaim(
    Marketplace,
    user1,
    signer,
    claimIssuerContract
  );
  console.log("Marketplace Claim Added!");
  //---------------------------DEPLOY T-REX SUIT-----------------------------s

  const Factory = await hre.ethers.getContractAt(
    "TREXFactory",
    TREXFactoryAddress
  );

  const tokenDetails = {
    owner: tokeny.address,
    name: ERC3643TokenName,
    symbol: ERC3643TokenSymbol,
    decimals: 18,
    irs: "0x0000000000000000000000000000000000000000",
    ONCHAINID: "0x0000000000000000000000000000000000000042",
    irAgents: [tokeny.address, agent.address],
    tokenAgents: [tokeny.address, agent.address],
    complianceModules: [],
    complianceSettings: [],
  };

  const claimDetails = {
    claimTopics: [7],
    issuers: [claimIssuerContract.address],
    issuerClaims: [[7]],
  };

  const tx1 = await Factory.deployTREXSuite(Salt, tokenDetails, claimDetails);
  await tx1.wait();
  console.log("Deployed Token");

  //------------------FETCHING TOKEN AND IDENTITY INSTANCE----------------------

  const TokenAddress = await Factory.getToken(Salt);
  const ERC3643 = await hre.ethers.getContractAt("Token", TokenAddress);

  const identityRegistryAddress = await ERC3643.identityRegistry();
  let identityRegistry = await hre.ethers.getContractAt(
    "IdentityRegistry",
    identityRegistryAddress
  );
  console.log("Fetching Done!");

  //------------------REGISTER IDENTITY FOR USER1 ----------------------

  const tx16 = await identityRegistry
    .connect(agent)
    .registerIdentity(user1.address, user1Contract.address, 91);
  await tx16.wait();
  console.log("user1 identity Registered!");
  const tx18 = await identityRegistry
    .connect(agent)
    .registerIdentity(Marketplace.address, MarketPlaceIdentity, 101);
  await tx18.wait();
  console.log("Marketplace identity Registered!");

  //-----------------------------UNPAUSE----------------------------------

  const unpausing = await ERC3643.connect(agent).unpause();
  await unpausing.wait();
  console.log("Unpaused!");

  //----------------------------MINTED--------------------------------

  const minting = await ERC3643.connect(agent).mint(
    user1.address,
    ethers.utils.parseUnits(ERC3643TokenToMint, 18)
  );
  await minting.wait();
  console.log("Minted");

  const balanceOfLegalTokenOfUser1 = await ERC3643.balanceOf(user1.address);
  console.log(
    "Balance of Legal Token of User 1 is : ",
    ethers.utils.parseUnits(`${balanceOfLegalTokenOfUser1}`, 18)
  );

  const tx1222 = await ERC3643.connect(user1).approve(
    marktplaceAddress,
    ethers.utils.parseUnits(`${ERC3643TokenToMint}`, 18)
  );
  console.log("Approved!");
  let a = {
    legalToken: TokenAddress, //address of legal token address
    legalSharesToLock: tokensTOLock, //shares to lock and issue wrapped tokens
    tokensPerLegalShares: LegalToWLegalToken, //raito of legal to wrapped legal 1:100
    totalLegalShares: `${ethers.utils.parseUnits(ERC3643TokenToMint, 18)}`, // total number of legal toens
    propertyDetails: {
      price: `${ethers.utils.parseUnits(PerSharePrice, 18)}`,
      currency: TRY,
      priceFeed: TRYUSD,
    },
  };
  console.log(a);

  //   const addingPropertyGasLimit = await Marketplace.connect(
  //     user1
  //   ).estimateGas.addProperty(
  //     a
  //     //price in dai/usdt/usdc
  //   );
  //   // await addingProperty.wait();
  //   console.log("addingProperty", addingPropertyGasLimit);

  //   const addingProperty = await Marketplace.connect(user1).addProperty(
  //     a, //price in dai/usdt/usdc
  //     { gasLimit: addingPropertyGasLimit }
  //   );
  //   await addingProperty.wait();

  console.log("DONE DEPLOY");
};

export default addProperty;
