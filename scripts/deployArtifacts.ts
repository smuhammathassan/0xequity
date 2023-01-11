import hre, { ethers } from "hardhat";

const deployArtifacts = async (
  tokeny: any,
  ClaimTopicsRegistry: any,
  TrustedIssuersRegistry: any,
  IdentityRegistryStorage: any,
  IdentityRegistry: any,
  ModularCompliance: any,
  Token: any
) => {
  const claimTopicsRegistry = await ClaimTopicsRegistry.connect(
    tokeny
  ).deploy();
  await claimTopicsRegistry.deployed();
  const trustedIssuersRegistry = await TrustedIssuersRegistry.connect(
    tokeny
  ).deploy();
  await trustedIssuersRegistry.deployed();
  const identityRegistryStorage = await IdentityRegistryStorage.connect(
    tokeny
  ).deploy();
  await identityRegistryStorage.deployed();
  const identityRegistry = await IdentityRegistry.connect(tokeny).deploy();
  await identityRegistry.deployed();
  const modularCompliance = await ModularCompliance.connect(tokeny).deploy();
  await modularCompliance.deployed();
  const token = await Token.connect(tokeny).deploy();
  await token.deployed();

  console.log("claimTopicsRegistry : ", claimTopicsRegistry.address);
  console.log("trustedIssuersRegistry : ", trustedIssuersRegistry.address);
  console.log("identityRegistryStorage : ", identityRegistryStorage.address);
  console.log("identityRegistry : ", identityRegistry.address);
  console.log("modularCompliance : ", modularCompliance.address);
  console.log("token : ", token.address);

  return {
    claimTopicsRegistry,
    trustedIssuersRegistry,
    identityRegistryStorage,
    identityRegistry,
    modularCompliance,
    token
  };
};

export default deployArtifacts;
