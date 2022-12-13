const onchainid = require("@onchain-id/solidity");
const { ethers } = require("hardhat");

const deployIdentityProxye = async (identityIssuer: any) => {
  const Identity = await ethers.getContractFactory("Identity");
  const IdentityImplementation = await ethers.getContractFactory(
    "ImplementationAuthority"
  );
  //deploying identity, deploying identity proxy
  //const IdentityProxy = await ethers.getContractFactory(
  //   onchainid.contracts.IdentityProxy.abi,
  //   onchainid.contracts.IdentityProxy.bytecode,
  //   identityIssuer
  // );

  const IdentityProxy = await ethers.getContractFactory("IdentityProxy1");

  const identityImplementation = await Identity.connect(identityIssuer).deploy(
    identityIssuer.address,
    true
  );
  await identityImplementation.deployed();

  const implementation = await IdentityImplementation.deploy(
    identityImplementation.address
  );
  await implementation.deployed();

  const contractProxy = await IdentityProxy.connect(identityIssuer).deploy(
    implementation.address,
    identityIssuer.address
  );
  await contractProxy.deployed();

  const instance = await ethers.getContractAt(
    "Identity",
    contractProxy.address,
    identityIssuer
  );

  return instance;
};

// eslint-disable-next-line no-undef
export default deployIdentityProxye;
