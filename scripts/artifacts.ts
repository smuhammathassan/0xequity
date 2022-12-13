import hre, { ethers } from "hardhat";

const fetchArtifacts = async () => {
  const ClaimTopicsRegistry = await ethers.getContractFactory(
    "ClaimTopicsRegistry"
  );
  const TrustedIssuersRegistry = await ethers.getContractFactory(
    "TrustedIssuersRegistry"
  );
  const IdentityRegistryStorage = await ethers.getContractFactory(
    "IdentityRegistryStorage"
  );
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const ModularCompliance = await ethers.getContractFactory(
    "ModularCompliance"
  );
  const Token = await ethers.getContractFactory("Token");
  const IssuerIdentity = await ethers.getContractFactory("ClaimIssuer");
  const Implementation = await ethers.getContractFactory(
    "TREXImplementationAuthority"
  );
  const TREXFactory = await ethers.getContractFactory("TREXFactory");
  return {
    ClaimTopicsRegistry,
    TrustedIssuersRegistry,
    IdentityRegistryStorage,
    IdentityRegistry,
    ModularCompliance,
    Token,
    IssuerIdentity,
    Implementation,
    TREXFactory
  };
};

export default fetchArtifacts;
