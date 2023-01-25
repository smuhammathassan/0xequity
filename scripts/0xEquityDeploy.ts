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

async function trexSuite() {
  const accounts = await hre.ethers.getSigners();
  const buyFeeReceiver = accounts[0].address;
  const tokeny = accounts[0];
  const claimIssuer = accounts[1];
  const user1 = accounts[2];
  const user2 = accounts[3];
  const agent = accounts[4];
  const claimTopics = [7];

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

  console.log("claim issuer is : ", claimIssuer.address);
  const addKey = await claimIssuerContract
    .connect(claimIssuer)
    .addKey(signerKey, 3, 1); // ClaimIssuer Contract Enums
  await addKey.wait();

  //---------------------------ADDING USER1 CLAIM---------------------------

  const user1Contract = await deployIdentityProxye(user1);
  const user2Contract = await deployIdentityProxye(user2);
  await addClaim(user1Contract, user1, signer, claimIssuerContract);

  console.log("User 1 claim added!");
  //---------------------------ADDING USER2 CLAIM----------------------------

  
  //addClaim(userIdentityProxy, user, singer, claimIssuerContract)
  await addClaim(user2Contract, user2, signer, claimIssuerContract);
  console.log("User 2 claim added!");

  return {};
}

async function main() {
    await trexSuite()
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
