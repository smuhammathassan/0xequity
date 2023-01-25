const onchainid = require("@onchain-id/solidity");
const { ethers } = require("hardhat");

import {
  _deploy,
  _deployWithLibrary,
} from "../scripts/deployArtifacts";

const deployIdentityProxye = async (identityIssuer: any) => {
  
  const IdentityProxy = await ethers.getContractFactory("IdentityProxy1");

  const identityImplementation = await _deploy("Identity", [identityIssuer.address, true], identityIssuer);

  const implementation = await _deploy("ImplementationAuthority", [identityImplementation.address]);

  const contractProxy = await _deploy("IdentityProxy1", [implementation.address,
    identityIssuer.address], identityIssuer);

  const instance = await ethers.getContractAt(
    "Identity",
    contractProxy.address,
    identityIssuer
  );

  return instance;
};

// eslint-disable-next-line no-undef
export default deployIdentityProxye;
