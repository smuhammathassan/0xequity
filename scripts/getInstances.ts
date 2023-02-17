import hre, { ethers } from "hardhat";

export const getInstances = async () => {
  const finder = await ethers.getContractAt(
    "Finder",
    "0xCa3a9D797f4BAcd76E70219100699B29BBe12d8B"
  );
  const claimIssuerContract = await ethers.getContractAt(
    "ClaimIssuer",
    "0x7580608F82A66c21C5f6C0C607ac636634e1E819"
  );
  const factory = await ethers.getContractAt(
    "TREXFactory",
    "0x297B95C660b8024Cfd6fBeCE789Ca710CF16e7e1"
  );
  const RShareInstance = await ethers.getContractAt(
    "RentShare",
    "0xb617702Db553a3A4037bF6D57001C36b16B867dA"
  );
  const SBT = await ethers.getContractAt(
    "SBT",
    "0x692FA1EdF1a978Ab30375a2632c08D0C720771BE"
  );
  const jTry = await ethers.getContractAt(
    "MintableBurnableSyntheticTokenPermit",
    "0x70864D617E342B3FAD9fdff03C289f760C3Fc873"
  );
  const mock1 = await ethers.getContractAt(
    "MockRandomAggregator",
    "0xa2483af7cC6358dc61a51AcE49a025805f28712e"
  );

  const Marketplace = await ethers.getContractAt(
    "Marketplace",
    "0xC8c84769dcfDfAEB2eAaAA13Ae989f39b0d0786c"
  );
  return {
    finder,
    claimIssuerContract,
    factory,
    RShareInstance,
    SBT,
    jTry,
    mock1,
    Marketplace
  };
};

// export default getInstances;
