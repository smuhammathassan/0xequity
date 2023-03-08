import hre, { ethers } from "hardhat";

export const getInstances = async () => {
  const finder = await ethers.getContractAt(
    "Finder",
    "0xc9cEE868050A7e92E54796A34FF3bc6e05B00a03"
  );
  const claimIssuerContract = await ethers.getContractAt(
    "ClaimIssuer",
    "0x7aA012d3384DC5A8829bd3E23541D360e6bEFd8c"
  );
  const factory = await ethers.getContractAt(
    "TREXFactory",
    "0x27d86A416b4E098012646280e8d7E798cdc4aB90"
  );
  const RShareInstance = await ethers.getContractAt(
    "RentShare",
    "0x9146F625aE5361C0735e7F3E0e42Dfc45A02C84F"
  );
  const SBT = await ethers.getContractAt(
    "SBT",
    "0x49Ec190CC058345a6c725E06bD9B9e8531B85C03"
  );
  const jTry = await ethers.getContractAt(
    "MintableBurnableSyntheticTokenPermit",
    "0x30BDfFc75bE96C15ddE75e529709F0349038305A"
  );
  const mock1 = await ethers.getContractAt(
    "MockRandomAggregator",
    "0x1281b830931B8819496a61684728746FCE001767"
  );

  const Marketplace = await ethers.getContractAt(
    "Marketplace",
    "0x0BD61cc9b13Ea8EF65A3d3E34f0a5f83BBc28cD5"
  );
  return {
    finder,
    claimIssuerContract,
    factory,
    RShareInstance,
    SBT,
    jTry,
    mock1,
    Marketplace,
  };
};

// export default getInstances;
