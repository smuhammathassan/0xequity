import hre, { ethers } from "hardhat";

export const getInstances = async () => {
  const finder = await ethers.getContractAt(
    "Finder",
    "0x26dBFa06ce974466a3bEC0b950c31db224902dc7"
  );
  const claimIssuerContract = await ethers.getContractAt(
    "ClaimIssuer",
    "0x158441cDf79EEE10A7EB3Cb1c61dbB0E65C840D7"
  );
  const factory = await ethers.getContractAt(
    "TREXFactory",
    "0x3b1C14642e3Ab13EaCCAA1322c9c27c274C54cFD"
  );
  const RShareInstance = await ethers.getContractAt(
    "RentShare",
    "0xCa4E3E670DeA5bF92D20446FD2B4f7601f50d482"
  );
  const SBT = await ethers.getContractAt(
    "SBT",
    "0x2515f3364440118DFE5C867Ffc84255AFdDbEf5f"
  );
  const jTry = await ethers.getContractAt(
    "MintableBurnableSyntheticTokenPermit",
    "0xEC01655267Bc72C385F0D2059B60d88B357a949A"
  );
  const mock1 = await ethers.getContractAt(
    "MockRandomAggregator",
    "0xf2053cAAFb3F3aE25F7537D7b28A8F4326903615"
  );

  const Marketplace = await ethers.getContractAt(
    "Marketplace",
    "0x81c9c9E233d980Bb435835E292FDeF07b542B900"
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
