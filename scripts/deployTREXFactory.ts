import { _deploy, _deployWithLibrary } from "./deployArtifacts";
import hre, { ethers, web3 } from "hardhat";
import { trexFactoryConfig } from "./trexFactoryConfig";

export async function deployTREXFactory() {
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
